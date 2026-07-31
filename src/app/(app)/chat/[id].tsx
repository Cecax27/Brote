import { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { ChatContextHeader } from "@/components/ChatContextHeader";
import { ChatMessageBubble, type ChatMessage } from "@/components/ChatMessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { FloraTypingIndicator } from "@/components/FloraTypingIndicator";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
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

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { colors, spacing } = useTheme();
  const [plantId, setPlantId] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
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

      const chatMessages: ChatMessage[] = msgsData.map(toChatMessage);
      setMessages(chatMessages);

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
