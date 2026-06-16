import { useState, useEffect, useCallback, useRef } from 'react';
import { SupportHub } from '../SupportHub';
import type { Message } from '../models/types';

/**
 * Hook for managing messages within a single conversation.
 * Automatically polls for new messages every 30s.
 *
 * ```tsx
 * const { messages, loading, sendMessage, loadMore } = useMessages(conversationId);
 * ```
 */
export function useMessages(conversationId: string): {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  sendMessage: (content: string, contentType?: string) => Promise<Message | null>;
  markAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const pageRef = useRef<number>(1);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef<boolean>(true);

  /** Fetch the first page of messages. */
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setError(null);
      const api = SupportHub.getInstance().getApiClient();
      const result = await api.listMessages(conversationId, 1, 50);

      if (!mountedRef.current) return;

      // Sort chronologically (oldest first) for inverted FlatList
      const sorted = result.messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      setMessages(sorted);
      setHasMore(result.hasMore);
      pageRef.current = 1;
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [conversationId]);

  /** Manually refresh messages (re-fetch first page). */
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchMessages();
  }, [fetchMessages]);

  /** Load the next page of older messages. */
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore) return;

    try {
      const nextPage = pageRef.current + 1;
      const api = SupportHub.getInstance().getApiClient();
      const result = await api.listMessages(conversationId, nextPage, 50);

      if (!mountedRef.current) return;

      // Sort older messages chronologically and prepend
      const sorted = result.messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      setMessages((prev) => {
        // Deduplicate by ID
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = sorted.filter((m) => !existingIds.has(m.id));
        return [...newMessages, ...prev];
      });

      setHasMore(result.hasMore);
      pageRef.current = nextPage;
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err);
      }
    }
  }, [conversationId, hasMore]);

  /** Send a message with optimistic update. */
  const sendMessage = useCallback(
    async (content: string, contentType: string = 'text'): Promise<Message | null> => {
      const user = SupportHub.getCurrentUser();
      if (!user || !conversationId) return null;

      // Create an optimistic message
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: Message = {
        id: optimisticId,
        conversationId,
        senderType: 'end_user',
        senderId: user.externalId,
        content,
        contentType: contentType as 'text' | 'image' | 'system',
        status: 'sent',
        createdAt: new Date().toISOString(),
      };

      // Optimistically add to the list
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const api = SupportHub.getInstance().getApiClient();
        const sentMessage = await api.sendMessage(
          conversationId,
          user.externalId,
          content,
          contentType,
        );

        if (!mountedRef.current) return sentMessage;

        // Replace the optimistic message with the real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? sentMessage : m)),
        );

        return sentMessage;
      } catch (err: any) {
        if (mountedRef.current) {
          // Remove the optimistic message on failure
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setError(err);
        }
        return null;
      }
    },
    [conversationId],
  );

  /** Mark all messages in this conversation as read. */
  const markAsRead = useCallback(async () => {
    const user = SupportHub.getCurrentUser();
    if (!user || !conversationId) return;

    try {
      const api = SupportHub.getInstance().getApiClient();
      await api.markAsRead(conversationId, user.externalId);
    } catch {
      // Silently ignore mark-as-read failures
    }
  }, [conversationId]);

  // Fetch messages on mount and when conversationId changes
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setMessages([]);
    pageRef.current = 1;

    fetchMessages();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchMessages]);

  // Poll for new messages every 30s
  useEffect(() => {
    if (!conversationId) return;

    const pollInterval = (() => {
      try {
        return SupportHub.getInstance().getPollIntervalMs();
      } catch {
        return 30000;
      }
    })();

    pollTimerRef.current = setInterval(async () => {
      if (!mountedRef.current || !conversationId) return;

      try {
        const api = SupportHub.getInstance().getApiClient();
        const result = await api.listMessages(conversationId, 1, 50);

        if (!mountedRef.current) return;

        const sorted = result.messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

        // Merge: keep optimistic messages, update existing, add new
        setMessages((prev) => {
          const optimistic = prev.filter((m) => m.id.startsWith('optimistic-'));
          const serverIds = new Set(sorted.map((m) => m.id));
          const remainingOptimistic = optimistic.filter((m) => !serverIds.has(m.id));
          return [...sorted, ...remainingOptimistic];
        });

        setHasMore(result.hasMore);
      } catch {
        // Silently ignore polling errors
      }
    }, pollInterval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [conversationId]);

  return { messages, loading, error, hasMore, loadMore, sendMessage, markAsRead, refresh };
}
