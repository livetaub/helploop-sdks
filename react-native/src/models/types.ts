// ─── SDK Configuration ───────────────────────────────────────────────
export interface SupportHubConfig {
  /** Your SupportHub project ID */
  projectId: string;
  /** Your SupportHub API key */
  apiKey: string;
  /** Custom API base URL (defaults to Supabase edge function URL) */
  apiUrl?: string;
  /** Polling interval in milliseconds for unread counts & messages (default: 30000) */
  pollIntervalMs?: number;
}

// ─── User Identity ──────────────────────────────────────────────────
export interface UserIdentity {
  externalId: string;
  identifierType?: 'email' | 'device' | 'custom' | 'anonymous';
  email?: string;
  name?: string;
  company?: string;
  subscriptionTier?: string;
  metadata?: Record<string, any>;
}

// ─── Conversation ───────────────────────────────────────────────────
export interface Conversation {
  id: string;
  subject?: string;
  status: 'new' | 'open' | 'pending' | 'waiting_for_user' | 'resolved' | 'closed';
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadUserCount: number;
  createdAt: string;
}

// ─── Message ────────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversationId: string;
  senderType: 'end_user' | 'agent' | 'system';
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'system';
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  readAt?: string;
  attachments?: Attachment[];
}

// ─── Attachment ─────────────────────────────────────────────────────
export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
}

// ─── Project Settings ───────────────────────────────────────────────
export interface ProjectSettings {
  widgetTitle: string;
  welcomeMessage: string;
  brandingPrimaryColor: string;
  brandingBgColor: string;
  showReadIndicators: boolean;
  autoResponseEnabled: boolean;
  autoResponseMessage: string;
}

// ─── Theme ──────────────────────────────────────────────────────────
export interface SupportHubTheme {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  userBubbleColor: string;
  agentBubbleColor: string;
  borderRadius: number;
}

// ─── API Response Types ─────────────────────────────────────────────
export interface PaginatedMessages {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ─── Error ──────────────────────────────────────────────────────────
export class SupportHubError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 0, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'SupportHubError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
