/// A file attachment on a message.
///
/// Currently the SDK supports image attachments, but the model is
/// generic enough to support other file types in the future.
class SdkAttachment {
  /// Unique attachment identifier.
  final String id;

  /// Original file name.
  final String fileName;

  /// MIME type (e.g. `'image/png'`, `'image/jpeg'`).
  final String fileType;

  /// File size in bytes.
  final int? fileSize;

  /// Public URL to download / display the attachment.
  final String url;

  /// Creates a new [SdkAttachment].
  const SdkAttachment({
    required this.id,
    required this.fileName,
    required this.fileType,
    this.fileSize,
    required this.url,
  });

  /// Whether this attachment is an image.
  bool get isImage =>
      fileType.startsWith('image/') ||
      _imageExtensions.any((ext) => fileName.toLowerCase().endsWith(ext));

  static const _imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

  /// Creates an [SdkAttachment] from a JSON map.
  factory SdkAttachment.fromJson(Map<String, dynamic> json) {
    return SdkAttachment(
      id: json['id'] as String,
      fileName: (json['file_name'] as String?) ?? 'attachment',
      fileType: (json['file_type'] as String?) ?? 'application/octet-stream',
      fileSize: (json['file_size'] as num?)?.toInt(),
      url: json['url'] as String,
    );
  }

  /// Serialises this attachment to a JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'file_name': fileName,
      'file_type': fileType,
      if (fileSize != null) 'file_size': fileSize,
      'url': url,
    };
  }

  @override
  String toString() => 'SdkAttachment(id: $id, fileName: $fileName)';
}
