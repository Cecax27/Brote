import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth";
import { getAgent, type ConversationListItem } from "@/lib/agent";

type PreviewMap = Record<string, string>;

type ConversationsContextValue = {
  conversations: ConversationListItem[];
  previews: PreviewMap;
  isLoading: boolean;
  load: () => void;
  addConversation: (conv: ConversationListItem, preview?: string) => void;
  touchConversation: (id: string, preview?: string) => void;
  updateConversation: (
    id: string,
    patch: Partial<ConversationListItem>,
  ) => void;
  removeConversation: (id: string) => void;
};

const ConversationsContext =
  createContext<ConversationsContextValue | null>(null);

export function truncatePreview(content: string): string {
  return content.length > 60 ? content.slice(0, 60) + "\u2026" : content;
}

export function ConversationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? "";

  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [previews, setPreviews] = useState<PreviewMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadedRef = useRef(false);
  const inFlightRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getAgent().fetchConversations(accessToken);

      const previewMap: PreviewMap = {};
      await Promise.all(
        data.map(async (conv) => {
          try {
            const msgs = await getAgent().fetchMessages(
              conv.conversation_id,
              accessToken,
            );
            const last = msgs[msgs.length - 1];
            previewMap[conv.conversation_id] = last
              ? truncatePreview(last.content)
              : "";
          } catch {
            previewMap[conv.conversation_id] = "";
          }
        }),
      );

      setConversations(data);
      setPreviews(previewMap);
      loadedRef.current = true;
    } catch {
      // Silently fail — load() will retry on next focus
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const load = useCallback(() => {
    if (loadedRef.current || inFlightRef.current) return;
    inFlightRef.current = true;
    fetchAll().finally(() => {
      inFlightRef.current = false;
    });
  }, [fetchAll]);

  useEffect(() => {
    load();
  }, [load]);

  const addConversation = useCallback(
    (conv: ConversationListItem, preview?: string) => {
      setConversations((prev) => {
        const rest = prev.filter(
          (c) => c.conversation_id !== conv.conversation_id,
        );
        return [conv, ...rest];
      });
      if (preview !== undefined) {
        setPreviews((prev) => ({ ...prev, [conv.conversation_id]: preview }));
      }
    },
    [],
  );

  const touchConversation = useCallback((id: string, preview?: string) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.conversation_id === id);
      if (!existing) return prev;
      const updated = { ...existing, updated_at: new Date().toISOString() };
      return [updated, ...prev.filter((c) => c.conversation_id !== id)];
    });
    if (preview !== undefined) {
      setPreviews((prev) => ({ ...prev, [id]: preview }));
    }
  }, []);

  const updateConversation = useCallback(
    (id: string, patch: Partial<ConversationListItem>) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === id ? { ...c, ...patch } : c,
        ),
      );
    },
    [],
  );

  const removeConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.filter((c) => c.conversation_id !== id),
    );
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        previews,
        isLoading,
        load,
        addConversation,
        touchConversation,
        updateConversation,
        removeConversation,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations(): ConversationsContextValue {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error(
      "useConversations must be used within a ConversationsProvider",
    );
  }
  return context;
}
