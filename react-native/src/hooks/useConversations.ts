import { useState, useEffect, useCallback } from 'react';
import { SupportHub } from '../SupportHub';
import type { Conversation } from '../models/types';

/**
 * Hook for fetching and managing conversations.
 *
 * ```tsx
 * const { conversations, loading, error, refresh, createConversation } = useConversations();
 * ```
 */
export function useConversations(): {
  conversations: Conversation[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createConversation: (message: string, subject?: string) => Promise<Conversation | null>;
} {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /** Fetch the conversations list for the current user. */
  const fetchConversations = useCallback(async () => {
    const user = SupportHub.getCurrentUser();
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const api = SupportHub.getInstance().getApiClient();
      const list = await api.listConversations(user.externalId);

      // Sort by most recent message first
      list.sort((a, b) => {
        const dateA = a.lastMessageAt || a.createdAt;
        const dateB = b.lastMessageAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setConversations(list);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Manually refresh the conversations list. */
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchConversations();
  }, [fetchConversations]);

  /** Create a new conversation with an initial message, then refresh the list. */
  const createConversation = useCallback(
    async (message: string, subject?: string): Promise<Conversation | null> => {
      const user = SupportHub.getCurrentUser();
      if (!user) {
        setError(new Error('User must be identified before creating a conversation.'));
        return null;
      }

      try {
        setError(null);
        const api = SupportHub.getInstance().getApiClient();
        const conversation = await api.createConversation(user.externalId, message, subject);

        // Prepend the new conversation to the list
        setConversations((prev) => [conversation, ...prev]);

        return conversation;
      } catch (err: any) {
        setError(err);
        return null;
      }
    },
    [],
  );

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, error, refresh, createConversation };
}
