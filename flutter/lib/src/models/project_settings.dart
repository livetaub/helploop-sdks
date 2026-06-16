import 'package:flutter/material.dart';

/// Public project settings fetched from the SupportHub API.
///
/// These settings control the appearance and behaviour of the SDK
/// widgets, including branding colours, welcome messages, and
/// feature flags.
class ProjectSettings {
  /// The title displayed in the messaging screen app bar.
  final String widgetTitle;

  /// A welcome message shown when the user has no conversations yet.
  final String? welcomeMessage;

  /// The primary branding colour (hex string, e.g. `'#6C5CE7'`).
  final String? brandingPrimaryColor;

  /// The background colour for the messaging screen.
  final String? brandingBgColor;

  /// Whether to show read indicators (checkmarks) on user messages.
  final bool showReadIndicators;

  /// Whether auto-responses are enabled for this project.
  final bool autoResponseEnabled;

  /// The auto-response message text.
  final String? autoResponseMessage;

  /// Creates a new [ProjectSettings].
  const ProjectSettings({
    this.widgetTitle = 'Support',
    this.welcomeMessage,
    this.brandingPrimaryColor,
    this.brandingBgColor,
    this.showReadIndicators = true,
    this.autoResponseEnabled = false,
    this.autoResponseMessage,
  });

  /// Parses a hex colour string (with or without `#`) into a [Color].
  ///
  /// Returns [fallback] if parsing fails.
  static Color parseColor(String? hex, Color fallback) {
    if (hex == null || hex.isEmpty) return fallback;

    var cleaned = hex.replaceAll('#', '').trim();
    if (cleaned.length == 6) cleaned = 'FF$cleaned';
    if (cleaned.length != 8) return fallback;

    final value = int.tryParse(cleaned, radix: 16);
    return value != null ? Color(value) : fallback;
  }

  /// The primary colour as a [Color], falling back to a default purple.
  Color get primaryColor =>
      parseColor(brandingPrimaryColor, const Color(0xFF6C5CE7));

  /// The background colour as a [Color], falling back to white.
  Color get backgroundColor =>
      parseColor(brandingBgColor, const Color(0xFFF8F9FA));

  /// Creates a [ProjectSettings] from a JSON map.
  factory ProjectSettings.fromJson(Map<String, dynamic> json) {
    return ProjectSettings(
      widgetTitle: (json['widget_title'] as String?) ?? 'Support',
      welcomeMessage: json['welcome_message'] as String?,
      brandingPrimaryColor: json['branding_primary_color'] as String?,
      brandingBgColor: json['branding_bg_color'] as String?,
      showReadIndicators: (json['show_read_indicators'] as bool?) ?? true,
      autoResponseEnabled: (json['auto_response_enabled'] as bool?) ?? false,
      autoResponseMessage: json['auto_response_message'] as String?,
    );
  }

  /// Serialises to a JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'widget_title': widgetTitle,
      if (welcomeMessage != null) 'welcome_message': welcomeMessage,
      if (brandingPrimaryColor != null)
        'branding_primary_color': brandingPrimaryColor,
      if (brandingBgColor != null) 'branding_bg_color': brandingBgColor,
      'show_read_indicators': showReadIndicators,
      'auto_response_enabled': autoResponseEnabled,
      if (autoResponseMessage != null)
        'auto_response_message': autoResponseMessage,
    };
  }

  @override
  String toString() =>
      'ProjectSettings(title: $widgetTitle, primary: $brandingPrimaryColor)';
}
