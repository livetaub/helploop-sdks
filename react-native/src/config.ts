import { HelpLoopConfig } from './models/types';

/** Default configuration values */
export const DEFAULT_CONFIG: Required<Pick<HelpLoopConfig, 'pollIntervalMs'>> = {
  pollIntervalMs: 30000,
};

/** Build the full API base URL from config */
export function resolveApiUrl(config: HelpLoopConfig): string {
  if (config.apiUrl) {
    return config.apiUrl.replace(/\/+$/, '');
  }
  return `https://${config.projectId}.supabase.co/functions/v1/helploop`;
}

/** Storage keys used by the SDK */
export const STORAGE_KEYS = {
  ANONYMOUS_ID: '@helploop:anonymous_id',
  EXTERNAL_ID: '@helploop:external_id',
  USER_IDENTITY: '@helploop:user_identity',
  SETTINGS_CACHE: '@helploop:settings_cache',
} as const;
