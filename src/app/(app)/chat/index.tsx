import { useState, useCallback, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";
import { useAuth } from "@/context/auth";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { FloraAvatar } from "@/components/FloraAvatar";
import { getAgent, type ConversationListItem } from "@/lib/agent";
import {
  deleteConversation,
  renameConversation,
} from "@/lib/supabase/conversations";

export default function ChatListScreen() {
  const { colors, type, spacing, radii } = useTheme();
  const { session } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<TextInput>(null);

  const accessToken = session?.access_token ?? "";

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAgent().fetchConversations(accessToken);
      setConversations(data);

      const previewMap: Record<string, string> = {};
      await Promise.all(
        data.map(async (conv) => {
          try {
            const msgs = await getAgent().fetchMessages(
              conv.conversation_id,
              accessToken,
            );
            if (msgs.length > 0) {
              const last = msgs[msgs.length - 1];
              previewMap[conv.conversation_id] =
                last.content.length > 60
                  ? last.content.slice(0, 60) + "\u2026"
                  : last.content;
            }
          } catch {
            previewMap[conv.conversation_id] = "";
          }
        }),
      );
      setPreviews(previewMap);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const handleDelete = useCallback(
    (conv: ConversationListItem) => {
      Alert.alert(
        "Eliminar conversación",
        `¿Estás seguro? "${conv.title}" se eliminará y no se puede deshacer.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteConversation(conv.conversation_id);
                setConversations((prev) =>
                  prev.filter(
                    (c) => c.conversation_id !== conv.conversation_id,
                  ),
                );
              } catch {
                Alert.alert(
                  "Error",
                  "No se pudo eliminar la conversación. Inténtalo de nuevo.",
                );
              }
            },
          },
        ],
      );
    },
    [],
  );

  const handleStartRename = useCallback(
    (conv: ConversationListItem) => {
      setEditingId(conv.conversation_id);
      setEditingTitle(conv.title);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [],
  );

  const handleSubmitRename = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      setEditingTitle("");
      return;
    }

    try {
      const updated = await renameConversation(editingId, trimmed);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === editingId
            ? { ...c, title: updated.title, updated_at: updated.updated_at }
            : c,
        ),
      );
    } catch {
      Alert.alert(
        "Error",
        "No se pudo renombrar la conversación. Inténtalo de nuevo.",
      );
    } finally {
      setEditingId(null);
      setEditingTitle("");
    }
  }, [editingId, editingTitle]);

  const showOptions = useCallback(
    (conv: ConversationListItem) => {
      Alert.alert(conv.title, undefined, [
        {
          text: "Cambiar título",
          onPress: () => handleStartRename(conv),
        },
        {
          text: "Eliminar conversación",
          style: "destructive",
          onPress: () => handleDelete(conv),
        },
        { text: "Cancelar", style: "cancel" },
      ]);
    },
    [handleDelete, handleStartRename],
  );

  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <LoadingSkeleton width="100%" height={80} lines={3} />
        <LoadingSkeleton width="100%" height={80} lines={3} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.md,
      }}
    >
      {conversations.length === 0 ? (
        <View style={{ marginTop: spacing.xxl * 2 }}>
          <EmptyState
            illustration="flora"
            title="Aún no has hablado con Flora"
            subtitle="Ella te ayudará con el cuidado de tus plantas."
            action={{
              label: "Empezar a hablar",
              onPress: () => router.push("/chat/new" as never),
            }}
          />
        </View>
      ) : (
        conversations.map((conv) => {
          const hasPlant = conv.plant_id !== null;
          const preview = previews[conv.conversation_id] ?? "";
          const isEditing = editingId === conv.conversation_id;

          return (
            <Pressable
              key={conv.conversation_id}
              style={[
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radii.card,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: conv.conversation_id },
                } as never)
              }
              onLongPress={() => showOptions(conv)}
              delayLongPress={500}
            >
              <View style={styles.rowContent}>
                {hasPlant ? (
                  <View
                    style={[
                      styles.plantThumb,
                      {
                        backgroundColor: colors.muted,
                        borderRadius: radii.input,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="flower-tulip-outline"
                      size={24}
                      color={colors.secondary}
                    />
                  </View>
                ) : (
                  <FloraAvatar mood="idle" size={40} />
                )}

                <View style={styles.textCol}>
                  {isEditing ? (
                    <TextInput
                      ref={inputRef}
                      value={editingTitle}
                      onChangeText={setEditingTitle}
                      onSubmitEditing={handleSubmitRename}
                      onBlur={handleSubmitRename}
                      style={{
                        fontFamily: type.h3.fontFamily,
                        fontSize: type.h3.size,
                        fontWeight: "600",
                        color: colors.text.primary,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.primary,
                        paddingBottom: 2,
                        marginBottom: 2,
                      }}
                      autoFocus
                      returnKeyType="done"
                      selectTextOnFocus
                    />
                  ) : (
                    <Text
                      style={{
                        fontFamily: type.h3.fontFamily,
                        fontSize: type.h3.size,
                        fontWeight: "600",
                        color: colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {conv.title}
                    </Text>
                  )}
                  {preview && !isEditing ? (
                    <Text
                      style={{
                        fontFamily: type.caption.fontFamily,
                        fontSize: type.caption.size,
                        color: colors.text.secondary,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {preview}
                    </Text>
                  ) : null}
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.text.secondary}
                />
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 16,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  plantThumb: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
});
