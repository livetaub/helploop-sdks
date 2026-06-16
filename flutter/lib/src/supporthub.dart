import 'dart:async';

import 'package:flutter/material.dart';

import 'api/api_client.dart';
import 'config.dart';
import 'models/project_settings.dart';
import 'models/user_identity.dart';
import 'screens/messaging_screen.dart';
import 'storage/local_storage.dart';

/// The main entry-point for the SupportHub SDK.
///
/// Call [SupportHub.initialize] once during app startup, then use
/// [SupportHub.identify] (or [identifyAnonymous]) and
/// [SupportHub.open] to present the messaging UI.
///
/// ```dart
/// await SupportHub.initialize(
///   projectId: 'my-project',
///   apiKey: 'sk_live_xxx',
/// );
///
/// await SupportHub.identify(externalId: 'user@example.com');
///
/// SupportHub.open(context);
/// ```
class SupportHub {
  // ── Singleton ─────────────────────────────────────────────────────

  static SupportHub? _instance;

  /// Returns the initialised SDK instance.
  ///
  /// Throws [StateError] if [initialize] has not been called.
  static SupportHub get instance {
    if (_instance == null) {
      throw StateError(
        'SupportHub has not been initialised. '
        'Call SupportHub.initialize() first.',
      );
    }
    return _instance!;
  }

  /// Whether the SDK has been initialised.
  static bool get isInitialized => _instance != null;

  // ── Fields ────────────────────────────────────────────────────────

  /// The active configuration.
  final SupportHubConfig config;

  /// The HTTP client used to communicate with the API.
  final ApiClient apiClient;

  /// Local persistence.
  final LocalStorage storage;

  /// The currently identified user, or `null`.
  UserIdentity? _currentUser;

  /// Cached project settings.
  ProjectSettings? _settings;

  /// Controller for the unread-count stream.
  StreamController<int>? _unreadController;

  /// Timer used for polling unread counts.
  Timer? _pollTimer;

  // ── Constructor (private) ─────────────────────────────────────────

  SupportHub._({
    required this.config,
    required this.apiClient,
    required this.storage,
  });

  // ── Public API ────────────────────────────────────────────────────

  /// Initialises the SDK. Must be called once before any other method.
  ///
  /// [projectId] and [apiKey] are required. [apiUrl] defaults to a
  /// placeholder Supabase URL — replace with your own.
  static Future<void> initialize({
    required String projectId,
    required String apiKey,
    String? apiUrl,
    Duration pollInterval = const Duration(seconds: 30),
  }) async {
    WidgetsFlutterBinding.ensureInitialized();

    final config = SupportHubConfig(
      projectId: projectId,
      apiKey: apiKey,
      apiUrl: apiUrl ?? 'https://$projectId.supabase.co/functions/v1/supporthub',
      pollInterval: pollInterval,
    );

    final client = ApiClient(config);
    final localStorage = LocalStorage();

    _instance = SupportHub._(
      config: config,
      apiClient: client,
      storage: localStorage,
    );

    // Pre-fetch settings in the background.
    unawaited(_instance!._loadSettings());
  }

  /// The currently identified user.
  static UserIdentity? get currentUser => instance._currentUser;

  /// Cached project settings.
  static ProjectSettings? get settings => instance._settings;

  // ── Identify ──────────────────────────────────────────────────────

  /// Identifies an authenticated user.
  ///
  /// Upserts the user in the SupportHub backend and caches the
  /// identity locally.
  static Future<void> identify({
    required String externalId,
    String identifierType = 'email',
    String? email,
    String? name,
    String? company,
    String? subscriptionTier,
    Map<String, dynamic>? metadata,
  }) async {
    final identity = UserIdentity(
      externalId: externalId,
      identifierType: identifierType,
      email: email,
      name: name,
      company: company,
      subscriptionTier: subscriptionTier,
      metadata: metadata,
    );

    try {
      await instance.apiClient.identifyUser(identity.toJson());
    } catch (_) {
      // Identification is best-effort — allow offline usage.
    }

    instance._currentUser = identity;
    await instance.storage.setExternalId(externalId);
  }

