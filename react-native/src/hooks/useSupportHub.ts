import { useState, useEffect } from 'react';
import { SupportHub } from '../SupportHub';
import { UserIdentity, ProjectSettings } from '../models/types';

/**
 * Main hook for accessing SupportHub state.
 *
 * ```tsx
 * const { isInitialized, currentUser, settings } = useSupportHub();
 * ```
 */
export function useSupportHub(): {
  isInitialized: boolean;
  currentUser: UserIdentity | null;
  settings: ProjectSettings | null;
} {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(null);
  const [settings, setSettings] = useState<ProjectSettings | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const hub = SupportHub.getInstance();
        if (!mounted) return;

        setIsInitialized(true);
        setCurrentUser(SupportHub.getCurrentUser());

        try {
          const projectSettings = await SupportHub.getSettings();
          if (mounted) {
            setSettings(projectSettings);
          }
        } catch {
          // Settings fetch failure is non-fatal
        }
      } catch {
        // SDK not initialized yet
        if (mounted) {
          setIsInitialized(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return { isInitialized, currentUser, settings };
}
