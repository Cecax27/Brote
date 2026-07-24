import type { ReactNode } from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
import { useTheme } from "@/theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: Props) {
  const { colors, radii, shadows } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    ...shadows.soft,
  };

  return <View style={[cardStyle, style]}>{children}</View>;
}
