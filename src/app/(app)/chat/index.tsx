import { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { FloraAvatar } from "@/components/FloraAvatar";
import {
  fetchConversations,
  type ConversationWithPlant,
} from "@/lib/supabase/ai-conversations";
import {
  fetchMessages,
} from "@/lib/supabase/ai-messages";

export default function ChatListScreen() {
  const { colors, type, spacing, radii } = useTheme();
  const [conversations, setConversations] = useState<ConversationWithPlant[]>(
    [],
  );
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);

      const previewMap: Record<string, string> = {};
      await Promise.all(
        data.map(async (conv) => {
          try {
            const msgs = await fetchMessages(conv.id);
            if (msgs.length > 0) {
              const last = msgs[msgs.length - 1];
              previewMap[conv.id] =
                last.content.length > 60
                  ? last.content.slice(0, 60) + "…"
                  : last.content;
            }
          } catch {
            previewMap[conv.id] = "";
          }
        }),
      );
      setPreviews(previewMap);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
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
          const hasPlant = conv.plant_id && conv.plants;
          const preview = previews[conv.id] ?? "";

          return (
            <Pressable
              key={conv.id}
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
                  params: { id: conv.id },
                } as never)
              }
            >
              <View style={styles.rowContent}>
                {hasPlant ? (
                  <View
                    style={[
                      styles.plantThumb,
                      { backgroundColor: colors.muted, borderRadius: radii.input },
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
                  {preview ? (
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
