import { Pressable, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Card } from "./Card";
import { useTheme } from "@/theme";
import type { JournalEntry } from "@/lib/supabase/journal-entries";
import { JOURNAL_ENTRY_TYPES, formatEntryDate } from "@/lib/journal";

type Props = {
  entry: JournalEntry;
  onPress: () => void;
};

export function JournalEntryCard({ entry, onPress }: Props) {
  const { colors, type, radii, spacing } = useTheme();
  const config = JOURNAL_ENTRY_TYPES[entry.type];
  const hasBody = !!entry.content || !!entry.photo_url;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.typeChip,
              { backgroundColor: config.color + "18", borderRadius: radii.button },
            ]}
          >
            <MaterialCommunityIcons
              name={config.icon}
              size={16}
              color={config.color}
            />
            <Text
              style={{
                fontFamily: type.caption.fontFamily,
                fontSize: type.caption.size,
                color: config.color,
                fontWeight: "500",
              }}
            >
              {config.label}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: type.caption.fontFamily,
              fontSize: type.caption.size,
              color: colors.text.secondary,
            }}
          >
            {formatEntryDate(entry.created_at)}
          </Text>
        </View>

        {hasBody ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}

        {entry.content ? (
          <Text
            style={{
              fontFamily: type.bodySmall.fontFamily,
              fontSize: type.bodySmall.size,
              lineHeight: type.bodySmall.lineHeight,
              color: colors.text.primary,
            }}
          >
            {entry.content}
          </Text>
        ) : null}

        {entry.photo_url ? (
          <Image
            source={{ uri: entry.photo_url }}
            style={[
              styles.photo,
              {
                borderRadius: radii.input,
                marginTop: entry.content ? spacing.sm : 0,
              },
            ]}
            contentFit="cover"
            transition={300}
          />
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 160,
  },
});
