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
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { useConversations } from "@/context/conversations";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import type { ConversationListItem } from "@/lib/agent";
import {
  deleteConversation,
  renameConversation,
} from "@/lib/supabase/conversations";

function DeleteAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const { colors, radii, spacing } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * 20 }],
  }));

  return (
    <Animated.View
      style={[
        styles.deleteActionWrap,
        { marginLeft: spacing.sm },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel="Eliminar conversación"
        style={({ pressed }) => [
          styles.deleteAction,
          {
            backgroundColor: colors.accent.terracotta,
            borderRadius: radii.card,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={22}
          color={colors.background}
        />
      </Pressable>
    </Animated.View>
  );
}

export default function ChatListScreen() {
  const { colors, type, spacing, radii } = useTheme();
  const {
    conversations,
    previews,
    isLoading,
    load,
    removeConversation,
    updateConversation,
  } = useConversations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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
                removeConversation(conv.conversation_id);
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
    [removeConversation],
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
      updateConversation(editingId, {
        title: updated.title,
        updated_at: updated.updated_at,
      });
    } catch {
      Alert.alert(
        "Error",
        "No se pudo renombrar la conversación. Inténtalo de nuevo.",
      );
    } finally {
      setEditingId(null);
      setEditingTitle("");
    }
  }, [editingId, editingTitle, updateConversation]);

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

  const startNewChat = useCallback(() => {
    router.push("/chat/new" as never);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.xxl + 72,
          gap: spacing.md,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.brand,
              {
                fontFamily: type.h2.fontFamily,
                fontSize: type.h1.size,
                color: colors.primary,
              },
            ]}
          >
            Flora
          </Text>
        </View>

        {isLoading ? (
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            <LoadingSkeleton width="100%" height={80} lines={3} />
            <LoadingSkeleton width="100%" height={80} lines={3} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={{ marginTop: spacing.xxl * 2 }}>
            <EmptyState
              illustration="flora"
              title="Aún no has hablado con Flora"
              subtitle="Ella te ayudará con el cuidado de tus plantas."
              action={{
                label: "Empezar a hablar",
                onPress: startNewChat,
              }}
            />
          </View>
        ) : (
          conversations.map((conv) => {
            const preview = previews[conv.conversation_id] ?? "";
            const isEditing = editingId === conv.conversation_id;

            return (
              <ReanimatedSwipeable
                key={conv.conversation_id}
                friction={2}
                rightThreshold={40}
                overshootRight={false}
                renderRightActions={(progress, _translation, methods) => (
                  <DeleteAction
                    progress={progress}
                    onPress={() => {
                      methods.close();
                      handleDelete(conv);
                    }}
                  />
                )}
              >
                <Pressable
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
              </ReanimatedSwipeable>
            );
          })
        )}
      </ScrollView>

      <FloatingActionButton
        onPress={startNewChat}
        accessibilityLabel="Nuevo chat"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {},
  row: {
    padding: 16,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textCol: {
    flex: 1,
  },
  deleteActionWrap: {
    justifyContent: "center",
  },
  deleteAction: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
});
