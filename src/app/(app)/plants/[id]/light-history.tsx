import { useState, useEffect, useCallback } from "react";
import { ScrollView, Text, View, Alert, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/Button";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  fetchLightMeasurements,
  deleteLightMeasurement,
} from "@/lib/supabase/light-measurements";
import { fetchPlant } from "@/lib/supabase/plants";
import { luxCategory, profileLuxRange } from "@/lib/lux-meter";
import type { LightMeasurement } from "@/lib/supabase/light-measurements";
import type { Plant } from "@/lib/supabase/plants";

const CATEGORY_COLORS: Record<string, string> = {
  "Muy baja": "#7B756E",
  Baja: "#D7B65A",
  Media: "#6E8E6A",
  Alta: "#D7B65A",
  "Muy alta": "#C87C5A",
};

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function LightHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, type, radii, shadows } = useTheme();

  const [measurements, setMeasurements] = useState<LightMeasurement[]>([]);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [meas, p] = await Promise.all([
        fetchLightMeasurements(id),
        fetchPlant(id),
      ]);
      setMeasurements(meas);
      setPlant(p);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(
    (measurementId: string) => {
      Alert.alert(
        "Eliminar medición",
        "¿Estás seguro? Esta acción no se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteLightMeasurement(measurementId);
                setMeasurements((prev) => prev.filter((m) => m.id !== measurementId));
              } catch {
                Alert.alert("Error", "No se pudo eliminar la medición.");
              }
            },
          },
        ],
      );
    },
    [],
  );

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
      {/* Light profile reference */}
      {plant?.light_profile && (() => {
        const range = profileLuxRange(plant.light_profile);
        return (
          <View
            style={[
              styles.profileBar,
              {
                backgroundColor: colors.muted,
                borderRadius: radii.card,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="white-balance-sunny"
              size={18}
              color={colors.primary}
            />
            <Text
              style={{
                fontFamily: type.bodyMedium.fontFamily,
                fontSize: type.bodySmall.size,
                color: colors.primary,
              }}
            >
              Luz ideal: {range?.label ?? plant.light_profile}
              {range ? ` (${range.min.toLocaleString()}–${range.max.toLocaleString()} lux)` : ""}
            </Text>
          </View>
        );
      })()}

      {isLoading ? (
        <View style={{ gap: spacing.md }}>
          <LoadingSkeleton width="100%" height={64} />
          <LoadingSkeleton width="100%" height={64} />
          <LoadingSkeleton width="100%" height={64} />
        </View>
      ) : measurements.length === 0 ? (
        <EmptyState
          illustration="leaf"
          title="Aún no has medido la luz"
          subtitle="Usa el medidor de luz para registrar cuánta luz recibe esta planta."
          action={{
            label: "Medir luz",
            onPress: () =>
              router.push({
                pathname: "/light-meter",
                params: { plantId: id },
              } as never),
          }}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {measurements.map((m) => {
            const lux = m.calibrated_lux ?? Math.round(m.device_lux);
            const cat = luxCategory(lux);
            const catColor = CATEGORY_COLORS[cat] ?? colors.text.secondary;
            return (
              <Pressable
                key={m.id}
                onLongPress={() => handleDelete(m.id)}
                style={[
                  styles.measurementRow,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.card,
                    ...shadows.soft,
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text
                      style={{
                        fontFamily: type.bodyMedium.fontFamily,
                        fontSize: type.body.size,
                        color: colors.text.primary,
                      }}
                    >
                      {lux.toLocaleString()} lux
                    </Text>
                    {!m.calibrated_lux && (
                      <Text
                        style={{
                          fontFamily: type.caption.fontFamily,
                          fontSize: type.caption.size,
                          color: colors.text.secondary,
                        }}
                      >
                        ~
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: type.caption.fontFamily,
                      fontSize: type.caption.size,
                      color: colors.text.secondary,
                    }}
                  >
                    {formatDate(m.created_at)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.catBadge,
                    { backgroundColor: catColor, borderRadius: radii.input },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: type.caption.fontFamily,
                      fontSize: 11,
                      color: colors.background,
                    }}
                  >
                    {cat}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Button
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/light-meter",
            params: { plantId: id },
          } as never)
        }
      >
        Nueva medición
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  measurementRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
