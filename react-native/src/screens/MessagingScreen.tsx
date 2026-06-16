import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { SupportHub } from '../SupportHub';
import type {
  Message,
  Conversation,
  ProjectSettings,
  SupportHubTheme,
} from '../models/types';
import { createTheme } from '../theme/theme';
import { isSameDay } from '../utils/dateUtils';
import { MessageBubble } from '../components/MessageBubble';
import { DateSeparator } from '../components/DateSeparator';
import { ReplyInput } from '../components/ReplyInput';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { AttachmentPreview } from '../components/AttachmentPreview';

interface AttachedImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

interface MessagingScreenProps {
  /** React Navigation navigation object (optional) */
  navigation?: any;
  /** Specific conversation ID to open (optional — if omitted, opens the most recent or welcome state) */
  conversationId?: string;
  /** Callback for the back button when not using React Navigation */
  onBack?: () => void;
}

/**
 * The main chat screen for SupportHub.
 * Supports both React Navigation and standalone usage.
 *
 * Features:
 * - Welcome state for new users (no existing conversation)
 * - Inverted FlatList for chat-style scrolling
 * - Optimistic message sending
 * - Image attachment via react-native-image-picker
 * - 30s polling for new messages
 * - Date separators between message groups
 * - Read indicators and timestamps
 */
