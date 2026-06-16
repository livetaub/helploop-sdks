import { ProjectSettings, SupportHubTheme } from '../models/types';

/**
 * Create a theme object from project settings.
 * Falls back to elegant dark defaults if settings are not provided.
 */
export function createTheme(settings?: ProjectSettings | null): SupportHubTheme {
  const primaryColor = settings?.brandingPrimaryColor || '#6366F1';
  const backgroundColor = settings?.brandingBgColor || '#0F172A';

  return {
    primaryColor,
    backgroundColor,
    surfaceColor: '#1E293B',
    textColor: '#F1F5F9',
    mutedTextColor: '#94A3B8',
    userBubbleColor: primaryColor,
    agentBubbleColor: '#1E293B',
    borderRadius: 16,
  };
}

/** Default theme instance (dark indigo) */
export const defaultTheme: SupportHubTheme = createTheme();
