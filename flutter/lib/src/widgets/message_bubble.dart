import 'package:flutter/material.dart';

import '../models/message.dart';
import '../theme/sdk_theme.dart';
import 'attachment_preview.dart';

/// A chat bubble for a single [SdkMessage].
///
/// Renders differently based on [SdkMessage.senderType]:
/// - **user**: right-aligned, primary colour background
/// - **agent**: left-aligned, surface colour, with agent label
/// - **system**: centred, muted background, italic
class MessageBubble extends StatelessWidget {
  /// The message to display.
  final SdkMessage message;

  /// The SDK theme controlling colours.
  final SdkTheme theme;

  /// Whether to show read indicators on user messages.
  final bool showReadIndicators;

  /// Optional callback when an image attachment is tapped.
  final ValueChanged<String>? onImageTap;

  /// Creates a [MessageBubble].
  const MessageBubble({
    super.key,
    required this.message,
    required this.theme,
    this.showReadIndicators = true,
    this.onImageTap,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isSystem) return _buildSystem(context);
    if (message.isAgent) return _buildAgent(context);
    return _buildUser(context);
  }

  // ── User bubble ───────────────────────────────────────────────────

  Widget _buildUser(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Container(
          margin: const EdgeInsets.only(left: 48, right: 12, top: 2, bottom: 2),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: theme.userBubbleColor,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              topRight: Radius.circular(18),
              bottomLeft: Radius.circular(18),
              bottomRight: Radius.circular(4),
            ),
            boxShadow: [
              BoxShadow(
                color: theme.primaryColor.withValues(alpha: 0.15),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (message.attachments.isNotEmpty) ...[
                ...message.attachments.map(
                  (a) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: AttachmentPreview(
                      attachment: a,
                      onTap: onImageTap,
                    ),
                  ),
                ),
              ],
              if (message.content.isNotEmpty)
                Text(
                  message.content,
                  style: TextStyle(
                    color: theme.onPrimaryColor,
                    fontSize: 15,
                    height: 1.35,
                  ),
                ),
              const SizedBox(height: 4),
              _buildMeta(isUser: true),
            ],
          ),
        ),
      ),
    );
  }

  // ── Agent bubble ──────────────────────────────────────────────────

  Widget _buildAgent(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Container(
          margin: const EdgeInsets.only(left: 12, right: 48, top: 2, bottom: 2),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: theme.agentBubbleColor,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              topRight: Radius.circular(18),
              bottomLeft: Radius.circular(4),
              bottomRight: Radius.circular(18),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (message.senderName != null) ...[
                Text(
                  message.senderName!,
                  style: TextStyle(
                    color: theme.primaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
              ],
              if (message.attachments.isNotEmpty) ...[
                ...message.attachments.map(
                  (a) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: AttachmentPreview(
                      attachment: a,
                      onTap: onImageTap,
                    ),
                  ),
                ),
              ],
              if (message.content.isNotEmpty)
                Text(
                  message.content,
                  style: TextStyle(
                    color: theme.textColor,
                    fontSize: 15,
                    height: 1.35,
                  ),
                ),
              const SizedBox(height: 4),
              _buildMeta(isUser: false),
            ],
          ),
        ),
      ),
    );
  }

  // ── System message ────────────────────────────────────────────────

  Widget _buildSystem(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 32, vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: theme.isDark
              ? Colors.white.withValues(alpha: 0.06)
              : Colors.black.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          message.content,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: theme.mutedTextColor,
            fontSize: 13,
            fontStyle: FontStyle.italic,
            height: 1.3,
          ),
        ),
      ),
    );
  }

  // ── Timestamp + read indicators ───────────────────────────────────

  Widget _buildMeta({required bool isUser}) {
    final timeStr = _formatTime(message.createdAt);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          timeStr,
          style: TextStyle(
            color: isUser
                ? theme.onPrimaryColor.withValues(alpha: 0.7)
                : theme.mutedTextColor,
            fontSize: 11,
          ),
        ),
        if (isUser && showReadIndicators) ...[
          const SizedBox(width: 4),
          _buildReadIndicator(),
        ],
      ],
    );
  }

  Widget _buildReadIndicator() {
    final iconColor = theme.onPrimaryColor.withValues(alpha: 0.7);
    const iconSize = 14.0;

    switch (message.status) {
      case 'read':
        return Icon(Icons.done_all, size: iconSize, color: iconColor);
      case 'delivered':
        return Icon(Icons.done_all, size: iconSize, color: iconColor.withValues(alpha: 0.5));
      case 'sent':
      default:
        return Icon(Icons.done, size: iconSize, color: iconColor.withValues(alpha: 0.5));
    }
  }

  static String _formatTime(DateTime dt) {
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}
