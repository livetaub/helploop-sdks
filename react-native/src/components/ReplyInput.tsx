import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import type { SupportHubTheme } from '../models/types';

interface AttachedImage {
  uri: string;
  fileName: string;
}

interface ReplyInputProps {
  /** Callback when the user sends a message */
  onSend: (text: string) => void;
  /** Callback when the attach button is pressed */
  onAttach?: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Theme object for styling */
  theme: SupportHubTheme;
  /** Currently attached image for preview */
  attachedImage?: AttachedImage | null;
  /** Callback to remove the currently attached image */
  onRemoveAttachment?: () => void;
}

/**
 * Message input bar with attach button, multiline text input, and send button.
 * Supports image attachment previews with removal.
 */
export const ReplyInput: React.FC<ReplyInputProps> = ({
  onSend,
  onAttach,
  disabled = false,
  theme,
  attachedImage,
  onRemoveAttachment,
}) => {
  const [text, setText] = useState<string>('');

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;

    const trimmed = text.trim();
    setText('');
    onSend(trimmed);
  };

  const borderColor = theme.mutedTextColor + '30'; // ~19% opacity

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surfaceColor, borderTopColor: borderColor },
      ]}
    >
      {/* Image attachment preview */}
      {attachedImage ? (
        <View style={styles.attachmentRow}>
          <View style={styles.attachmentPreview}>
            <Image source={{ uri: attachedImage.uri }} style={styles.attachmentImage} />
            <TouchableOpacity
              style={styles.removeAttachmentButton}
              onPress={onRemoveAttachment}
              activeOpacity={0.7}
            >
              <Text style={styles.removeAttachmentText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text
            style={[styles.attachmentFileName, { color: theme.mutedTextColor }]}
            numberOfLines={1}
          >
            {attachedImage.fileName}
          </Text>
        </View>
      ) : null}

      {/* Input row */}
      <View style={[styles.inputRow, disabled ? styles.disabledRow : null]}>
        {/* Attach button */}
        <TouchableOpacity
          style={styles.attachButton}
          onPress={onAttach}
          disabled={disabled}
          activeOpacity={0.6}
        >
          <Text style={[styles.attachIcon, { color: theme.mutedTextColor }]}>📎</Text>
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={[
            styles.textInput,
            { color: theme.textColor, backgroundColor: theme.backgroundColor },
          ]}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={theme.mutedTextColor + '80'}
          multiline
          maxLength={5000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? theme.primaryColor : theme.primaryColor + '40' },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  attachmentPreview: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  attachmentFileName: {
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  disabledRow: {
    opacity: 0.5,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  attachIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 15,
    lineHeight: 20,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
