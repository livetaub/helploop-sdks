import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/attachment.dart';

/// Displays an image attachment inline in a message bubble.
///
/// - Rounded corners, constrained height
/// - Shimmer placeholder while loading
/// - Error icon on failure
/// - Tap opens the image full-screen with [InteractiveViewer]
class AttachmentPreview extends StatelessWidget {
  /// The attachment to display.
  final SdkAttachment attachment;

  /// Called when the image is tapped. Receives the URL.
  final ValueChanged<String>? onTap;

  /// Maximum height for the thumbnail.
  final double maxHeight;

  /// Creates an [AttachmentPreview].
  const AttachmentPreview({
    super.key,
    required this.attachment,
    this.onTap,
    this.maxHeight = 200,
  });

  @override
  Widget build(BuildContext context) {
    if (!attachment.isImage) {
      return _buildFileChip(context);
    }

    return GestureDetector(
      onTap: () {
        if (onTap != null) {
          onTap!(attachment.url);
        } else {
          _openFullScreen(context);
        }
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: maxHeight,
            maxWidth: double.infinity,
          ),
          child: CachedNetworkImage(
            imageUrl: attachment.url,
            fit: BoxFit.cover,
            placeholder: (_, __) => _buildPlaceholder(),
            errorWidget: (_, __, ___) => _buildError(),
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: Icon(Icons.broken_image_outlined, color: Colors.grey, size: 32),
      ),
    );
  }

  Widget _buildFileChip(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.attach_file, size: 18, color: Colors.grey),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              attachment.fileName,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  void _openFullScreen(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _FullScreenImage(url: attachment.url),
      ),
    );
  }
}

/// Full-screen image viewer with pinch-to-zoom.
class _FullScreenImage extends StatelessWidget {
  final String url;

  const _FullScreenImage({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4.0,
          child: CachedNetworkImage(
            imageUrl: url,
            fit: BoxFit.contain,
            placeholder: (_, __) => const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
            errorWidget: (_, __, ___) => const Center(
              child: Icon(
                Icons.broken_image_outlined,
                color: Colors.white54,
                size: 64,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
