import { useState, useCallback, useMemo, useRef } from "react";
import { ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { ChatContextHeader } from "@/components/ChatContextHeader";
import { ChatMessageBubble, type ChatMessage } from "@/components/ChatMessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { FloraTypingIndicator } from "@/components/FloraTypingIndicator";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ProposedActionCard } from "@/components/ProposedActionCard";
import { fetchPlant, type Plant } from "@/lib/supabase/plants";
import { getAgent, AgentError, type AgentMessage } from "@/lib/agent";

function optimisticId(): string {
  return `opt_${Math.random().toString(36).slice(2, 11)}`;
}

function toChatMessage(msg: AgentMessage): ChatMessage {
  return {
    id: optimisticId(),
    role: msg.role,
    content: msg.content,
    created_at: msg.created_at,
    photo_url: msg.photo_url,
  };
}

function parsePreloadedMessages(
  raw: string | undefined,
): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ChatMessage[];
  } catch {
    // Ignore malformed preload
  }
  return [];
}

export default function ConversationScreen() {
  const { id, preload, preloadPlantId } = useLocalSearchParams<{
    id: string;
    preload?: string;
    preloadPlantId?: string;
  }>();

  const { session } = useAuth();
  const { colors, spacing } = useTheme();

  const initialMessages = useMemo(
    () => parsePreloadedMessages(preload),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [plantId, setPlantId] = useState<string | null>(
    preloadPlantId && preloadPlantId !== ""
      ? preloadPlantId
      : null,
  );
  const [plant, setPlant] = useState<Plant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages,
  );
  const [isLoading, setIsLoading] = useState(
    initialMessages.length === 0,
  );
  const [isTyping, setIsTyping] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const initialLoadDone = useRef(initialMessages.length > 0);

  const loadData = useCallback(async () => {
    if (!id) return;

    if (!initialLoadDone.current) {
      setIsLoading(true);
    }

    try {
      const accessToken = session?.access_token ?? "";

      const [convsData, msgsData] = await Promise.all([
        getAgent().fetchConversations(accessToken),
        getAgent().fetchMessages(id, accessToken),
      ]);

      const conv = convsData.find((c) => c.conversation_id === id);
      if (conv) {
        setPlantId(conv.plant_id);
      }

      if (!initialLoadDone.current) {
        const chatMessages: ChatMessage[] = msgsData.map(toChatMessage);
        setMessages(chatMessages);
        initialLoadDone.current = true;
      }

      if (conv?.plant_id) {
        try {
          const p = await fetchPlant(conv.plant_id);
          setPlant(p);
        } catch {
          setPlant(null);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [id, session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useFocusEffect(
    useCallback(() => {
      if (preloadPlantId && preloadPlantId !== "") {
        fetchPlant(preloadPlantId)
          .then(setPlant)
          .catch(() => setPlant(null));
      }
    }, [preloadPlantId]),
  );

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping || !id) return;
    setInputError(null);

    const userMsg: ChatMessage = {
      id: optimisticId(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      photo_url: null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await getAgent().postChat({
        message: text,
        conversation_id: id,
        plant_id: plantId ?? null,
        accessToken: session?.access_token ?? "",
      });

      const asstMsg: ChatMessage = {
        id: optimisticId(),
        role: "assistant",
        content: response.reply,
        created_at: new Date().toISOString(),
        photo_url: null,
        proposed_action: response.proposed_action ?? null,
        action_status: response.proposed_action ? "idle" : undefined,
      };

      setMessages((prev) => [...prev, asstMsg]);
    } catch (err) {
      if (err instanceof AgentError) {
        setInputError(err.message);
      } else {
        setInputError(
          "Flora no pudo responder ahora. Inténtalo de nuevo.",
        );
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleAcceptAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.proposed_action
          ? { ...msg, action_status: "executing" as const }
          : msg,
      ),
    );

    const message = messages.find((m) => m.id === messageId);
    if (!message?.proposed_action) return;

    const action = message.proposed_action;

    getAgent()
      .executeAction({
        action_type: action.action_type,
        plant_id: action.plant_id,
        payload: action.payload,
        confirm_token: action.confirm_token,
        accessToken: session?.access_token ?? "",
      })
      .then(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, action_status: "executed" as const }
              : msg,
          ),
        );
      })
      .catch((err) => {
        const errorMessage =
          err instanceof AgentError
            ? err.message
            : "No se pudo ejecutar la acción.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  action_status: "error" as const,
                  action_error: errorMessage,
                }
              : msg,
          ),
        );
      });
  };

  const handleRejectAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, action_status: "rejected" as const }
          : msg,
      ),
    );
  };

  if (isLoading && messages.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <LoadingSkeleton width="100%" height={80} lines={4} />
        <LoadingSkeleton width="100%" height={80} lines={4} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : undefined}
    >
      {plant && <ChatContextHeader plant={plant} />}

      {messages.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            illustration="flora"
            title="Hola, soy Flora"
            subtitle="Pregúntame lo que quieras sobre tus plantas."
          />
        </View>
      ) : (
        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          keyboardDismissMode="interactive"
        >
          {messages.map((msg) => (
            <View key={msg.id}>
              <ChatMessageBubble message={msg} />
              {msg.proposed_action && (
                <ProposedActionCard
                  action={msg.proposed_action}
                  status={
                    (msg.action_status as
                      | "idle"
                      | "executing"
                      | "executed"
                      | "rejected"
                      | "error") ?? "idle"
                  }
                  error={msg.action_error}
                  onAccept={() => handleAcceptAction(msg.id)}
                  onReject={() => handleRejectAction(msg.id)}
                />
              )}
            </View>
          ))}
          <FloraTypingIndicator isTyping={isTyping} />
        </ScrollView>
      )}

      <FloraTypingIndicator
        isTyping={isTyping && messages.length === 0}
      />
      <ChatInput
        onSend={handleSend}
        disabled={isTyping}
        error={inputError}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
});
