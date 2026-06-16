/// A lightweight conversation model used by the SDK.
///
/// Represents a support conversation between an end-user and the
/// support team. Contains only the fields needed for the SDK UI.
class SdkConversation {
  /// Unique conversation identifier.
  final String id;

  /// Optional subject line for the conversation.
  final String? subject;

  /// Current status — `'open'`, `'closed'`, or `'archived'`.
  final String status;

  /// When the last message in this conversation was sent.
  final DateTime? lastMessageAt;

  /// A short preview of the last message content.
  final String? lastMessagePreview;

  /// Number of unread messages for the current user.
  final int unreadCount;

  /// Creates a new [SdkConversation].
  const SdkConversation({
    required this.id,
    this.subject,
    this.status = 'open',
    this.lastMessageAt,
    this.lastMessagePreview,
    this.unreadCount = 0,
  });

  /// Whether this conversation is still open for new messages.
  bool get isOpen => status == 'open';

  /// Creates an [SdkConversation] from a JSON map.
  factory SdkConversation.fromJson(Map<String, dynamic> json) {
    return SdkConversation(
      id: json['id'] as String,
      subject: json['subject'] as String?,
      status: (json['status'] as String?) ?? 'open',
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.parse(json['last_message_at'] as String)
          : null,
      lastMessagePreview: json['last_message_preview'] as String?,
      unreadCount: (json['unread_count'] as num?)?.toInt() ?? 0,
    );
  }

  /// Serialises this conversation to a JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (subject != null) 'subject': subject,
      'status': status,
      if (lastMessageAt != null)
        'last_message_at': lastMessageAt!.toIso8601String(),
      if (lastMessagePreview != null)
        'last_message_preview': lastMessagePreview,
      'unread_count': unreadCount,
    };
  }

  @override
  String toString() =>
      'SdkConversation(id: $id, status: $status, unread: $unreadCount)';
}
