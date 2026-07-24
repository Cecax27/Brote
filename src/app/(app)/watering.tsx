import { useState, useCallback } from "react";
import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Illustration } from "@/components/Illustration";
import { WaterNowButton } from "@/components/WaterNowButton";
import {
  fetchUpcomingSchedules,
  type WateringScheduleWithPlant,
} from "@/lib/supabase/watering-schedules";
import { reconcileWateringNotifications } from "@/lib/notifications";

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

function formatAgendaDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

type AgendaOccurrence = {
  date: Date;
  displayDate: string;
  schedule: WateringScheduleWithPlant;
};

function expandOccurrences(
  schedules: WateringScheduleWithPlant[],
  days = 30,
): AgendaOccurrence[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);
  cutoff.setHours(23, 59, 59, 999);

  const results: AgendaOccurrence[] = [];

  for (const s of schedules) {
    let cursor = new Date(s.next_due_at);
    while (cursor <= cutoff) {
      results.push({
        date: new Date(cursor),
        displayDate: formatAgendaDate(cursor.toISOString()),
        schedule: s,
      });
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + s.frequency_days);
    }
  }

  results.sort((a, b) => a.date.getTime() - b.date.getTime());
  return results;
}

function groupByDate(
  occurrences: AgendaOccurrence[],
): { dateLabel: string; items: AgendaOccurrence[] }[] {
  const groups: { dateLabel: string; items: AgendaOccurrence[] }[] = [];
  let currentLabel = "";
  let currentItems: AgendaOccurrence[] = [];

  for (const o of occurrences) {
    if (o.displayDate !== currentLabel) {
      if (currentItems.length > 0) {
        groups.push({ dateLabel: currentLabel, items: currentItems });
      }
      currentLabel = o.displayDate;
      currentItems = [o];
    } else {
      currentItems.push(o);
    }
  }

  if (currentItems.length > 0) {
    groups.push({ dateLabel: currentLabel, items: currentItems });
  }

  return groups;
}

export default function AgendaScreen() {
  const { colors, spacing, type } = useTheme();
  const [occurrences, setOccurrences] = useState<AgendaOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      fetchUpcomingSchedules()
        .then((schedules) => {
          if (cancelled) return;
          const expanded = expandOccurrences(schedules);
          setOccurrences(expanded);
          setHasData(schedules.length > 0);
          reconcileWateringNotifications(schedules);
        })
        .catch(() => {
          if (!cancelled) setHasData(false);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          gap: spacing.md,
        }}
      >
        <LoadingSkeleton width="100%" height={64} />
        <LoadingSkeleton width="100%" height={64} />
        <LoadingSkeleton width="100%" height={64} />
      </ScrollView>
    );
  }

  if (!hasData) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
        }}
      >
        <EmptyState
          illustration="leaf"
          title="Aún no has configurado riegos"
          subtitle="Configura el riego de tus plantas para ver aquí los próximos días."
        />
      </ScrollView>
    );
  }

  const groups = groupByDate(occurrences);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
      }}
    >
      {groups.map((group) => (
        <View key={group.dateLabel} style={{ gap: spacing.md }}>
          <Text
            style={{
              fontFamily: type.caption.fontFamily,
              fontSize: type.caption.size,
              color: colors.text.secondary,
              fontWeight: "600",
              letterSpacing: 0.5,
            }}
          >
            {group.dateLabel.toUpperCase()}
          </Text>

          {group.items.map((item) => {
            const plant = item.schedule.plants;
            const timeLabel = item.schedule.notify_time.slice(0, 5) + " hs";
            return (
              <Pressable
                key={`${item.schedule.id}-${item.date.toISOString()}`}
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
                        <Illustration name="pot" size={20} />
                      </View>
                    )}
                  </View>
                  <View style={styles.info}>
                    <Text
                      style={{
                        fontFamily: type.bodyMedium.fontFamily,
                        fontSize: type.bodyMedium.size,
                        color: colors.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {plant.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: type.caption.fontFamily,
                        fontSize: type.caption.size,
                        color: colors.text.secondary,
                      }}
                    >
                      {timeLabel}
                    </Text>
                  </View>
                  <WaterNowButton plant={plant} />
                </Card>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  photoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
  },
  photo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
});
