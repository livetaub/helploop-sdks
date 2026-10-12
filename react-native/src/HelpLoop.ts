import React from 'react';

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
      HelpLoop.instance.currentUser = null;
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
    if (!HelpLoop.instance) return 0;
    const config = HelpLoop.instance.config;
    const user = HelpLoop.instance.currentUser;

    if (!user || user.externalId === 'guest') return 0;

    try {
      const response = await fetch(`${config.apiUrl}/unread?external_user_id=${user.externalId}`, {
        headers: {
          'X-Project-ID': config.projectId,
          'X-API-Key': config.apiKey,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.unread_count || 0;
      }
    } catch (e) {
      // Ignore errors
    }
    return 0;
  }

  // Opening the chat: render the <HelpLoopWidget /> component (exported from
  // index.ts), which embeds the hosted chat page in an in-app WebView
  // (react-native-webview). This keeps the chat UI server-driven: redeploy
  // the web widget and every user sees the latest version without an app update.
}
