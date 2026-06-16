// ─── SupportHub React Native SDK ─────────────────────────────────────
// Main entry point — re-exports all public API surface.

// Core
export { SupportHub } from './SupportHub';

// Screens
export { MessagingScreen } from './screens/MessagingScreen';
export { ConversationListScreen } from './screens/ConversationListScreen';

// Components
export { UnreadBadge } from './components/UnreadBadge';
export { MessageBubble } from './components/MessageBubble';
export { DateSeparator } from './components/DateSeparator';
export { ReplyInput } from './components/ReplyInput';
export { AttachmentPreview } from './components/AttachmentPreview';
export { LoadingIndicator } from './components/LoadingIndicator';

// Hooks
export { useSupportHub } from './hooks/useSupportHub';
export { useUnreadCount } from './hooks/useUnreadCount';
export { useConversations } from './hooks/useConversations';
export { useMessages } from './hooks/useMessages';

// Theme
export { createTheme, defaultTheme } from './theme/theme';

// Types
export type {
  SupportHubConfig,
  UserIdentity,
  Conversation,
  Message,
  Attachment,
  ProjectSettings,
  SupportHubTheme,
  PaginatedMessages,
  UnreadCountResponse,
} from './models/types';
export { SupportHubError } from './models/types';
