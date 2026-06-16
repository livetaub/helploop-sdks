import {
  SupportHubConfig,
  UserIdentity,
  Conversation,
  Message,
  Attachment,
  ProjectSettings,
  PaginatedMessages,
  SupportHubError,
} from '../models/types';
import { resolveApiUrl } from '../config';

/**
 * Fetch-based HTTP client for the SupportHub REST API.
 * Handles authentication, request formatting, and response parsing.
 */
export class ApiClient {
  private baseUrl: string;
  private projectId: string;
  private apiKey: string;

  constructor(config: SupportHubConfig) {
    this.baseUrl = resolveApiUrl(config);
    this.projectId = config.projectId;
    this.apiKey = config.apiKey;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /** Build default headers for JSON requests. */
  private get defaultHeaders(): Record<string, string> {
    return {
      'X-Project-ID': this.projectId,
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /** Build auth-only headers (no Content-Type, for multipart). */
  private get authHeaders(): Record<string, string> {
    return {
      'X-Project-ID': this.projectId,
      'X-API-Key': this.apiKey,
    };
  }

  /**
   * Generic JSON request handler.
   * @throws SupportHubError on non-OK responses.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, any>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: this.defaultHeaders,
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (err: any) {
      throw new SupportHubError(
        `Network request failed: ${err.message}`,
        0,
        'NETWORK_ERROR',
      );
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorCode = 'API_ERROR';
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.error || errorBody.message || errorMessage;
        errorCode = errorBody.code || errorCode;
      } catch {
        // Ignore JSON parse failure on error response
      }
      throw new SupportHubError(errorMessage, response.status, errorCode);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    try {
      return await response.json();
    } catch {
      return undefined as unknown as T;
    }
  }

  // ─── User Endpoints ─────────────────────────────────────────────────

  /**
   * Identify (create or update) a user.
   * Maps camelCase fields to snake_case for the API.
   */
  async identifyUser(identity: UserIdentity): Promise<any> {
    const body: Record<string, any> = {
      external_id: identity.externalId,
    };

    if (identity.identifierType) body.identifier_type = identity.identifierType;
    if (identity.email) body.email = identity.email;
    if (identity.name) body.name = identity.name;
    if (identity.company) body.company = identity.company;
    if (identity.subscriptionTier) body.subscription_tier = identity.subscriptionTier;
    if (identity.metadata) body.metadata = identity.metadata;

    return this.request<any>('POST', '/users/identify', body);
  }

  /** Fetch a user by external ID. */
  async getUser(externalId: string): Promise<any> {
    return this.request<any>('GET', `/users/${encodeURIComponent(externalId)}`);
  }

  // ─── Conversation Endpoints ─────────────────────────────────────────

  /** Create a new conversation with an initial message. */
  async createConversation(
    externalUserId: string,
    message: string,
    subject?: string,
  ): Promise<Conversation> {
    const body: Record<string, any> = {
      external_user_id: externalUserId,
      initial_message: message,
    };
    if (subject) body.subject = subject;

    const raw = await this.request<any>('POST', '/conversations', body);
    return this.mapConversation(raw);
  }

  /** List all conversations for a user. */
  async listConversations(externalUserId: string): Promise<Conversation[]> {
    const raw = await this.request<any[]>(
      'GET',
      `/conversations?external_user_id=${encodeURIComponent(externalUserId)}`,
    );
    return (raw || []).map((c: any) => this.mapConversation(c));
  }

  /** Get a single conversation by ID. */
  async getConversation(id: string): Promise<Conversation> {
    const raw = await this.request<any>('GET', `/conversations/${id}`);
    return this.mapConversation(raw);
  }

  // ─── Message Endpoints ──────────────────────────────────────────────

  /** List messages for a conversation with pagination. */
  async listMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedMessages> {
    const raw = await this.request<any>(
      'GET',
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    );

    return {
      messages: (raw.messages || raw.data || []).map((m: any) => this.mapMessage(m)),
      total: raw.total || 0,
      hasMore: raw.has_more ?? raw.hasMore ?? false,
    };
  }

  /** Send a message to a conversation. */
  async sendMessage(
    conversationId: string,
    externalUserId: string,
    content: string,
    contentType: string = 'text',
  ): Promise<Message> {
    const raw = await this.request<any>(
      'POST',
      `/conversations/${conversationId}/messages`,
      {
        external_user_id: externalUserId,
        content,
        content_type: contentType,
      },
    );
    return this.mapMessage(raw);
  }

  /** Mark all messages in a conversation as read for a user. */
  async markAsRead(conversationId: string, externalUserId: string): Promise<void> {
    await this.request<void>('PATCH', `/conversations/${conversationId}/read`, {
      external_user_id: externalUserId,
    });
  }

  // ─── Attachment Endpoints ───────────────────────────────────────────

  /**
   * Upload a file attachment.
   * Uses React Native's FormData with { uri, type, name } object.
   */
  async uploadAttachment(
    uri: string,
    fileName: string,
    mimeType: string,
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: mimeType,
      name: fileName,
    } as any);

    const url = `${this.baseUrl}/attachments/upload`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders,
        body: formData,
      });
    } catch (err: any) {
      throw new SupportHubError(
        `Upload failed: ${err.message}`,
        0,
        'UPLOAD_ERROR',
      );
    }

    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.error || errorMessage;
      } catch {
        // Ignore
      }
      throw new SupportHubError(errorMessage, response.status, 'UPLOAD_ERROR');
    }

    const raw = await response.json();
    return this.mapAttachment(raw);
  }

  // ─── Unread Endpoint ────────────────────────────────────────────────

  /** Get the unread message count for a user. */
  async getUnreadCount(externalUserId: string): Promise<number> {
    const raw = await this.request<any>(
      'GET',
      `/unread?external_user_id=${encodeURIComponent(externalUserId)}`,
    );
    return raw.unread_count ?? raw.unreadCount ?? 0;
  }

  // ─── Device Endpoints ───────────────────────────────────────────────

  /** Register a device for push notifications. */
  async registerDevice(
    externalUserId: string,
    token: string,
    platform: string,
  ): Promise<void> {
    await this.request<void>('POST', '/devices/register', {
      external_user_id: externalUserId,
      token,
      platform,
    });
  }

  /** Unregister a device token. */
  async unregisterDevice(token: string): Promise<void> {
    await this.request<void>('DELETE', `/devices/${encodeURIComponent(token)}`);
  }

  // ─── Settings Endpoint ──────────────────────────────────────────────

  /** Fetch project settings (branding, auto-response, etc). */
  async getSettings(): Promise<ProjectSettings> {
    const raw = await this.request<any>('GET', '/settings');
    return {
      widgetTitle: raw.widget_title ?? raw.widgetTitle ?? 'Support',
      welcomeMessage: raw.welcome_message ?? raw.welcomeMessage ?? '',
      brandingPrimaryColor: raw.branding_primary_color ?? raw.brandingPrimaryColor ?? '#6366F1',
      brandingBgColor: raw.branding_bg_color ?? raw.brandingBgColor ?? '#0F172A',
      showReadIndicators: raw.show_read_indicators ?? raw.showReadIndicators ?? true,
      autoResponseEnabled: raw.auto_response_enabled ?? raw.autoResponseEnabled ?? false,
      autoResponseMessage: raw.auto_response_message ?? raw.autoResponseMessage ?? '',
    };
  }

  // ─── Response Mappers ───────────────────────────────────────────────

  /** Map a raw API conversation object to the Conversation interface. */
  private mapConversation(raw: any): Conversation {
    return {
      id: raw.id,
      subject: raw.subject ?? undefined,
      status: raw.status ?? 'new',
      lastMessageAt: raw.last_message_at ?? raw.lastMessageAt ?? undefined,
      lastMessagePreview: raw.last_message_preview ?? raw.lastMessagePreview ?? undefined,
      unreadUserCount: raw.unread_user_count ?? raw.unreadUserCount ?? 0,
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    };
  }

  /** Map a raw API message object to the Message interface. */
  private mapMessage(raw: any): Message {
    return {
      id: raw.id,
      conversationId: raw.conversation_id ?? raw.conversationId ?? '',
      senderType: raw.sender_type ?? raw.senderType ?? 'end_user',
      senderId: raw.sender_id ?? raw.senderId ?? '',
      content: raw.content ?? '',
      contentType: raw.content_type ?? raw.contentType ?? 'text',
      status: raw.status ?? 'sent',
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
      readAt: raw.read_at ?? raw.readAt ?? undefined,
      attachments: raw.attachments
        ? raw.attachments.map((a: any) => this.mapAttachment(a))
        : undefined,
    };
  }

  /** Map a raw API attachment object to the Attachment interface. */
  private mapAttachment(raw: any): Attachment {
    return {
      id: raw.id,
      fileName: raw.file_name ?? raw.fileName ?? 'attachment',
      fileType: raw.file_type ?? raw.fileType ?? 'application/octet-stream',
      fileSize: raw.file_size ?? raw.fileSize ?? 0,
      url: raw.url ?? '',
    };
  }
}
