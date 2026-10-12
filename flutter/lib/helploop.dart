import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

import 'config.dart';

export 'config.dart';

class UserIdentity {
  final String externalId;
  final String identifierType;
  final String? email;
  final String? name;

  const UserIdentity({
    required this.externalId,
    required this.identifierType,
    this.email,
    this.name,
  });
}

class HelpLoop {
  static HelpLoop? _instance;

  static HelpLoop get instance {
    if (_instance == null) {
      throw StateError('HelpLoop has not been initialized.');
    }
    return _instance!;
  }

  HelpLoopConfig config;
  UserIdentity? _currentUser;

  HelpLoop._(this.config);

  static Future<void> initialize({
    required String projectId,
    required String apiKey,
    required String apiUrl,
    String? appVersion,
    String widgetUrl = 'https://web-black-five-25.vercel.app',
  }) async {
    _instance = HelpLoop._(HelpLoopConfig(
      projectId: projectId,
      apiKey: apiKey,
      apiUrl: apiUrl,
      appVersion: appVersion,
      widgetUrl: widgetUrl,
    ));
    
    await _loadGuestIdentity();
  }

  static Future<void> _loadGuestIdentity() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final guestDataStr = prefs.getString('helploop_guest_identity');
      if (guestDataStr != null && _instance?._currentUser == null) {
        final data = jsonDecode(guestDataStr);
        await identify(
          externalId: data['externalId'] ?? 'guest',
          email: data['email'],
          name: data['name'],
        );
      }
    } catch (_) {}
  }

  static Future<void> identify({
    required String externalId,
    dynamic identifierType = 'email',
    String? email,
    String? name,
    String? company,
    String? subscriptionTier,
    Map<String, dynamic>? metadata,
  }) async {
    final String typeStr = (identifierType is String) ? identifierType : 'custom';
    instance._currentUser = UserIdentity(
      externalId: externalId,
      identifierType: typeStr,
      email: email,
      name: name,
    );
  }

  static Future<void> identifyAnonymous() async {
    instance._currentUser = const UserIdentity(
      externalId: 'guest',
      identifierType: 'anonymous',
    );
  }

  static Future<void> logout() async {
    instance._currentUser = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('helploop_guest_identity');
      await prefs.remove(_broadcastSeenKey(instance.config.projectId));
    } catch (_) {}
  }

  static Uri getWidgetUri() {
    final config = instance.config;
    final user = instance._currentUser;
    
    final queryParams = <String, String>{
      'projectId': config.projectId,
      'apiKey': config.apiKey,
      'apiUrl': config.apiUrl,
    };
    
    if (config.appVersion != null) {
      queryParams['appVersion'] = config.appVersion!;
    }
    
    if (user != null) {
      if (user.externalId != 'guest') {
         queryParams['externalId'] = user.externalId;
      }
      if (user.email != null) {
        queryParams['email'] = user.email!;
      }
      if (user.name != null) {
        queryParams['name'] = user.name!;
      }
    }
    
    return Uri.parse(config.widgetUrl).replace(queryParameters: queryParams);
  }

  static Future<int> getUnreadCount() async {
    var count = 0;

    final user = instance._currentUser;
    if (user != null && user.externalId != 'guest') {
      try {
        final config = instance.config;
        final uri = Uri.parse('${config.apiUrl}/unread').replace(queryParameters: {
          'external_user_id': user.externalId,
        });
        final response = await http.get(uri, headers: {
          'X-Project-ID': config.projectId,
          'X-API-Key': config.apiKey,
        });
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          count = (data['unread_count'] as num?)?.toInt() ?? 0;
        }
      } catch (_) {}
    }

    // Broadcasts are render-only (no conversation rows), so they are tracked
    // client-side: any broadcast newer than the last-seen timestamp counts
    // as one unread item.
    try {
      if (await _hasUnseenBroadcast()) count += 1;
    } catch (_) {}
    return count;
  }

  /// Key holding the last-seen broadcast timestamp for a project.
  static String _broadcastSeenKey(String projectId) =>
      'helploop_broadcast_seen_at_$projectId';

  /// Fetches the newest broadcast timestamp for the project, if any.
  static Future<DateTime?> _latestBroadcastTime() async {
    final config = instance.config;
    final uri = Uri.parse('${config.apiUrl}/broadcasts');
    final response = await http.get(uri, headers: {
      'X-Project-ID': config.projectId,
      'X-API-Key': config.apiKey,
    });
    if (response.statusCode != 200) return null;
    final data = jsonDecode(response.body);
    final list = (data['broadcasts'] as List?) ?? [];
    DateTime? latest;
    for (final b in list) {
      final sentAt = (b as Map)['sent_at'] as String?;
      if (sentAt == null) continue;
      final t = DateTime.tryParse(sentAt);
      if (t != null && (latest == null || t.isAfter(latest))) latest = t;
    }
    return latest;
  }

  /// Whether a broadcast exists that the user has not seen yet.
  static Future<bool> _hasUnseenBroadcast() async {
    final latest = await _latestBroadcastTime();
    if (latest == null) return false;
    final prefs = await SharedPreferences.getInstance();
    final seenStr =
        prefs.getString(_broadcastSeenKey(instance.config.projectId));
    final seen = seenStr != null ? DateTime.tryParse(seenStr) : null;
    return seen == null || latest.isAfter(seen);
  }

  /// Marks all broadcasts as seen (call when the chat is opened).
  static Future<void> markBroadcastsSeen() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _broadcastSeenKey(instance.config.projectId),
        DateTime.now().toUtc().toIso8601String(),
      );
    } catch (_) {}
  }

  static final StreamController<int> _unreadController =
      StreamController<int>.broadcast();

  /// Live unread-count stream: emits the current count on listen, then
  /// re-emits whenever [refreshUnreadCount] is called.
  static Stream<int> get unreadCountStream async* {
    yield await getUnreadCount();
    yield* _unreadController.stream;
  }

  static Stream<int> onUnreadCountChanged() => unreadCountStream;

  /// Re-fetches the unread count and pushes it to [unreadCountStream].
  /// Call when the chat is closed so badges clear promptly.
  static Future<void> refreshUnreadCount() async {
    try {
      _unreadController.add(await getUnreadCount());
    } catch (_) {}
  }

  static Future<void> registerDeviceToken({required String token, required String platform}) async {}
  static Future<void> unregisterDeviceToken(String token) async {}
  
  @Deprecated('Use HelpLoopWidget instead')
  static void open(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const Scaffold(body: HelpLoopWidget())),
    );
  }
}

