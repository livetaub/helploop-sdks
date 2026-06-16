import 'attachment.dart';

/// A single message within a conversation.
///
/// Messages can originate from the end-user (`'user'`), a support
/// agent (`'agent'`), or the system (`'system'`).
class SdkMessage {
  /// Unique message identifier.
  final String id;

  /// The text content of the message.
  final String content;

  /// Content type — `'text'` or `'image'`.
  final String contentType;

  /// Who sent this message — `'user'`, `'agent'`, or `'system'`.
  final String senderType;

  /// The identifier of the sender.
  final String? senderId;

  /// The display name of the sender (for agent messages).
  final String? senderName;

  /// Delivery status — `'sent'`, `'delivered'`, or `'read'`.
  final String status;

  /// When this message was created.
  final DateTime createdAt;

  /// When this message was read by the recipient.
  final DateTime? readAt;

  /// Attachments on this message (images, files).
  final List<SdkAttachment> attachments;

  /// Creates a new [SdkMessage].
  const SdkMessage({
    required this.id,
    required this.content,
    this.contentType = 'text',
    required this.senderType,
    this.senderId,
    this.senderName,
    this.status = 'sent',
    required this.createdAt,
    this.readAt,
    this.attachments = const [],
  });

  /// Whether this message was sent by the current user.
  bool get isUser => senderType == 'user';

  /// Whether this message was sent by an agent.
  bool get isAgent => senderType == 'agent';

  /// Whether this message is a system notification.
  bool get isSystem => senderType == 'system';

  /// Whether this message has been read.
  bool get isRead => readAt != null || status == 'read';

  /// Creates an [SdkMessage] from a JSON map.
  factory SdkMessage.fromJson(Map<String, dynamic> json) {
    final attachmentsJson = json['attachments'] as List<dynamic>?;

    return SdkMessage(
      id: json['id'] as String,
      content: (json['content'] as String?) ?? '',
      contentType: (json['content_type'] as String?) ?? 'text',
      senderType: json['sender_type'] as String,
      senderId: json['sender_id'] as String?,
      senderName: json['sender_name'] as String?,
      status: (json['status'] as String?) ?? 'sent',
      createdAt: DateTime.parse(json['created_at'] as String),
      readAt: json['read_at'] != null
          ? DateTime.parse(json['read_at'] as String)
          : null,
      attachments: attachmentsJson
              ?.map(
                (a) => SdkAttachment.fromJson(a as Map<String, dynamic>),
              )
              .toList() ??
          const [],
    );
  }

  /// Serialises this message to a JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'content_type': contentType,
      'sender_type': senderType,
      if (senderId != null) 'sender_id': senderId,
      if (senderName != null) 'sender_name': senderName,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      if (readAt != null) 'read_at': readAt!.toIso8601String(),
      'attachments': attachments.map((a) => a.toJson()).toList(),
    };
  }

  @override
  String toString() =>
      'SdkMessage(id: $id, senderType: $senderType, content: ${content.length > 30 ? '${content.substring(0, 30)}...' : content})';
}
