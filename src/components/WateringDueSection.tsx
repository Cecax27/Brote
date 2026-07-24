import { Pressable, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { Illustration } from "@/components/Illustration";
import { WaterNowButton } from "@/components/WaterNowButton";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { WateringScheduleWithPlant } from "@/lib/supabase/watering-schedules";

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function daysSince(iso: string): number {
  const due = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function statusLine(due: string): string {
  const d = daysSince(due);
  if (d === 0) return "Le toca riego";
  if (d === 1) return "Lleva 1 día de retraso";
  return `Lleva ${d} días de retraso`;
}

type Props = {
  items: WateringScheduleWithPlant[];
};

export function WateringDueSection({ items }: Props) {
  const { colors, type } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.header}>
        <Text
          style={{
            fontFamily: type.h3.fontFamily,
            fontSize: type.h3.size,
            fontWeight: "600",
            color: colors.text.primary,
          }}
        >
          Hoy
        </Text>
        <MaterialCommunityIcons
          name="watering-can-outline"
          size={18}
          color={colors.text.secondary}
        />
      </View>

      {items.map((item) => {
        const plant = item.plants;
        return (
          <Pressable
            key={item.id}
            onPress={() =>
              router.push({
                pathname: "/plants/[id]",
                params: { id: plant.id },
              } as never)
            }
          >
            <Card style={styles.card}>
              <View style={styles.photoContainer}>
                {plant.photo_url ? (
                  <Image
                    source={{ uri: plant.photo_url }}
                    style={styles.photo}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={[
                      styles.photo,
                      styles.photoPlaceholder,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Illustration name="pot" size={24} />
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <Text
                  style={{
                    fontFamily: type.bodyMedium.fontFamily,
                    fontSize: type.bodyMedium.size,
                    fontWeight: "500",
                    color: colors.text.primary,
                  }}
                  numberOfLines={1}
                >
                  {plant.name}
                </Text>
                <View style={styles.statusRow}>
                  <Text
                    style={{
                      fontFamily: type.caption.fontFamily,
                      fontSize: type.caption.size,
                      color: colors.text.secondary,
                    }}
                  >
                    {statusLine(item.next_due_at)} — {formatShortDate(item.next_due_at)}
                  </Text>
                </View>
              </View>
              <WaterNowButton plant={plant} />
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  photoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
