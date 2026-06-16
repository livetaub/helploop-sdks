import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useConversations } from '../hooks/useConversations';
import { SupportHub } from '../SupportHub';
import { createTheme } from '../theme/theme';
import { timeAgo } from '../utils/dateUtils';
import { LoadingIndicator } from '../components/LoadingIndicator';
import type { Conversation, SupportHubTheme } from '../models/types';

interface ConversationListScreenProps {
  /** React Navigation navigation object (optional) */
  navigation?: any;
  /** Callback when a conversation is selected */
  onSelectConversation: (id: string) => void;
  /** Callback for the back button when not using React Navigation */
  onBack?: () => void;
}

/**
 * Displays a list of the current user's support conversations.
 * Features pull-to-refresh, unread badges, and a new conversation button.
 */
export const ConversationListScreen: React.FC<ConversationListScreenProps> = ({
  navigation,
  onSelectConversation,
  onBack,
}) => {
  const { conversations, loading, refresh, createConversation } = useConversations();

  // Build theme from settings (synchronous fallback if settings aren't loaded yet)
  const theme: SupportHubTheme = (() => {
    try {
      return createTheme();
    } catch {
      return createTheme();
    }
  })();

  // ─── Navigation ─────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [onBack, navigation]);

  const handleNewConversation = useCallback(async () => {
    // Navigate to messaging screen without a conversationId (welcome state)
    onSelectConversation('');
  }, [onSelectConversation]);

  // ─── Avatar ─────────────────────────────────────────────────────────

  const getAvatarLetter = (conversation: Conversation): string => {
    if (conversation.subject) {
      return conversation.subject.charAt(0).toUpperCase();
    }
    return 'S';
  };

  const getAvatarColor = (conversation: Conversation): string => {
    // Generate a consistent color from the conversation ID
    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
    let hash = 0;
    for (let i = 0; i < conversation.id.length; i++) {
      hash = conversation.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ─── Render Item ────────────────────────────────────────────────────

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const displayTitle = item.subject || 'Support Conversation';
    const displayPreview = item.lastMessagePreview || 'No messages yet';
    const displayTime = item.lastMessageAt ? timeAgo(item.lastMessageAt) : timeAgo(item.createdAt);
    const hasUnread = item.unreadUserCount > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onSelectConversation(item.id)}
        activeOpacity={0.6}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item) }]}>
          <Text style={styles.avatarText}>{getAvatarLetter(item)}</Text>
        </View>

        {/* Content column */}
        <View style={styles.contentColumn}>
          <Text
            style={[
              styles.conversationTitle,
              { color: theme.textColor },
              hasUnread ? styles.unreadTitle : null,
            ]}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <Text
            style={[
              styles.previewText,
              { color: theme.mutedTextColor },
              hasUnread ? styles.unreadPreview : null,
            ]}
            numberOfLines={1}
          >
            {displayPreview}
          </Text>
        </View>

        {/* Time & unread badge column */}
        <View style={styles.metaColumn}>
          <Text style={[styles.timeText, { color: theme.mutedTextColor }]}>{displayTime}</Text>
          {hasUnread ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadUserCount > 99 ? '99+' : item.unreadUserCount}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: theme.mutedTextColor + '1A' }]} />
  );

  // ─── Loading State ──────────────────────────────────────────────────

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
        <View style={[styles.header, { backgroundColor: theme.surfaceColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Text style={[styles.backIcon, { color: theme.textColor }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textColor }]}>Conversations</Text>
          <View style={styles.headerSpacer} />
        </View>
        <LoadingIndicator theme={theme} message="Loading conversations..." />
      </SafeAreaView>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: theme.primaryColor + '20' }]}>
        <Text style={styles.emptyIcon}>💬</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textColor }]}>No conversations yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.mutedTextColor }]}>
        Start a conversation with our support team
      </Text>
      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: theme.primaryColor }]}
        onPress={handleNewConversation}
        activeOpacity={0.8}
      >
        <Text style={styles.startButtonText}>Start a conversation</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Main Render ────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surfaceColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backIcon, { color: theme.textColor }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textColor }]}>Conversations</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={handleNewConversation}
          activeOpacity={0.7}
        >
          <Text style={[styles.newButtonText, { color: theme.primaryColor }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Conversation list */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={theme.primaryColor}
            colors={[theme.primaryColor]}
          />
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 40,
  },
  newButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  newButtonText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  // ── Conversation Item ─────────────────────────────────────────────────
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  contentColumn: {
    flex: 1,
    marginRight: 10,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadPreview: {
    fontWeight: '500',
  },
  metaColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    marginBottom: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 78,
  },
  // ── Empty State ───────────────────────────────────────────────────────
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