export const MessagingScreen: React.FC<MessagingScreenProps> = ({
  navigation,
  conversationId: initialConversationId,
  onBack,
}) => {
  // ─── State ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [theme, setTheme] = useState<SupportHubTheme>(createTheme());
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const pageRef = useRef<number>(1);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationIdRef = useRef<string | null>(initialConversationId || null);
  const mountedRef = useRef<boolean>(true);
  const flatListRef = useRef<FlatList>(null);

  // ─── Initialization ─────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        // 1. Fetch settings and build theme
        const projectSettings = await SupportHub.getSettings();
        if (!mountedRef.current) return;
        setSettings(projectSettings);
        setTheme(createTheme(projectSettings));

        // 2. Resolve which conversation to show
        const api = SupportHub.getInstance().getApiClient();
        const user = SupportHub.getCurrentUser();

        if (initialConversationId) {
          // Specific conversation requested
          const conv = await api.getConversation(initialConversationId);
          if (!mountedRef.current) return;
          setConversation(conv);
          conversationIdRef.current = conv.id;
        } else if (user) {
          // Pick the most recent conversation (or stay in welcome state)
          const conversations = await api.listConversations(user.externalId);
          if (!mountedRef.current) return;

          if (conversations.length > 0) {
            // Sort by most recent
            conversations.sort((a, b) => {
              const dateA = a.lastMessageAt || a.createdAt;
              const dateB = b.lastMessageAt || b.createdAt;
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            setConversation(conversations[0]);
            conversationIdRef.current = conversations[0].id;
          }
        }

        // 3. Fetch messages if we have a conversation
        if (conversationIdRef.current) {
          await fetchMessages(conversationIdRef.current);
        }
      } catch {
        // Non-fatal initialization error
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [initialConversationId]);

  // ─── Message Fetching ───────────────────────────────────────────────

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const api = SupportHub.getInstance().getApiClient();
      const result = await api.listMessages(convId, 1, 50);

      if (!mountedRef.current) return;

      const sorted = result.messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      setMessages(sorted);
      setHasMore(result.hasMore);
      pageRef.current = 1;

      // Mark messages as read
      const user = SupportHub.getCurrentUser();
      if (user) {
        api.markAsRead(convId, user.externalId).catch(() => {});
      }

      // Start polling
      startPolling(convId);
    } catch {
      // Silently handle message fetch errors
    }
  }, []);

  // ─── Load More (older messages) ─────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!conversationIdRef.current || !hasMore) return;

    try {
      const nextPage = pageRef.current + 1;
      const api = SupportHub.getInstance().getApiClient();
      const result = await api.listMessages(conversationIdRef.current, nextPage, 50);

      if (!mountedRef.current) return;

      const sorted = result.messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = sorted.filter((m) => !existingIds.has(m.id));
        return [...newMsgs, ...prev];
      });

      setHasMore(result.hasMore);
      pageRef.current = nextPage;
    } catch {
      // Silently handle load-more errors
    }
  }, [hasMore]);

  // ─── Polling ────────────────────────────────────────────────────────

  const startPolling = useCallback((convId: string) => {
    stopPolling();

    const interval = (() => {
      try {
        return SupportHub.getInstance().getPollIntervalMs();
      } catch {
        return 30000;
      }
    })();

    pollTimerRef.current = setInterval(async () => {
      if (!mountedRef.current) return;

      try {
        const api = SupportHub.getInstance().getApiClient();
        const result = await api.listMessages(convId, 1, 50);

        if (!mountedRef.current) return;

        const sorted = result.messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

        setMessages((prev) => {
          const optimistic = prev.filter((m) => m.id.startsWith('optimistic-'));
          const serverIds = new Set(sorted.map((m) => m.id));
          const remainingOptimistic = optimistic.filter((m) => !serverIds.has(m.id));
          return [...sorted, ...remainingOptimistic];
        });

        setHasMore(result.hasMore);
      } catch {
        // Silently ignore polling errors
      }
    }, interval);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ─── Send Message ───────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    const user = SupportHub.getCurrentUser();
    if (!user) return;

    setSending(true);

    try {
      const api = SupportHub.getInstance().getApiClient();

      // If no conversation exists yet, create one (welcome state → first message)
      let convId = conversationIdRef.current;
      if (!convId) {
        const newConv = await api.createConversation(user.externalId, text);
        if (!mountedRef.current) return;

        setConversation(newConv);
        conversationIdRef.current = newConv.id;
        convId = newConv.id;

        // Fetch the initial messages (the server-created message)
        await fetchMessages(convId);
        setSending(false);
        return;
      }

      // Optimistic message
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMsg: Message = {
        id: optimisticId,
        conversationId: convId,
        senderType: 'end_user',
        senderId: user.externalId,
        content: text,
        contentType: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      // Send via API
      const sentMessage = await api.sendMessage(convId, user.externalId, text, 'text');

      if (!mountedRef.current) return;

      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? sentMessage : m)),
      );
    } catch {
      // On error, could remove optimistic message — but for UX we keep it
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  }, [fetchMessages]);

  // ─── Image Attachment ───────────────────────────────────────────────

  const handleAttach = useCallback(async () => {
    try {
      // Dynamic import to handle missing peer dependency gracefully
      const ImagePicker = require('react-native-image-picker');
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      if (asset.uri) {
        setAttachedImage({
          uri: asset.uri,
          fileName: asset.fileName || 'image.jpg',
          mimeType: asset.type || 'image/jpeg',
        });
      }
    } catch {
      // react-native-image-picker not available or permission denied
      console.warn('[SupportHub] Image picker not available. Install react-native-image-picker.');
    }
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setAttachedImage(null);
  }, []);

  // ─── Send with image attachment ─────────────────────────────────────

  const handleSendWithAttachment = useCallback(async (text: string) => {
    if (attachedImage) {
      const user = SupportHub.getCurrentUser();
      if (!user) return;

      setSending(true);

      try {
        const api = SupportHub.getInstance().getApiClient();

        // Ensure a conversation exists
        let convId = conversationIdRef.current;
        if (!convId) {
          const newConv = await api.createConversation(user.externalId, text || 'Image');
          if (!mountedRef.current) return;
          setConversation(newConv);
          conversationIdRef.current = newConv.id;
          convId = newConv.id;
        }

        // Upload the image
        const attachment = await api.uploadAttachment(
          attachedImage.uri,
          attachedImage.fileName,
          attachedImage.mimeType,
        );

        // Send the image message
        await api.sendMessage(convId, user.externalId, attachment.url, 'image');

        // Send text message too if provided
        if (text.trim()) {
          await api.sendMessage(convId, user.externalId, text, 'text');
        }

        setAttachedImage(null);

        // Refresh messages
        await fetchMessages(convId);
      } catch {
        // Handle upload error silently
      } finally {
        if (mountedRef.current) {
          setSending(false);
        }
      }
    } else {
      await handleSend(text);
    }
  }, [attachedImage, handleSend, fetchMessages]);

  // ─── Navigation ─────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [onBack, navigation]);

  // ─── Render Helpers ─────────────────────────────────────────────────

  /** Determine whether two adjacent messages should show a date separator. */
  const shouldShowDateSeparator = (currentMsg: Message, prevMsg?: Message): boolean => {
    if (!prevMsg) return true;
    return !isSameDay(currentMsg.createdAt, prevMsg.createdAt);
  };

  /** Determine if a message is the last in a group from the same sender. */
  const isLastInGroup = (index: number, data: Message[]): boolean => {
    // In the reversed array (for inverted FlatList), index 0 is most recent
    // We need to check against the original messages array
    const reversedIndex = data.length - 1 - index;
    const nextInOriginal = reversedIndex + 1 < data.length ? data[reversedIndex + 1] : undefined;
    if (!nextInOriginal) return true;
    return nextInOriginal.senderType !== data[reversedIndex].senderType;
  };

  const showReadIndicators = settings?.showReadIndicators ?? true;
  const title = settings?.widgetTitle || 'Support';
  const welcomeMessage = settings?.welcomeMessage || 'Hi! How can we help you today?';

  // Reverse messages for inverted FlatList (most recent at bottom)
  const reversedMessages = [...messages].reverse();

  // ─── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
        <LoadingIndicator theme={theme} message="Loading conversation..." />
      </SafeAreaView>
    );
  }

  // ─── Welcome State (no conversation) ───────────────────────────────

  if (!conversation && !conversationIdRef.current) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.surfaceColor }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Text style={[styles.backIcon, { color: theme.textColor }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textColor }]}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Welcome content */}
          <View style={styles.welcomeContainer}>
            <View style={[styles.welcomeIconCircle, { backgroundColor: theme.primaryColor + '20' }]}>
              <Text style={styles.welcomeIcon}>💬</Text>
            </View>
            <Text style={[styles.welcomeTitle, { color: theme.textColor }]}>{title}</Text>
            <Text style={[styles.welcomeText, { color: theme.mutedTextColor }]}>
              {welcomeMessage}
            </Text>
          </View>

          {/* Reply input */}
          <ReplyInput
            onSend={handleSendWithAttachment}
            onAttach={handleAttach}
            disabled={sending}
            theme={theme}
            attachedImage={attachedImage ? { uri: attachedImage.uri, fileName: attachedImage.fileName } : null}
            onRemoveAttachment={handleRemoveAttachment}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Chat State ─────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surfaceColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Text style={[styles.backIcon, { color: theme.textColor }]}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.textColor }]}>{title}</Text>
            {conversation?.status === 'resolved' || conversation?.status === 'closed' ? (
              <Text style={[styles.headerSubtitle, { color: theme.mutedTextColor }]}>
                {conversation.status === 'resolved' ? 'Resolved' : 'Closed'}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            // Since FlatList is inverted, index 0 = most recent message
            // Find the original index in the non-reversed array
            const originalIndex = messages.length - 1 - index;
            const prevMessage = originalIndex > 0 ? messages[originalIndex - 1] : undefined;
            const nextMessage = originalIndex < messages.length - 1 ? messages[originalIndex + 1] : undefined;

            const showDate = shouldShowDateSeparator(item, prevMessage);
            const lastInGroup = !nextMessage || nextMessage.senderType !== item.senderType;

            return (
              <View>
                {showDate ? <DateSeparator date={item.createdAt} theme={theme} /> : null}
                <MessageBubble
                  message={item}
                  theme={theme}
                  showReadIndicators={showReadIndicators}
                  isLastInGroup={lastInGroup}
                  onImagePress={(url) => setFullscreenImage(url)}
                />
              </View>
            );
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Fullscreen image viewer */}
        {fullscreenImage ? (
          <AttachmentPreview
            url={fullscreenImage}
            theme={theme}
            onPress={() => setFullscreenImage(null)}
          />
        ) : null}

        {/* Reply input */}
        <ReplyInput
          onSend={handleSendWithAttachment}
          onAttach={handleAttach}
          disabled={sending || conversation?.status === 'closed'}
          theme={theme}
          attachedImage={attachedImage ? { uri: attachedImage.uri, fileName: attachedImage.fileName } : null}
          onRemoveAttachment={handleRemoveAttachment}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // ── Header ────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  // ── Messages ──────────────────────────────────────────────────────────
  messagesList: {
    paddingVertical: 8,
  },
  // ── Welcome State ─────────────────────────────────────────────────────
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  welcomeIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeIcon: {
    fontSize: 32,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  welcomeText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
});
