/// Configuration for the SupportHub SDK.
///
/// Created during [SupportHub.initialize] and holds all connection
/// parameters needed to communicate with the SupportHub API.
class SupportHubConfig {
  /// The SupportHub project identifier.
  final String projectId;

  /// The API key used to authenticate requests.
  final String apiKey;

  /// The base URL for the SupportHub API.
  ///
  /// Defaults to a placeholder — override with your Supabase project URL.
  final String apiUrl;

  /// How often to poll for new messages and unread count updates.
  ///
  /// Defaults to 30 seconds.
  final Duration pollInterval;

  /// Creates a new [SupportHubConfig].
  const SupportHubConfig({
    required this.projectId,
    required this.apiKey,
    required this.apiUrl,
    this.pollInterval = const Duration(seconds: 30),
  });

  /// Creates a copy of this config with the given fields replaced.
  SupportHubConfig copyWith({
    String? projectId,
    String? apiKey,
    String? apiUrl,
    Duration? pollInterval,
  }) {
    return SupportHubConfig(
      projectId: projectId ?? this.projectId,
      apiKey: apiKey ?? this.apiKey,
      apiUrl: apiUrl ?? this.apiUrl,
      pollInterval: pollInterval ?? this.pollInterval,
    );
  }
}
