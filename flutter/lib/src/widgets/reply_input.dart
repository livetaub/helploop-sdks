import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../theme/sdk_theme.dart';

/// A message reply input bar with text field, attach button, and
/// send button.
///
/// Includes an image preview strip when an image is attached.
class ReplyInput extends StatefulWidget {
  /// The SDK theme controlling colours.
  final SdkTheme theme;

  /// Called when the user taps the send button.
  ///
  /// Receives the message text and optional image data.
  final void Function(String text, Uint8List? imageBytes, String? imageName)
      onSend;

  /// Whether the input is disabled (e.g. conversation closed).
  final bool disabled;

  /// Creates a [ReplyInput].
  const ReplyInput({
    super.key,
    required this.theme,
    required this.onSend,
    this.disabled = false,
  });

  @override
  State<ReplyInput> createState() => _ReplyInputState();
}

class _ReplyInputState extends State<ReplyInput> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _picker = ImagePicker();

  Uint8List? _attachedImage;
  String? _attachedName;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final has = _controller.text.trim().isNotEmpty;
      if (has != _hasText) setState(() => _hasText = has);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  bool get _canSend => (_hasText || _attachedImage != null) && !widget.disabled;

  Future<void> _pickImage() async {
    try {
      final file = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (file == null) return;

      final bytes = await file.readAsBytes();
      setState(() {
        _attachedImage = bytes;
        _attachedName = file.name;
      });
    } catch (_) {
      // Silently handle picker errors.
    }
  }

  void _removeImage() {
    setState(() {
      _attachedImage = null;
      _attachedName = null;
    });
  }

  void _send() {
    if (!_canSend) return;

    final text = _controller.text.trim();
    widget.onSend(text, _attachedImage, _attachedName);

    _controller.clear();
    setState(() {
      _attachedImage = null;
      _attachedName = null;
      _hasText = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.theme;

    return Container(
      decoration: BoxDecoration(
        color: theme.surfaceColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Image preview strip
            if (_attachedImage != null) _buildImagePreview(theme),

            // Input row
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Attach button
                  _CircleButton(
                    icon: Icons.camera_alt_rounded,
                    color: theme.mutedTextColor,
                    onTap: widget.disabled ? null : _pickImage,
                    size: 40,
                  ),
                  const SizedBox(width: 6),

                  // Text field
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: theme.isDark
                            ? Colors.white.withValues(alpha: 0.07)
                            : Colors.black.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: TextField(
                        controller: _controller,
                        focusNode: _focusNode,
                        enabled: !widget.disabled,
                        maxLines: 4,
                        minLines: 1,
                        textCapitalization: TextCapitalization.sentences,
                        textInputAction: TextInputAction.newline,
                        style: TextStyle(
                          color: theme.textColor,
                          fontSize: 15,
                        ),
                        decoration: InputDecoration(
                          hintText: widget.disabled
                              ? 'Conversation closed'
                              : 'Type a message...',
                          hintStyle: TextStyle(
                            color: theme.mutedTextColor,
                            fontSize: 15,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),

                  // Send button
                  AnimatedScale(
                    scale: _canSend ? 1.0 : 0.85,
                    duration: const Duration(milliseconds: 150),
                    child: _CircleButton(
                      icon: Icons.send_rounded,
                      color: _canSend
                          ? theme.onPrimaryColor
                          : theme.mutedTextColor.withValues(alpha: 0.5),
                      backgroundColor:
                          _canSend ? theme.primaryColor : Colors.transparent,
                      onTap: _canSend ? _send : null,
                      size: 40,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImagePreview(SdkTheme theme) {
    return Container(
      height: 72,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      alignment: Alignment.centerLeft,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.memory(
              _attachedImage!,
              width: 60,
              height: 60,
              fit: BoxFit.cover,
            ),
          ),
          Positioned(
            top: -4,
            right: -4,
            child: GestureDetector(
              onTap: _removeImage,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: theme.primaryColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.close,
                  size: 12,
                  color: theme.onPrimaryColor,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A small circular icon button used in the reply input.
class _CircleButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color? backgroundColor;
  final VoidCallback? onTap;
  final double size;

  const _CircleButton({
    required this.icon,
    required this.color,
    this.backgroundColor,
    this.onTap,
    this.size = 36,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Material(
        color: backgroundColor ?? Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Center(
            child: Icon(icon, size: size * 0.5, color: color),
          ),
        ),
      ),
    );
  }
}
