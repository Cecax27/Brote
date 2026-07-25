import { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { ChatContextHeader } from "@/components/ChatContextHeader";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { FloraTypingIndicator } from "@/components/FloraTypingIndicator";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { getAgent, AgentError } from "@/lib/agent";
import {
  fetchConversation,
  updateConversation,
  type ConversationWithPlant,
} from "@/lib/supabase/ai-conversations";
import {
  fetchMessages,
  createMessage,
  type ConversationMessage,
} from "@/lib/supabase/ai-messages";

type OptimisticMessage = Omit<ConversationMessage, "id"> & {
  id: string;
};

function optimisticId(): string {
  return `opt_${Math.random().toString(36).slice(2, 11)}`;
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors, spacing } = useTheme();
  const [conversation, setConversation] =
    useState<ConversationWithPlant | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [conv, msgs] = await Promise.all([
        fetchConversation(id),
        fetchMessages(id),
      ]);
      setConversation(conv);
      setMessages(msgs);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping || !id) return;
    setInputError(null);

    const userMsg: OptimisticMessage = {
      id: optimisticId(),
      conversation_id: id,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      photo_url: null,
    };

    setMessages((prev) => [...prev, userMsg as ConversationMessage]);
    setIsTyping(true);

    try {
      await createMessage({
        conversation_id: id,
        role: "user",
        content: text,
      });

      const reply = await getAgent().postChat({
        message: text,
        plant_id: conversation?.plant_id ?? null,
        accessToken: session?.access_token ?? "",
      });

      const asstMsg = await createMessage({
        conversation_id: id,
        role: "assistant",
        content: reply,
      });

      setMessages((prev) => [...prev, asstMsg]);

      if (
        conversation &&
        conversation.title === "Conversación con Flora" &&
        messages.length === 0
      ) {
        const title =
          text.length > 30 ? text.slice(0, 30) + "…" : text;
        const updated = await updateConversation(id, { title });
        setConversation((prev) =>
          prev ? { ...prev, title: updated.title } : prev,
        );
      }
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

  if (isLoading) {
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {conversation?.plant_id && conversation.plants && (
        <ChatContextHeader plant={conversation.plants} />
      )}

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
        >
          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
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
    </View>
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
