import 'package:flutter/material.dart';

import '../models/project_settings.dart';

/// Visual theme used by all SupportHub SDK widgets.
///
/// Can be constructed from [ProjectSettings] fetched from the API,
/// or falls back to sensible defaults.
class SdkTheme {
  /// Primary brand colour (buttons, user bubbles, accents).
  final Color primaryColor;

  /// Chat background colour.
  final Color backgroundColor;

  /// Surface colour used for cards, agent bubbles, inputs.
  final Color surfaceColor;

  /// User message bubble colour.
  final Color userBubbleColor;

  /// Agent message bubble colour.
  final Color agentBubbleColor;

  /// Primary text colour.
  final Color textColor;

  /// Secondary / muted text colour (timestamps, labels).
  final Color mutedTextColor;

  /// Text colour on top of the primary colour.
  final Color onPrimaryColor;

  /// Whether the host app is using a dark theme.
  final bool isDark;

  /// Creates a new [SdkTheme].
  const SdkTheme({
    required this.primaryColor,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.userBubbleColor,
    required this.agentBubbleColor,
    required this.textColor,
    required this.mutedTextColor,
    required this.onPrimaryColor,
    this.isDark = false,
  });

  /// Builds a theme from [ProjectSettings], adapting to the host
  /// app's brightness.
  factory SdkTheme.fromSettings(
    ProjectSettings settings, {
    Brightness brightness = Brightness.light,
  }) {
    final isDark = brightness == Brightness.dark;
    final primary = settings.primaryColor;
    final bg = settings.backgroundColor;

    return SdkTheme(
      primaryColor: primary,
      backgroundColor: isDark ? const Color(0xFF121212) : bg,
      surfaceColor:
          isDark ? const Color(0xFF1E1E1E) : const Color(0xFFFFFFFF),
      userBubbleColor: primary,
      agentBubbleColor:
          isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF0F0F0),
      textColor:
          isDark ? const Color(0xFFE0E0E0) : const Color(0xFF1A1A2E),
      mutedTextColor:
          isDark ? const Color(0xFF888888) : const Color(0xFF999999),
      onPrimaryColor: _contrastColor(primary),
      isDark: isDark,
    );
  }

  /// A sensible default theme used when settings can't be loaded.
  factory SdkTheme.defaultTheme({Brightness brightness = Brightness.light}) {
    return SdkTheme.fromSettings(
      const ProjectSettings(),
      brightness: brightness,
    );
  }

  /// Decides whether to use white or black text on top of [color].
  static Color _contrastColor(Color color) {
    final luminance = color.computeLuminance();
    return luminance > 0.5 ? Colors.black87 : Colors.white;
  }

  /// Builds a Flutter [ThemeData] derived from this SDK theme.
  ///
  /// Useful for wrapping SDK screens in a localised [Theme].
  ThemeData toThemeData() {
    return ThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: primaryColor,
        onPrimary: onPrimaryColor,
        secondary: primaryColor.withValues(alpha: 0.8),
        onSecondary: onPrimaryColor,
        surface: surfaceColor,
        onSurface: textColor,
        error: const Color(0xFFE74C3C),
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: backgroundColor,
      appBarTheme: AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: onPrimaryColor,
        elevation: 0,
      ),
    );
  }
}