  /// Identifies an anonymous user using a persistent device ID.
  ///
  /// A UUID is generated on first call and reused across sessions.
  static Future<void> identifyAnonymous() async {
    final anonId = await instance.storage.getAnonymousId();

    final identity = UserIdentity(
      externalId: anonId,
      identifierType: 'device_id',
    );

    try {
      await instance.apiClient.identifyUser(identity.toJson());
    } catch (_) {
      // Best-effort.
    }

    instance._currentUser = identity;
    await instance.storage.setExternalId(anonId);
  }

  // ── Open UI ───────────────────────────────────────────────────────

  /// Opens the SupportHub messaging screen.
  ///
  /// Pushes a full-screen [MessagingScreen] onto the navigator.
  /// If no user has been identified, [identifyAnonymous] is called
  /// automatically.
  static void open(BuildContext context) {
    if (instance._currentUser == null) {
      identifyAnonymous().then((_) => _pushMessaging(context));
    } else {
      _pushMessaging(context);
    }
  }

  static void _pushMessaging(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const MessagingScreen(),
      ),
    );
  }

  // ── Unread Count ──────────────────────────────────────────────────

  /// Returns the current unread message count for the identified user.
  static Future<int> getUnreadCount() async {
    final userId = instance._currentUser?.externalId;
    if (userId == null) return 0;

    try {
      return await instance.apiClient.getUnreadCount(userId);
    } catch (_) {
      return 0;
    }
  }

  /// A broadcast stream that emits the unread count periodically.
  ///
  /// Polls every [SupportHubConfig.pollInterval] (default 30 s).
  /// Cancel the subscription when the widget is disposed to stop
  /// polling.
  static Stream<int> onUnreadCountChanged() {
    final hub = instance;

    hub._unreadController ??= StreamController<int>.broadcast(
      onListen: () => hub._startPolling(),
      onCancel: () => hub._stopPolling(),
    );

    return hub._unreadController!.stream;
  }

  void _startPolling() {
    _pollTimer?.cancel();

    // Emit immediately.
    _emitUnread();

    _pollTimer = Timer.periodic(config.pollInterval, (_) => _emitUnread());
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _emitUnread() async {
    try {
      final count = await getUnreadCount();
      _unreadController?.add(count);
    } catch (_) {
      // Silently ignore polling errors.
    }
  }

  // ── Push Notifications ────────────────────────────────────────────

  /// Registers a device token for push notifications.
  ///
  /// [platform] should be `'android'`, `'ios'`, or `'web'`.
  static Future<void> registerDeviceToken({
    required String token,
    required String platform,
  }) async {
    final userId = instance._currentUser?.externalId;
    if (userId == null) return;

    await instance.apiClient.registerDevice(userId, token, platform);
  }

  /// Unregisters a previously-registered device token.
  static Future<void> unregisterDeviceToken(String token) async {
    await instance.apiClient.unregisterDevice(token);
  }

  // ── Logout ────────────────────────────────────────────────────────

  /// Clears the current user session and all persisted data.
  static Future<void> logout() async {
    instance._stopPolling();
    instance._unreadController?.close();
    instance._unreadController = null;
    instance._currentUser = null;
    instance._settings = null;
    await instance.storage.clearAll();
  }

  // ── Settings ──────────────────────────────────────────────────────

  /// Loads project settings from the API.
  ///
  /// Returns cached settings if available.
  static Future<ProjectSettings> loadSettings() async {
    if (instance._settings != null) return instance._settings!;
    return instance._loadSettings();
  }

  Future<ProjectSettings> _loadSettings() async {
    try {
      final json = await apiClient.getSettings();
      _settings = ProjectSettings.fromJson(json);
    } catch (_) {
      _settings = const ProjectSettings();
    }
    return _settings!;
  }
}
