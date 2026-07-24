import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { JournalEntryCard } from "./JournalEntryCard";
import { groupEntriesByMonth } from "@/lib/journal";
import type { JournalEntry } from "@/lib/supabase/journal-entries";

type Props = {
  entries: JournalEntry[];
  isLoading: boolean;
  onAdd: () => void;
  onEntryPress: (entry: JournalEntry) => void;
};

export function JournalSection({
  entries,
  isLoading,
  onAdd,
  onEntryPress,
}: Props) {
  const { colors, spacing, type } = useTheme();

  return (
    <View>
      <View style={styles.header}>
        <Text
          style={{
            fontFamily: type.h2.fontFamily,
            fontSize: type.h2.size,
            color: colors.text.primary,
          }}
        >
          Diario
        </Text>
        <TouchableOpacity
          onPress={onAdd}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: spacing.md }}>
        {isLoading ? (
          <View style={{ gap: spacing.md }}>
            <LoadingSkeleton width="100%" height={72} />
            <LoadingSkeleton width="100%" height={72} />
          </View>
        ) : entries.length === 0 ? (
          <EmptyState
            illustration="leaf"
            title="Aún no hay entradas en el diario"
            subtitle="Registra un riego, una poda, o cualquier cuidado que hagas."
            action={{
              label: "Añadir primera entrada",
              onPress: onAdd,
            }}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {groupEntriesByMonth(entries).map((group) => (
              <View key={group.header}>
                <Text
                  style={{
                    fontFamily: type.bodyMedium.fontFamily,
                    fontSize: type.bodyMedium.size,
                    color: colors.text.secondary,
                    marginBottom: spacing.sm,
                    marginTop: spacing.xs,
                  }}
                >
                  {group.header}
                </Text>
                <View style={{ gap: spacing.sm }}>
                  {group.entries.map((entry) => (
                    <JournalEntryCard
                      key={entry.id}
                      entry={entry}
                      onPress={() => onEntryPress(entry)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
