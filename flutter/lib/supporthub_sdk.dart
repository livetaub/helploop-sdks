/// SupportHub SDK — Drop-in support messaging for Flutter apps.
///
/// Add instant support messaging to any Flutter app in minutes.
///
/// ## Quick Start
///
/// ```dart
/// // 1. Initialize in main.dart
/// await SupportHub.initialize(
///   projectId: 'your-project-id',
///   apiKey: 'your-api-key',
/// );
///
/// // 2. Identify the user
/// await SupportHub.identify(
///   externalId: 'user@example.com',
///   email: 'user@example.com',
///   name: 'Jane Doe',
/// );
///
/// // 3. Open the messaging screen
/// SupportHub.open(context);
/// ```
library supporthub_sdk;

export 'src/supporthub.dart';
export 'src/config.dart';
export 'src/models/user_identity.dart';
export 'src/models/conversation.dart';
export 'src/models/message.dart';
export 'src/models/attachment.dart';
export 'src/models/project_settings.dart';
export 'src/widgets/unread_badge.dart';
