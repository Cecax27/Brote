import { Pressable, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/theme";

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  url: string;
  showDivider?: boolean;
};

export function SettingsLinkRow({ icon, label, url, showDivider }: Props) {
  const { colors, type } = useTheme();

  const openLink = async () => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // Silently fail — the browser just doesn't open.
    }
  };

  return (
    <Pressable
      onPress={openLink}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomWidth: showDivider ? 1 : 0,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <Text
        style={[
          styles.label,
          {
            fontFamily: type.body.fontFamily,
            fontSize: type.body.size,
            color: colors.text.primary,
          },
        ]}
      >
        {label}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.text.secondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  label: {
    flex: 1,
  },
});
