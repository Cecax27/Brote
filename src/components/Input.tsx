import { useState, ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  TextStyle,
  ViewStyle,
  TextInputProps,
} from "react-native";
import { useTheme } from "@/theme";

type Props = {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  secureTextEntry?: boolean;
  wrapperStyle?: ViewStyle;
} & Omit<TextInputProps, "style">;

export function Input({
  label,
  error,
  leftIcon,
  secureTextEntry,
  editable = true,
  wrapperStyle,
  ...rest
}: Props) {
  const { colors, radii, type, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.accent.terracotta
    : focused
      ? colors.primary
      : colors.border;

  const container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.muted,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    opacity: editable ? 1 : 0.6,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    paddingVertical: 14,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.size,
    lineHeight: type.body.lineHeight,
    color: colors.text.primary,
  };

  const placeholderColor = colors.text.secondary;

  return (
    <View style={[{ gap: spacing.xs }, wrapperStyle]}>
      {label && (
        <Text
          style={{
            fontFamily: type.bodySmall.fontFamily,
            fontSize: type.bodySmall.size,
            color: colors.text.secondary,
          } as TextStyle}
        >
          {label}
        </Text>
      )}
      <View style={container}>
        {leftIcon}
        <TextInput
          {...rest}
          style={inputStyle}
          secureTextEntry={secureTextEntry}
          editable={editable}
          placeholderTextColor={placeholderColor}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
      </View>
      {error && (
        <Text
          style={{
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.accent.terracotta,
          } as TextStyle}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
