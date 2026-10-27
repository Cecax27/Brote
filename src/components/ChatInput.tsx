import { useState, useRef } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  error?: string | null;
};

export function ChatInput({ onSend, disabled = false, error }: Props) {
  const { colors, type, spacing, radii } = useTheme();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !disabled;
  const showCounter = text.length > 1900;

  const handleSend = () => {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      {error ? (
        <Text
          style={[
            styles.error,
            {
              fontFamily: type.bodySmall.fontFamily,
              fontSize: type.bodySmall.size,
              color: colors.accent.terracotta,
            },
          ]}
        >
          {error}
        </Text>
      ) : null}

      <View style={styles.row}>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.muted,
              borderRadius: radii.input,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                fontFamily: type.body.fontFamily,
                fontSize: type.body.size,
                color: colors.text.primary,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Escribe a Flora…"
            placeholderTextColor={colors.text.secondary}
            multiline
            maxLength={2000}
            editable={!disabled}
            returnKeyType="default"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
        </View>

        <Pressable
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.primary : colors.muted,
              borderRadius: radii.button,
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <MaterialCommunityIcons
            name="send-outline"
            size={20}
            color={canSend ? colors.background : colors.text.secondary}
          />
        </Pressable>
      </View>

      {showCounter ? (
        <Text
          style={[
            styles.counter,
            {
              fontFamily: type.caption.fontFamily,
              fontSize: type.caption.size,
              color:
                text.length >= 2000
                  ? colors.accent.terracotta
                  : colors.text.secondary,
            },
          ]}
        >
          {text.length}/2000
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  error: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    lineHeight: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    textAlign: "right",
    marginTop: 4,
    paddingRight: 4,
  },
});
