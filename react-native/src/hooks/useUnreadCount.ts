import { useState, useEffect, useCallback } from 'react';
import { SupportHub } from '../SupportHub';

/**
 * Hook that tracks the unread message count with automatic polling.
 *
 * ```tsx
 * const { count, loading, refresh } = useUnreadCount();
 * ```
 */
export function useUnreadCount(): {
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  /** Manually refresh the unread count. */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const unread = await SupportHub.getUnreadCount();
      setCount(unread);
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial fetch
    const fetchInitial = async () => {
      try {
        const unread = await SupportHub.getUnreadCount();
        if (mounted) {
          setCount(unread);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchInitial();

    // Subscribe to changes from polling
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = SupportHub.onUnreadCountChanged((newCount) => {
        if (mounted) {
          setCount(newCount);
        }
      });
    } catch {
      // SDK may not be initialized
    }

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { count, loading, refresh };
}
