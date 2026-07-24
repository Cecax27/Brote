import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

type Props = {
  children: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: Props) {
  const { colors, radii, type } = useTheme();

  const isDisabled = disabled || loading;

  const bgColor: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.earth,
    ghost: "transparent",
    destructive: colors.accent.terracotta,
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: colors.background,
    secondary: colors.background,
    ghost: colors.primary,
    destructive: colors.background,
  };

  const pressedOpacity: Record<ButtonVariant, number> = {
    primary: 0.9,
    secondary: 0.9,
    ghost: 0.6,
    destructive: 0.9,
  };

  const container: ViewStyle = {
    backgroundColor: bgColor[variant],
    borderRadius: radii.button,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    opacity: isDisabled ? 0.5 : 1,
  };

  const text: TextStyle = {
    color: textColor[variant],
    fontFamily: type.bodyMedium.fontFamily,
    fontSize: type.bodyMedium.size,
    lineHeight: type.bodyMedium.lineHeight,
    fontWeight: type.bodyMedium.fontWeight as TextStyle["fontWeight"],
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        container,
        style as ViewStyle,
        pressed && !isDisabled && { opacity: pressedOpacity[variant] },
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={textColor[variant]}
        />
      )}
      <Text style={text}>{children}</Text>
    </Pressable>
  );
}
