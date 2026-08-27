class HelpLoopConfig {
  final String projectId;
  final String apiKey;
  final String apiUrl;
  final String widgetUrl;
  final Duration pollInterval;
  final String? appVersion;

  const HelpLoopConfig({
    required this.projectId,
    required this.apiKey,
    required this.apiUrl,
    this.widgetUrl = 'https://widget.helploop.com',
    this.pollInterval = const Duration(seconds: 30),
    this.appVersion,
  });

  HelpLoopConfig copyWith({
    String? projectId,
    String? apiKey,
    String? apiUrl,
    String? widgetUrl,
    Duration? pollInterval,
    String? appVersion,
  }) {
    return HelpLoopConfig(
      projectId: projectId ?? this.projectId,
      apiKey: apiKey ?? this.apiKey,
      apiUrl: apiUrl ?? this.apiUrl,
      widgetUrl: widgetUrl ?? this.widgetUrl,
      pollInterval: pollInterval ?? this.pollInterval,
      appVersion: appVersion ?? this.appVersion,
    );
  }
}
