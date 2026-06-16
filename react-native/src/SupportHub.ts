import { SupportHubConfig, UserIdentity, ProjectSettings, SupportHubError } from './models/types';
import { ApiClient } from './api/client';
import { SupportHubStorage } from './storage/storage';
import { DEFAULT_CONFIG } from './config';

/**
 * Main SupportHub SDK class (singleton).
 *
 * Usage:
 * ```ts
 * await SupportHub.initialize({ projectId: '...', apiKey: '...' });
 * await SupportHub.identify({ externalId: 'user-123', name: 'John' });
 * ```
 */
export class SupportHub {
  private static instance: SupportHub | null = null;

  private config: SupportHubConfig;
  private apiClient: ApiClient;
  private currentUser: UserIdentity | null = null;
  private settings: ProjectSettings | null = null;
  private pollIntervalMs: number;
  private unreadPollTimer: ReturnType<typeof setInterval> | null = null;
  private unreadListeners: Set<(count: number) => void> = new Set();
  private lastUnreadCount: number = 0;

  // ─── Constructor ────────────────────────────────────────────────────

  private constructor(config: SupportHubConfig) {
    this.config = config;
    this.apiClient = new ApiClient(config);
    this.pollIntervalMs = config.pollIntervalMs || DEFAULT_CONFIG.pollIntervalMs;
  }

  // ─── Initialization ─────────────────────────────────────────────────

  /**
   * Initialize the SupportHub SDK.
   * Must be called once before any other SDK method.
   * Fetches and caches project settings.
   */
  static async initialize(config: SupportHubConfig): Promise<void> {
    if (!config.projectId || !config.apiKey) {
      throw new SupportHubError(
        'projectId and apiKey are required',
        0,
        'INVALID_CONFIG',
      );
    }

    SupportHub.instance = new SupportHub(config);

    // Pre-fetch settings (non-blocking — cache for later use)
    try {
      await SupportHub.instance.fetchSettings();
    } catch {
      // Settings fetch failure is non-fatal during init
    }

    // Restore previous user session from storage
    try {
      const storedId = await SupportHubStorage.getExternalId();
      if (storedId) {
        SupportHub.instance.currentUser = { externalId: storedId };
        SupportHub.instance.startUnreadPolling();
      }
    } catch {
      // Storage failure is non-fatal
    }
  }

  /**
   * Get the singleton instance.
   * @throws SupportHubError if not initialized.
   */
  static getInstance(): SupportHub {
    if (!SupportHub.instance) {
      throw new SupportHubError(
        'SupportHub not initialized. Call SupportHub.initialize() first.',
        0,
        'NOT_INITIALIZED',
      );
    }
    return SupportHub.instance;
  }

  /** Get the underlying API client. Used internally by hooks and screens. */
  getApiClient(): ApiClient {
    return this.apiClient;
  }

  /** Get the configured polling interval in milliseconds. */
  getPollIntervalMs(): number {
    return this.pollIntervalMs;
  }

  // ─── User Identity ──────────────────────────────────────────────────

  /**
   * Identify a known user. Sends identity to the API and starts
   * polling for unread messages.
   */
  static async identify(identity: UserIdentity): Promise<void> {
    const hub = SupportHub.getInstance();

    if (!identity.externalId) {
      throw new SupportHubError(
        'externalId is required for identify()',
        0,
        'INVALID_IDENTITY',
      );
    }

    // Send identity to API
    try {
      await hub.apiClient.identifyUser(identity);
    } catch (err) {
      // Log but don't block — user can still use cached data
      console.warn('[SupportHub] Failed to identify user:', err);
    }

    hub.currentUser = identity;

    // Persist for session restore
    await SupportHubStorage.setExternalId(identity.externalId);
    await SupportHubStorage.setUserIdentity(identity as Record<string, any>);

    // Start polling for unread messages
    hub.startUnreadPolling();
  }

  /**
   * Identify an anonymous user.
   * Generates a persistent anonymous ID stored in AsyncStorage.
   */
  static async identifyAnonymous(): Promise<void> {
    const anonymousId = await SupportHubStorage.getAnonymousId();

    await SupportHub.identify({
      externalId: anonymousId,
      identifierType: 'anonymous',
    });
  }

  /** Get the currently identified user, or null if not identified. */
  static getCurrentUser(): UserIdentity | null {
    if (!SupportHub.instance) return null;
    return SupportHub.instance.currentUser;
  }

  // ─── Unread Count ───────────────────────────────────────────────────

