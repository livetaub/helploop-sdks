import 'dart:async';

import 'package:flutter/material.dart';

import '../supporthub.dart';

/// A badge that shows the current unread message count.
///
/// Wraps any [child] widget (typically an icon) and overlays a small
/// circular badge showing the unread count. Hides automatically when
/// the count is zero.
///
/// ```dart
/// SupportHubBadge(
///   child: Icon(Icons.support_agent),
/// )
/// ```
class SupportHubBadge extends StatefulWidget {
  /// The widget to wrap (shown behind the badge).
  final Widget child;

  /// Override the badge background colour.
  final Color? badgeColor;

  /// Override the badge text colour.
  final Color? textColor;

  /// Optional stream to control the displayed count externally.
  ///
  /// If not provided, uses [SupportHub.onUnreadCountChanged].
  final Stream<int>? countStream;

  /// Creates a [SupportHubBadge].
  const SupportHubBadge({
    super.key,
    required this.child,
    this.badgeColor,
    this.textColor,
    this.countStream,
  });

  @override
  State<SupportHubBadge> createState() => _SupportHubBadgeState();
}

class _SupportHubBadgeState extends State<SupportHubBadge>
    with SingleTickerProviderStateMixin {
  int _count = 0;
  StreamSubscription<int>? _subscription;
  late final AnimationController _scaleController;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _scaleController,
      curve: Curves.elasticOut,
    );

    _subscribe();
  }

  void _subscribe() {
    final stream = widget.countStream ?? _sdkStream();
    _subscription = stream.listen((count) {
      if (!mounted) return;
      final wasZero = _count == 0;
      setState(() => _count = count);

      if (count > 0 && wasZero) {
        _scaleController.forward(from: 0);
      } else if (count == 0) {
        _scaleController.reverse();
      }
    });
  }

  Stream<int> _sdkStream() {
    try {
      return SupportHub.onUnreadCountChanged();
    } catch (_) {
      return const Stream.empty();
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _scaleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        widget.child,
        if (_count > 0)
          Positioned(
            right: -6,
            top: -4,
            child: ScaleTransition(
              scale: _scaleAnimation,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                decoration: BoxDecoration(
                  color: widget.badgeColor ?? const Color(0xFF6C5CE7),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: (widget.badgeColor ?? const Color(0xFF6C5CE7))
                          .withValues(alpha: 0.4),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(
                  _count > 99 ? '99+' : '$_count',
                  style: TextStyle(
                    color: widget.textColor ?? Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    height: 1,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
