import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../theme/sdk_theme.dart';

/// A visual separator showing the date between groups of messages.
///
/// Displays "Today", "Yesterday", or a formatted date string,
/// centred between two horizontal lines.
class DateSeparator extends StatelessWidget {
  /// The date to display.
  final DateTime date;

  /// The SDK theme controlling colours.
  final SdkTheme theme;

  /// Creates a [DateSeparator].
  const DateSeparator({
    super.key,
    required this.date,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
      child: Row(
        children: [
          Expanded(child: _line()),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              _label(),
              style: TextStyle(
                color: theme.mutedTextColor,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.3,
              ),
            ),
          ),
          Expanded(child: _line()),
        ],
      ),
    );
  }

  Widget _line() {
    return Container(
      height: 0.5,
      color: theme.mutedTextColor.withValues(alpha: 0.3),
    );
  }

  String _label() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDate = DateTime(date.year, date.month, date.day);

    final diff = today.difference(messageDate).inDays;

    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    if (diff < 7) return DateFormat.EEEE().format(date); // e.g. "Monday"
    if (date.year == now.year) return DateFormat.MMMd().format(date); // "Jun 12"
    return DateFormat.yMMMd().format(date); // "Jun 12, 2025"
  }
}
