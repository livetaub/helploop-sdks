import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Persists SDK state (anonymous ID, external user ID) using
/// [SharedPreferences].
///
/// All keys are prefixed with `supporthub_` to avoid collisions with
/// the host application.
class LocalStorage {
  static const _keyAnonymousId = 'supporthub_anonymous_id';
  static const _keyExternalId = 'supporthub_external_id';
  static const _uuid = Uuid();

  SharedPreferences? _prefs;

  /// Ensures SharedPreferences is initialised.
  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // ── Anonymous ID ──────────────────────────────────────────────────

  /// Returns the stored anonymous device ID, generating and persisting
  /// a new one if none exists.
  Future<String> getAnonymousId() async {
    final prefs = await _getPrefs();
    var id = prefs.getString(_keyAnonymousId);
    if (id == null || id.isEmpty) {
      id = _uuid.v4();
      await prefs.setString(_keyAnonymousId, id);
    }
    return id;
  }

  /// Overwrites the anonymous ID with the given [id].
  Future<void> setAnonymousId(String id) async {
    final prefs = await _getPrefs();
    await prefs.setString(_keyAnonymousId, id);
  }

  /// Removes the anonymous ID.
  Future<void> clearAnonymousId() async {
    final prefs = await _getPrefs();
    await prefs.remove(_keyAnonymousId);
  }

  // ── External (authenticated) ID ───────────────────────────────────

  /// Returns the stored external user ID, or `null` if not set.
  Future<String?> getExternalId() async {
    final prefs = await _getPrefs();
    return prefs.getString(_keyExternalId);
  }

  /// Stores the current user's external ID.
  Future<void> setExternalId(String id) async {
    final prefs = await _getPrefs();
    await prefs.setString(_keyExternalId, id);
  }

  /// Removes the external user ID.
  Future<void> clearExternalId() async {
    final prefs = await _getPrefs();
    await prefs.remove(_keyExternalId);
  }

  // ── Clear all ─────────────────────────────────────────────────────

  /// Removes all SupportHub-related preferences.
  Future<void> clearAll() async {
    await Future.wait([
      clearAnonymousId(),
      clearExternalId(),
    ]);
  }
}
