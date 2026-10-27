import { Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";

type Props = {
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  accessibilityLabel?: string;
};

export function FloatingActionButton({
  onPress,
  icon = "plus",
  accessibilityLabel,
}: Props) {
  const { colors, shadows, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        {
          right: spacing.lg,
          bottom: spacing.lg,
          backgroundColor: colors.primary,
          ...shadows.soft,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={28} color={colors.background} />
    </Pressable>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
