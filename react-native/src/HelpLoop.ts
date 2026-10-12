import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HelpLoopConfig {
  projectId: string;
  apiKey: string;
  apiUrl: string;
  widgetUrl?: string;
  appVersion?: string;
}

export interface UserIdentity {
  externalId: string;
  identifierType: string;
  email?: string;
  name?: string;
}

const DEFAULT_WIDGET_URL = 'https://web-black-five-25.vercel.app';

export class HelpLoop {
  private static instance: HelpLoop | null = null;
  private config: HelpLoopConfig;
  private currentUser: UserIdentity | null = null;

  private constructor(config: HelpLoopConfig) {
    this.config = config;
    if (!this.config.widgetUrl) {
      this.config.widgetUrl = DEFAULT_WIDGET_URL;
    }
  }

  static async initialize(config: HelpLoopConfig): Promise<void> {
    HelpLoop.instance = new HelpLoop(config);
  }

  static hasIdentity(): boolean {
    return !!HelpLoop.instance?.currentUser;
  }

  static async identify(user: { externalId: string; email?: string; name?: string; identifierType?: string }): Promise<void> {
    if (!HelpLoop.instance) throw new Error('HelpLoop not initialized');
    HelpLoop.instance.currentUser = {
      externalId: user.externalId,
      identifierType: user.identifierType || 'email',
      email: user.email,
      name: user.name,
    };
  }

  static async identifyAnonymous(): Promise<void> {
    if (!HelpLoop.instance) throw new Error('HelpLoop not initialized');
    HelpLoop.instance.currentUser = {
      externalId: 'guest',
      identifierType: 'anonymous',
    };
  }

  static async logout(): Promise<void> {
    if (HelpLoop.instance) {
      const projectId = HelpLoop.instance.config.projectId;
      HelpLoop.instance.currentUser = null;
      try {
        await AsyncStorage.removeItem(HelpLoop.broadcastSeenKey(projectId));
      } catch (e) {
        // Ignore errors
      }
    }
  }

  static getWidgetUrl(): string {
    if (!HelpLoop.instance) throw new Error('HelpLoop not initialized');
    const config = HelpLoop.instance.config;
    const user = HelpLoop.instance.currentUser;

    const params = new URLSearchParams({
      projectId: config.projectId,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
    });

    if (config.appVersion) {
      params.append('appVersion', config.appVersion);
    }

    if (user) {
      if (user.externalId !== 'guest') {
        params.append('externalId', user.externalId);
      }
      if (user.email) {
        params.append('email', user.email);
      }
      if (user.name) {
        params.append('name', user.name);
      }
    }

    return `${config.widgetUrl}?${params.toString()}`;
  }

  static async getUnreadCount(): Promise<number> {
    let count = 0;
    if (!HelpLoop.instance) return 0;
    const config = HelpLoop.instance.config;
    const user = HelpLoop.instance.currentUser;

    if (user && user.externalId !== 'guest') {
      try {
        const response = await fetch(`${config.apiUrl}/unread?external_user_id=${user.externalId}`, {
          headers: {
            'X-Project-ID': config.projectId,
            'X-API-Key': config.apiKey,
          },
        });
        if (response.ok) {
          const data = await response.json();
          count = data.unread_count || 0;
        }
      } catch (e) {
        // Ignore errors
      }
    }

    // Broadcasts are render-only (no conversation rows), so they are tracked
    // client-side: any broadcast newer than the last-seen timestamp counts
    // as one unread item.
    try {
      if (await HelpLoop.hasUnseenBroadcast()) count += 1;
    } catch (e) {
      // Ignore errors
    }
    return count;
  }

  private static broadcastSeenKey(projectId: string): string {
    return `@helploop_broadcast_seen_at_${projectId}`;
  }

  private static async latestBroadcastTime(): Promise<number | null> {
    if (!HelpLoop.instance) return null;
    const config = HelpLoop.instance.config;
    const response = await fetch(`${config.apiUrl}/broadcasts`, {
      headers: {
        'X-Project-ID': config.projectId,
        'X-API-Key': config.apiKey,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const list = data.broadcasts ?? [];
    let latest: number | null = null;
    for (const b of list) {
      const t = Date.parse(b.sent_at);
      if (!isNaN(t) && (latest === null || t > latest)) latest = t;
    }
    return latest;
  }

  /// Whether a broadcast exists that the user has not seen yet.
  static async hasUnseenBroadcast(): Promise<boolean> {
    if (!HelpLoop.instance) return false;
    try {
      const latest = await HelpLoop.latestBroadcastTime();
      if (latest === null) return false;
      const seenStr = await AsyncStorage.getItem(
        HelpLoop.broadcastSeenKey(HelpLoop.instance.config.projectId)
      );
      const seen = seenStr ? parseInt(seenStr, 10) : NaN;
      return isNaN(seen) || latest > seen;
    } catch (e) {
      return false;
    }
  }

  /// Marks all broadcasts as seen (call when the chat is opened).
  static async markBroadcastsSeen(): Promise<void> {
    if (!HelpLoop.instance) return;
    try {
      await AsyncStorage.setItem(
        HelpLoop.broadcastSeenKey(HelpLoop.instance.config.projectId),
        String(Date.now())
      );
    } catch (e) {
      // Ignore errors
    }
  }

  private static unreadListeners = new Set<(count: number) => void>();

  /// Subscribes to unread-count updates. Returns an unsubscribe function.
  static subscribeUnread(listener: (count: number) => void): () => void {
    HelpLoop.unreadListeners.add(listener);
    return () => {
      HelpLoop.unreadListeners.delete(listener);
    };
  }

  /// Re-fetches the unread count and notifies all subscribers.
  /// Call when the chat is closed so badges clear promptly.
  static async refreshUnreadCount(): Promise<void> {
    const count = await HelpLoop.getUnreadCount();
    HelpLoop.unreadListeners.forEach((l) => {
      try {
        l(count);
      } catch (e) {
        // Ignore listener errors
      }
    });
  }

  // Opening the chat: render the <HelpLoopWidget /> component (exported from
  // index.ts), which embeds the hosted chat page in an in-app WebView
  // (react-native-webview). This keeps the chat UI server-driven: redeploy
  // the web widget and every user sees the latest version without an app update.
}
