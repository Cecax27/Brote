import { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { ChatContextHeader } from "@/components/ChatContextHeader";
import { ChatMessageBubble, type ChatMessage } from "@/components/ChatMessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { FloraTypingIndicator } from "@/components/FloraTypingIndicator";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { fetchPlant, type Plant } from "@/lib/supabase/plants";
import { getAgent, AgentError } from "@/lib/agent";

function optimisticId(): string {
  return `opt_${Math.random().toString(36).slice(2, 11)}`;
}

export default function NewChatScreen() {
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const { session } = useAuth();
  const { colors, spacing } = useTheme();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isLoadingPlant, setIsLoadingPlant] = useState(!!plantId);

  const loadPlant = useCallback(async () => {
    if (!plantId) return;
    try {
      const p = await fetchPlant(plantId);
      setPlant(p);
    } catch {
      // Silently fail
    } finally {
      setIsLoadingPlant(false);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      loadPlant();
    }, [loadPlant]),
  );

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;
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

      router.replace({
        pathname: "/chat/[id]",
        params: { id: response.conversation_id },
      } as never);
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

  if (isLoadingPlant) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <LoadingSkeleton width="100%" height={60} />
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

      <FloraTypingIndicator isTyping={isTyping && messages.length === 0} />
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
