/// Represents a user identity for the SupportHub system.
///
/// Used when calling [SupportHub.identify] to upsert the current user
/// in the SupportHub backend.
class UserIdentity {
  /// A unique external identifier for this user (e.g. email, UUID).
  final String externalId;

  /// The type of identifier — typically `'email'` or `'device_id'`.
  final String identifierType;

  /// The user's email address.
  final String? email;

  /// The user's display name.
  final String? name;

  /// The user's company or organisation.
  final String? company;

  /// The user's subscription tier (e.g. `'free'`, `'pro'`, `'enterprise'`).
  final String? subscriptionTier;

  /// Arbitrary metadata attached to this user.
  final Map<String, dynamic>? metadata;

  /// Creates a new [UserIdentity].
  const UserIdentity({
    required this.externalId,
    this.identifierType = 'email',
    this.email,
    this.name,
    this.company,
    this.subscriptionTier,
    this.metadata,
  });

  /// Creates a [UserIdentity] from a JSON map.
  factory UserIdentity.fromJson(Map<String, dynamic> json) {
    return UserIdentity(
      externalId: json['external_id'] as String,
      identifierType:
          (json['identifier_type'] as String?) ?? 'email',
      email: json['email'] as String?,
      name: json['name'] as String?,
      company: json['company'] as String?,
      subscriptionTier: json['subscription_tier'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  /// Serialises this identity to a JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'external_id': externalId,
      'identifier_type': identifierType,
      if (email != null) 'email': email,
      if (name != null) 'name': name,
      if (company != null) 'company': company,
      if (subscriptionTier != null) 'subscription_tier': subscriptionTier,
      if (metadata != null) 'metadata': metadata,
    };
  }

  @override
  String toString() => 'UserIdentity(externalId: $externalId, name: $name)';
}