  /** Fetch the current unread message count. */
  static async getUnreadCount(): Promise<number> {
    const hub = SupportHub.getInstance();

    if (!hub.currentUser) {
      return 0;
    }

    try {
      const count = await hub.apiClient.getUnreadCount(hub.currentUser.externalId);
      hub.lastUnreadCount = count;
      return count;
    } catch {
      return hub.lastUnreadCount;
    }
  }

  /**
   * Subscribe to unread count changes.
   * The listener is called whenever the polled unread count changes.
   * @returns An unsubscribe function.
   */
  static onUnreadCountChanged(listener: (count: number) => void): () => void {
    const hub = SupportHub.getInstance();
    hub.unreadListeners.add(listener);

    // Immediately notify with current value
    listener(hub.lastUnreadCount);

    return () => {
      hub.unreadListeners.delete(listener);
    };
  }

  // ─── Device Registration ────────────────────────────────────────────

  /** Register a device push notification token. */
  static async registerDeviceToken(
    token: string,
    platform: 'android' | 'ios',
  ): Promise<void> {
    const hub = SupportHub.getInstance();

    if (!hub.currentUser) {
      throw new SupportHubError(
        'User must be identified before registering a device token.',
        0,
        'NOT_IDENTIFIED',
      );
    }

    await hub.apiClient.registerDevice(hub.currentUser.externalId, token, platform);
  }

  /** Unregister a device push notification token. */
  static async unregisterDeviceToken(token: string): Promise<void> {
    const hub = SupportHub.getInstance();
    await hub.apiClient.unregisterDevice(token);
  }

  // ─── Settings ───────────────────────────────────────────────────────

  /**
   * Get project settings (branding, auto-response config).
   * Returns cached settings if available, otherwise fetches from API.
   */
  static async getSettings(): Promise<ProjectSettings> {
    const hub = SupportHub.getInstance();
    if (hub.settings) {
      return hub.settings;
    }
    return hub.fetchSettings();
  }

  /** Fetch settings from API and cache locally. */
  private async fetchSettings(): Promise<ProjectSettings> {
    try {
      this.settings = await this.apiClient.getSettings();
      await SupportHubStorage.cacheSettings(this.settings as Record<string, any>);
      return this.settings;
    } catch {
      // Try loading from cache
      const cached = await SupportHubStorage.getCachedSettings();
      if (cached) {
        this.settings = cached as unknown as ProjectSettings;
        return this.settings;
      }
      // Return defaults
      this.settings = {
        widgetTitle: 'Support',
        welcomeMessage: 'Hi! How can we help you today?',
        brandingPrimaryColor: '#6366F1',
        brandingBgColor: '#0F172A',
        showReadIndicators: true,
        autoResponseEnabled: false,
        autoResponseMessage: '',
      };
      return this.settings;
    }
  }

  // ─── Logout ─────────────────────────────────────────────────────────

  /**
   * Logout the current user.
   * Stops polling, clears storage, and resets all state.
   */
  static async logout(): Promise<void> {
    if (!SupportHub.instance) return;

    const hub = SupportHub.instance;
    hub.stopUnreadPolling();
    hub.currentUser = null;
    hub.settings = null;
    hub.lastUnreadCount = 0;
    hub.unreadListeners.clear();

    await SupportHubStorage.clear();

    SupportHub.instance = null;
  }

  // ─── Polling ────────────────────────────────────────────────────────

  /** Start polling for unread count at the configured interval. */
  private startUnreadPolling(): void {
    // Don't start duplicate timers
    this.stopUnreadPolling();

    if (!this.currentUser) return;

    this.unreadPollTimer = setInterval(async () => {
      if (!this.currentUser) {
        this.stopUnreadPolling();
        return;
      }

      try {
        const count = await this.apiClient.getUnreadCount(this.currentUser.externalId);
        if (count !== this.lastUnreadCount) {
          this.lastUnreadCount = count;
          this.notifyUnreadListeners(count);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, this.pollIntervalMs);
  }

  /** Stop the unread count polling timer. */
  private stopUnreadPolling(): void {
    if (this.unreadPollTimer) {
      clearInterval(this.unreadPollTimer);
      this.unreadPollTimer = null;
    }
  }

  /** Notify all registered unread count listeners. */
  private notifyUnreadListeners(count: number): void {
    this.unreadListeners.forEach((listener) => {
      try {
        listener(count);
      } catch {
        // Don't let a bad listener break others
      }
    });
  }
}
