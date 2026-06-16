import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Message, SupportHubTheme } from '../models/types';
import { formatMessageTime } from '../utils/dateUtils';

interface MessageBubbleProps {
  /** The message object to render */
  message: Message;
  /** Theme object for styling */
  theme: SupportHubTheme;
  /** Whether to show read indicators (✓/✓✓) on user messages */
  showReadIndicators: boolean;
  /** Whether this is the last message in a group from the same sender */
  isLastInGroup?: boolean;
  /** Callback when an image attachment is pressed */
  onImagePress?: (url: string) => void;
}

/**
 * Chat message bubble with support for text, images, and system messages.
 * Handles alignment, read indicators, timestamps, and sender labels.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  theme,
  showReadIndicators,
  isLastInGroup = true,
  onImagePress,
}) => {
  const isUser = message.senderType === 'end_user';
  const isAgent = message.senderType === 'agent';
  const isSystem = message.senderType === 'system';

  // ── System message ──────────────────────────────────────────────────
  if (isSystem || message.contentType === 'system') {
    return (
      <View style={styles.systemContainer}>
        <View style={[styles.systemBubble, { backgroundColor: theme.mutedTextColor + '1A' }]}>
          <Text style={[styles.systemText, { color: theme.mutedTextColor }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  // ── Read indicator icon ─────────────────────────────────────────────
  const renderReadIndicator = () => {
    if (!isUser || !showReadIndicators) return null;

    let indicator = '✓';
    let indicatorColor = theme.mutedTextColor;

    if (message.status === 'delivered') {
      indicator = '✓✓';
    } else if (message.status === 'read') {
      indicator = '✓✓';
      indicatorColor = theme.primaryColor;
    }

    return <Text style={[styles.readIndicator, { color: indicatorColor }]}>{indicator}</Text>;
  };

  // ── Image content ───────────────────────────────────────────────────
  const renderImageContent = () => {
    const imageUrl = message.content;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onImagePress?.(imageUrl)}
        style={styles.imageTouchable}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.imageContent}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  // ── Main bubble ─────────────────────────────────────────────────────
  const bubbleBackgroundColor = isUser ? theme.userBubbleColor : theme.agentBubbleColor;
  const textColor = isUser ? '#FFFFFF' : theme.textColor;
  const timestampColor = isUser ? 'rgba(255, 255, 255, 0.6)' : theme.mutedTextColor;

  // Border radius: rounded on all corners except the "tail" corner
  const bubbleBorderRadius = isLastInGroup
    ? {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: isUser ? 16 : 4,
        borderBottomRightRadius: isUser ? 4 : 16,
      }
    : {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      };

  const containerAlignment = isUser ? styles.userContainer : styles.agentContainer;
  const bottomSpacing = isLastInGroup ? styles.spacingLarge : styles.spacingSmall;

  return (
    <View style={[styles.outerContainer, containerAlignment, bottomSpacing]}>
      {/* Agent label */}
      {isAgent && isLastInGroup ? (
        <Text style={[styles.senderLabel, { color: theme.mutedTextColor }]}>Support</Text>
      ) : null}

      {/* Message bubble */}
      <View
        style={[
          styles.bubble,
          { backgroundColor: bubbleBackgroundColor },
          bubbleBorderRadius,
        ]}
      >
        {message.contentType === 'image' ? (
          renderImageContent()
        ) : (
          <Text style={[styles.messageText, { color: textColor }]}>{message.content}</Text>
        )}
      </View>

      {/* Timestamp row with read indicator */}
      <View style={[styles.timestampRow, isUser ? styles.timestampRight : styles.timestampLeft]}>
        <Text style={[styles.timestamp, { color: timestampColor }]}>
          {formatMessageTime(message.createdAt)}
        </Text>
        {renderReadIndicator()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  agentContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  spacingSmall: {
    marginBottom: 2,
  },
  spacingLarge: {
    marginBottom: 12,
  },
  senderLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  imageTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContent: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  timestampRight: {
    justifyContent: 'flex-end',
  },
  timestampLeft: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  readIndicator: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── System message styles ────────────────────────────────────────────
  systemContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  systemBubble: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '80%',
  },
  systemText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
});
