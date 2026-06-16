import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/conversation.dart';
import '../models/project_settings.dart';
import '../theme/sdk_theme.dart';

/// A list screen showing all of the user's conversations.
///
/// Displayed when the user has multiple support conversations.
/// Tapping a conversation pops back with the selected conversation ID.
class ConversationListScreen extends StatelessWidget {
  /// All conversations for the current user.
  final List<SdkConversation> conversations;

  /// The SDK theme.
  final SdkTheme theme;

  /// Project settings (for the title).
  final ProjectSettings settings;

  /// Creates a [ConversationListScreen].
  const ConversationListScreen({
    super.key,
    required this.conversations,
    required this.theme,
    required this.settings,
  });

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: theme.toThemeData(),
      child: Scaffold(
        backgroundColor: theme.backgroundColor,
        appBar: AppBar(
          title: const Text(
            'Conversations',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          centerTitle: false,
        ),
        body: conversations.isEmpty
            ? _buildEmpty()
            : _buildList(context),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => Navigator.of(context).pop('__new__'),
          backgroundColor: theme.primaryColor,
          foregroundColor: theme.onPrimaryColor,
          icon: const Icon(Icons.add_rounded),
          label: const Text('New Conversation'),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.forum_outlined,
            size: 56,
            color: theme.mutedTextColor.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'No conversations yet',
            style: TextStyle(
              fontSize: 16,
              color: theme.mutedTextColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: conversations.length,
      separatorBuilder: (_, __) => Divider(
        height: 1,
        indent: 72,
        color: theme.mutedTextColor.withValues(alpha: 0.15),
      ),
      itemBuilder: (context, index) {
        final convo = conversations[index];
        return _ConversationTile(
          conversation: convo,
          theme: theme,
          onTap: () => Navigator.of(context).pop(convo.id),
        );
      },
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final SdkConversation conversation;
  final SdkTheme theme;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conversation,
    required this.theme,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final hasUnread = conversation.unreadCount > 0;

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      leading: CircleAvatar(
        radius: 22,
        backgroundColor: theme.primaryColor.withValues(alpha: 0.1),
        child: Icon(
          conversation.isOpen
              ? Icons.chat_bubble_rounded
              : Icons.check_circle_outline_rounded,
          color: theme.primaryColor,
          size: 20,
        ),
      ),
      title: Text(
        conversation.subject ?? 'Conversation',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w500,
          fontSize: 15,
          color: theme.textColor,
        ),
      ),
      subtitle: conversation.lastMessagePreview != null
          ? Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text(
                conversation.lastMessagePreview!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  color: hasUnread
                      ? theme.textColor.withValues(alpha: 0.8)
                      : theme.mutedTextColor,
                  fontWeight:
                      hasUnread ? FontWeight.w500 : FontWeight.normal,
                ),
              ),
            )
          : null,
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (conversation.lastMessageAt != null)
            Text(
              _formatDate(conversation.lastMessageAt!),
              style: TextStyle(
                fontSize: 11,
                color: hasUnread ? theme.primaryColor : theme.mutedTextColor,
                fontWeight:
                    hasUnread ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          if (hasUnread) ...[
            const SizedBox(height: 6),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: theme.primaryColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${conversation.unreadCount}',
                style: TextStyle(
                  color: theme.onPrimaryColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inMinutes < 1) return 'Now';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays < 1) return DateFormat.Hm().format(dt);
    if (diff.inDays < 7) return DateFormat.E().format(dt);
    return DateFormat.MMMd().format(dt);
  }
}
