import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../config.dart';

/// Exception thrown when the SupportHub API returns a non-2xx response.
class SupportHubException implements Exception {
  /// HTTP status code.
  final int statusCode;

  /// Error message from the server.
  final String message;

  /// Raw response body.
  final String? body;

  /// Creates a new [SupportHubException].
  const SupportHubException({
    required this.statusCode,
    required this.message,
    this.body,
  });

  @override
  String toString() => 'SupportHubException($statusCode): $message';
}

/// HTTP client that wraps all SupportHub REST API endpoints.
///
/// Handles authentication headers, JSON serialisation, and error
/// mapping for every endpoint the SDK needs.
class ApiClient {
  final SupportHubConfig _config;
  final http.Client _http;

  /// Creates a new [ApiClient] with the given [config].
  ///
  /// Optionally accepts a custom [http.Client] for testing.
  ApiClient(this._config, {http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  // ── Helpers ───────────────────────────────────────────────────────

  String get _baseUrl => _config.apiUrl;

  Map<String, String> get _headers => {
        'X-Project-ID': _config.projectId,
        'X-API-Key': _config.apiKey,
        'Content-Type': 'application/json',
      };

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$_baseUrl$path').replace(queryParameters: query);

  /// Parses the response body and throws on non-2xx status codes.
  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }

    String message;
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      message = (body['error'] as String?) ??
          (body['message'] as String?) ??
          response.body;
    } catch (_) {
      message = response.body;
    }

