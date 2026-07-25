import { View, ViewStyle, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";
import { FloraAvatar } from "@/components/FloraAvatar";

const iconMap: Record<string, { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  leaf: { name: "leaf", color: "#6E8E6A" },
  pot: { name: "flower-tulip-outline", color: "#C7A47B" },
  "watering-can": { name: "watering-can-outline", color: "#6E8E6A" },
  flower: { name: "flower", color: "#D7B65A" },
  flora: { name: "flower", color: "#6E8E6A" },
};

type Props = {
  name: string;
  size?: number;
  style?: ViewStyle;
};

export function Illustration({ name, size = 120, style }: Props) {
  const { colors } = useTheme();

  if (name === "flora") {
    return <FloraAvatar mood="idle" size={size} style={style} />;
  }

  const def = iconMap[name] ?? iconMap.leaf;

  const container: ViewStyle = {
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.muted,
  };

  return (
    <View style={StyleSheet.flatten([container, style])}>
      <MaterialCommunityIcons
        name={def.name}
        size={size * 0.5}
        color={def.color}
      />
    </View>
  );
}