/// A drop-in widget that renders the web-based HelpLoop chat interface.
class HelpLoopWidget extends StatefulWidget {
  const HelpLoopWidget({super.key});

  @override
  State<HelpLoopWidget> createState() => _HelpLoopWidgetState();
}

class _HelpLoopWidgetState extends State<HelpLoopWidget> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    // Opening the chat clears the broadcast-unseen flag and refreshes badges.
    HelpLoop.markBroadcastsSeen();
    HelpLoop.refreshUnreadCount();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'HelpLoopChannel',
        onMessageReceived: (JavaScriptMessage message) async {
          try {
            final data = jsonDecode(message.message);
            if (data['email'] != null) {
               final prefs = await SharedPreferences.getInstance();
               await prefs.setString('helploop_guest_identity', message.message);
               HelpLoop.identify(
                 externalId: 'guest',
                 email: data['email'],
                 name: data['name'],
               );
            }
          } catch (_) {}
        },
      )
      ..loadRequest(HelpLoop.getWidgetUri());
  }

  @override
  void dispose() {
    // Chat closed: refresh the unread badge so it reflects what was read.
    HelpLoop.refreshUnreadCount();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: true,
      top: false, // Let the app's Scaffold handle the top safe area if it wants to
      child: WebViewWidget(controller: _controller),
    );
  }
}

enum IdentifierType { email, externalId, anonymous }
