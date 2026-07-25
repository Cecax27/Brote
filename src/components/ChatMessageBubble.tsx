import { Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { FloraAvatar } from "@/components/FloraAvatar";
import type { ConversationMessage } from "@/lib/supabase/ai-messages";

type Props = {
  message: ConversationMessage;
};

export function ChatMessageBubble({ message }: Props) {
  const { colors, type, radii, shadows } = useTheme();
  const isAssistant = message.role === "assistant";

  return (
    <View
      style={[
        styles.row,
        isAssistant ? styles.assistantRow : styles.userRow,
      ]}
    >
      {isAssistant && (
        <View style={styles.avatarCol}>
          <FloraAvatar mood="idle" size={28} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isAssistant ? colors.surface : colors.primary,
            borderRadius: radii.card,
          },
          isAssistant ? shadows.resting : shadows.resting,
        ]}
      >
        <Text
          style={[
            type.body.size ? {} : {},
            {
              fontFamily: type.body.fontFamily,
              fontSize: type.body.size,
              lineHeight: type.body.lineHeight,
              color: isAssistant
                ? colors.text.primary
                : colors.background,
            },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  assistantRow: {
    justifyContent: "flex-start",
    maxWidth: "85%",
  },
  userRow: {
    justifyContent: "flex-end",
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  avatarCol: {
    marginRight: 8,
    alignSelf: "flex-end",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
