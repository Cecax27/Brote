import { View, Text, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/theme";
import { Illustration } from "./Illustration";
import { Button } from "./Button";

type Props = {
  illustration: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
};

export function EmptyState({ illustration, title, subtitle, action }: Props) {
  const { colors, spacing, type } = useTheme();

  const titleStyle: TextStyle = {
    fontFamily: type.h2.fontFamily,
    fontSize: type.h2.size,
    lineHeight: type.h2.lineHeight,
    color: colors.text.primary,
    textAlign: "center",
  };

  const subtitleStyle: TextStyle = {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.size,
    lineHeight: type.body.lineHeight,
    color: colors.text.secondary,
    textAlign: "center",
  };

  return (
    <View
      style={
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xl,
          gap: spacing.md,
        } as ViewStyle
      }
    >
      <Illustration name={illustration} />
      <Text style={titleStyle}>{title}</Text>
      {subtitle && <Text style={subtitleStyle}>{subtitle}</Text>}
      {action && (
        <Button variant="primary" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </View>
  );
}
