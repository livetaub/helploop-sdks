import { SupportHubConfig } from './models/types';

/** Default configuration values */
export const DEFAULT_CONFIG: Required<Pick<SupportHubConfig, 'pollIntervalMs'>> = {
  pollIntervalMs: 30000,
};

/** Build the full API base URL from config */
export function resolveApiUrl(config: SupportHubConfig): string {
  if (config.apiUrl) {
    return config.apiUrl.replace(/\/+$/, '');
  }
  return `https://${config.projectId}.supabase.co/functions/v1/supporthub`;
}

/** Storage keys used by the SDK */
export const STORAGE_KEYS = {
  ANONYMOUS_ID: '@supporthub:anonymous_id',
  EXTERNAL_ID: '@supporthub:external_id',
  USER_IDENTITY: '@supporthub:user_identity',
  SETTINGS_CACHE: '@supporthub:settings_cache',
} as const;
