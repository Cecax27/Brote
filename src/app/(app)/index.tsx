import { useState, useEffect, useCallback } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/Button";
import { Illustration } from "@/components/Illustration";
import { PlantCard } from "@/components/PlantCard";
import { WateringDueSection } from "@/components/WateringDueSection";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { fetchPlants } from "@/lib/supabase/plants";
import { fetchDueToday, fetchUpcomingSchedules } from "@/lib/supabase/watering-schedules";
import { reconcileWateringNotifications } from "@/lib/notifications";
import type { Plant } from "@/lib/supabase/plants";
import type { WateringScheduleWithPlant } from "@/lib/supabase/watering-schedules";

function greetingByTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { colors, spacing, type } = useTheme();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [dueToday, setDueToday] = useState<WateringScheduleWithPlant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const displayName = (user?.user_metadata?.display_name as string) || "";
  const firstName = displayName.split(" ")[0];
  const greeting = greetingByTime();

  const loadPlants = useCallback(async () => {
    try {
      const data = await fetchPlants();
      setPlants(data);
    } catch {
      // Silently fail — user still sees empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDueToday = useCallback(async () => {
    try {
      const data = await fetchDueToday();
      setDueToday(data);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadPlants();
    loadDueToday();
  }, [loadPlants, loadDueToday]);

  useFocusEffect(
    useCallback(() => {
      loadPlants();
      loadDueToday();
      fetchUpcomingSchedules().then(reconcileWateringNotifications).catch(() => {});
    }, [loadPlants, loadDueToday]),
  );

  const hasPlants = plants.length > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxl,
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.brand,
            {
              fontFamily: type.display.fontFamily,
              fontSize: type.h2.size,
              color: colors.primary,
            },
          ]}
        >
          Brote
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          {hasPlants && (
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={24}
              color={colors.text.secondary}
              onPress={() => router.push("/new-plant")}
              suppressHighlighting
            />
          )}
          <MaterialCommunityIcons
            name="bell-outline"
            size={24}
            color={colors.text.secondary}
            onPress={() => router.push("/watering")}
            suppressHighlighting
          />
        </View>
      </View>

      {/* Greeting */}
      <View style={{ marginTop: spacing.xl }}>
        <Text
          style={[
            styles.greetingLabel,
            {
              fontFamily: type.body.fontFamily,
              color: colors.text.secondary,
            },
          ]}
        >
          ¡{greeting}{firstName ? `, ${firstName}` : ""}! ☀️
        </Text>
        <Text
          style={[
            styles.greetingHeading,
            {
              fontFamily: type.display.fontFamily,
              fontSize: type.display.size,
              color: colors.text.primary,
            },
          ]}
        >
          Tu jardín está{"\n"}creciendo hermoso 🌿
        </Text>
        <Text
          style={[
            styles.greetingSub,
            {
              fontFamily: type.body.fontFamily,
              color: colors.text.secondary,
            },
          ]}
        >
          Aquí tienes lo que necesita tu atención hoy.
        </Text>
      </View>

      {/* Due today — only visible when there are plants to water */}
      {hasPlants && (
        <View style={{ marginTop: spacing.xl }}>
          <WateringDueSection items={dueToday} />
        </View>
      )}

      {/* Plant list or empty state */}
      {isLoading ? (
        <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
          <LoadingSkeleton width="100%" height={80} />
          <LoadingSkeleton width="100%" height={80} />
        </View>
      ) : !hasPlants ? (
        <View style={{ marginTop: spacing.xxl }}>
          <EmptyState
            illustration="leaf"
            title="Aún no tienes plantas"
            subtitle="Vamos a añadir tu primera. Cada planta tendrá su propio espacio con su historia, fotos y cuidados."
            action={{
              label: "Añadir mi primera planta",
              onPress: () => router.push("/new-plant"),
            }}
          />
        </View>
      ) : (
        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onPress={(p) =>
                router.push({
                  pathname: "/plants/[id]",
                  params: { id: p.id },
                } as never)
              }
            />
          ))}
        </View>
      )}

      {/* Flora AI teaser card — always visible */}
      <View style={{ marginTop: spacing.xl }}>
        <View
          style={[
            styles.floraCard,
            { backgroundColor: colors.muted },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.floraLabel,
                {
                  fontFamily: type.caption.fontFamily,
                  color: colors.primary,
                },
              ]}
            >
              PREGUNTA ALGO A
            </Text>
            <Text
              style={[
                styles.floraTitle,
                {
                  fontFamily: type.display.fontFamily,
                  fontSize: type.h1.size,
                  color: colors.primary,
                },
              ]}
            >
              Flora
            </Text>
            <Text
              style={[
                styles.floraSub,
                {
                  fontFamily: type.caption.fontFamily,
                  color: colors.text.secondary,
                },
              ]}
            >
              Tu amiga experta{"\n"}en plantas 🌿
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button variant="primary" onPress={() => router.push("/chat" as never)}>
                Hablar con Flora
              </Button>
            </View>
          </View>
          <View style={{ position: "absolute", right: 8, top: 8 }}>
            <Illustration name="flora" size={100} />
          </View>
        </View>
      </View>

      {/* Logout — subtle placement */}
      <View style={{ marginTop: spacing.xxl, alignItems: "center" }}>
        <Button variant="ghost" onPress={signOut}>
          Cerrar sesión
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontWeight: "700" },
  greetingLabel: { fontSize: 16, marginBottom: 4 },
  greetingHeading: { lineHeight: 40, marginBottom: 8 },
  greetingSub: { fontSize: 16, maxWidth: 250 },
  floraCard: {
    flexDirection: "row",
    padding: 24,
    borderRadius: 22,
    overflow: "hidden" as const,
    minHeight: 180,
  },
  floraLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 1 },
  floraTitle: { fontWeight: "700", marginTop: 4 },
  floraSub: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