    throw SupportHubException(
      statusCode: response.statusCode,
      message: message,
      body: response.body,
    );
  }

  // ── Users ─────────────────────────────────────────────────────────

  /// Upserts a user with the given identity payload.
  ///
  /// `POST /users/identify`
  Future<Map<String, dynamic>> identifyUser(
    Map<String, dynamic> identity,
  ) async {
    final response = await _http.post(
      _uri('/users/identify'),
      headers: _headers,
      body: jsonEncode(identity),
    );
    return _handleResponse(response) as Map<String, dynamic>;
  }

  /// Fetches a user by their external ID.
  ///
  /// `GET /users/:external_id`
  Future<Map<String, dynamic>> getUser(String externalId) async {
    final response = await _http.get(
      _uri('/users/${Uri.encodeComponent(externalId)}'),
      headers: _headers,
    );
    return _handleResponse(response) as Map<String, dynamic>;
  }

  // ── Conversations ─────────────────────────────────────────────────

  /// Creates a new conversation with an initial message.
  ///
  /// `POST /conversations`
  Future<Map<String, dynamic>> createConversation(
    String externalUserId,
    String message, {
    String? subject,
  }) async {
    final response = await _http.post(
      _uri('/conversations'),
      headers: _headers,
      body: jsonEncode({
        'external_user_id': externalUserId,
        'message': message,
        if (subject != null) 'subject': subject,
      }),
    );
    return _handleResponse(response) as Map<String, dynamic>;
  }

  /// Lists all conversations for the given user.
  ///
  /// `GET /conversations?external_user_id=X`
  Future<List<dynamic>> listConversations(String externalUserId) async {
    final response = await _http.get(
      _uri('/conversations', {'external_user_id': externalUserId}),
      headers: _headers,
    );
    final result = _handleResponse(response);
    if (result is List) return result;
    if (result is Map && result.containsKey('data')) {
      return result['data'] as List<dynamic>;
    }
    return [];
  }

  /// Fetches a single conversation by ID.
  ///
  /// `GET /conversations/:id`
  Future<Map<String, dynamic>> getConversation(
    String conversationId,
  ) async {
    final response = await _http.get(
      _uri('/conversations/$conversationId'),
      headers: _headers,
    );
    return _handleResponse(response) as Map<String, dynamic>;
  }

  /// Lists messages in a conversation with pagination.
  ///
  /// `GET /conversations/:id/messages?page=1&limit=50`
  Future<List<dynamic>> listMessages(
    String conversationId, {
    int page = 1,
    int limit = 50,
  }) async {
    final response = await _http.get(
      _uri(
        '/conversations/$conversationId/messages',
        {'page': '$page', 'limit': '$limit'},
      ),
      headers: _headers,
    );
    final result = _handleResponse(response);
    if (result is List) return result;
    if (result is Map && result.containsKey('data')) {
      return result['data'] as List<dynamic>;
    }
    return [];
  }

  /// Sends a new message in a conversation.
  ///
  /// `POST /conversations/:id/messages`
  Future<Map<String, dynamic>> sendMessage(
    String conversationId,
    String externalUserId,
    String content, {
    String contentType = 'text',
  }) async {
    final response = await _http.post(
      _uri('/conversations/$conversationId/messages'),
      headers: _headers,
      body: jsonEncode({
        'external_user_id': externalUserId,
        'content': content,
        'content_type': contentType,
      }),
    );
    return _handleResponse(response) as Map<String, dynamic>;
  }

  /// Marks all messages in a conversation as read.
  ///
  /// `PATCH /conversations/:id/read`
  Future<void> markAsRead(
    String conversationId,
    String externalUserId,
  ) async {
    final response = await _http.patch(
      _uri('/conversations/$conversationId/read'),
      headers: _headers,
      body: jsonEncode({'external_user_id': externalUserId}),
    );
    _handleResponse(response);
  }

  // ── Attachments ───────────────────────────────────────────────────

  /// Uploads an image attachment.
  ///
  /// `POST /attachments/upload`
  Future<Map<String, dynamic>> uploadAttachment(
    Uint8List bytes,
    String fileName,
    String mimeType,
  ) async {
    final request = http.MultipartRequest('POST', _uri('/attachments/upload'));
    request.headers.addAll({
      'X-Project-ID': _config.projectId,
      'X-API-Key': _config.apiKey,
    });
    request.files.add(
      http.MultipartFile.fromBytes('file', bytes,
          filename: fileName,
          contentType: _parseMediaType(mimeType)),
    );

    final streamedResponse = await _http.send(request);
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response) as Map<String, dynamic>;
  }

  /// Parses a MIME type string into a [MediaType]-compatible value.
  ///
  /// The `http` package uses `MediaType` from `http_parser`.
  static http_parser_MediaType _parseMediaType(String mimeType) {
    final parts = mimeType.split('/');
    return http_parser_MediaType(
      parts.first,
      parts.length > 1 ? parts[1] : 'octet-stream',
    );
  }

  // ── Unread Count ──────────────────────────────────────────────────

  /// Returns the number of unread messages for the given user.
  ///
  /// `GET /unread?external_user_id=X`
  Future<int> getUnreadCount(String externalUserId) async {
    final response = await _http.get(
      _uri('/unread', {'external_user_id': externalUserId}),
      headers: _headers,
    );
    final result = _handleResponse(response);
    if (result is Map) {
      return (result['unread_count'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }

  // ── Devices ───────────────────────────────────────────────────────

  /// Registers a push notification device token.
  ///
  /// `POST /devices/register`
  Future<void> registerDevice(
    String externalUserId,
    String token,
    String platform,
  ) async {
    final response = await _http.post(
      _uri('/devices/register'),
      headers: _headers,
      body: jsonEncode({
        'external_user_id': externalUserId,
        'token': token,
        'platform': platform,
      }),
    );
    _handleResponse(response);
  }

  /// Unregisters a push notification device token.
  ///
  /// `DELETE /devices/:token`
  Future<void> unregisterDevice(String token) async {
    final response = await _http.delete(
      _uri('/devices/${Uri.encodeComponent(token)}'),
      headers: _headers,
    );
    _handleResponse(response);
  }

  // ── Settings ──────────────────────────────────────────────────────

  /// Fetches the public project settings.
  ///
  /// `GET /settings`
  Future<Map<String, dynamic>> getSettings() async {
    final response = await _http.get(
      _uri('/settings'),
      headers: _headers,
    );
    return _handleResponse(response) as Map<String, dynamic>;
  }

  /// Closes the underlying HTTP client.
  void dispose() => _http.close();
}

// ---------------------------------------------------------------------------
// Minimal MediaType helper so we don't pull in the http_parser package
// just for multipart uploads.
// ---------------------------------------------------------------------------

/// A lightweight media-type representation for multipart content types.
class http_parser_MediaType implements http.BaseRequest {
  final String type;
  final String subtype;

  // ignore: use_super_parameters
  http_parser_MediaType(this.type, this.subtype);

  @override
  String toString() => '$type/$subtype';

  // This class is only used as a content-type value passed to
  // MultipartFile.fromBytes. The http package calls toString() on it.
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}
