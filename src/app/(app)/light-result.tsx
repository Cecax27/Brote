import { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Illustration } from "@/components/Illustration";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createLightMeasurement } from "@/lib/supabase/light-measurements";
import { fetchPlants, fetchPlant } from "@/lib/supabase/plants";
import {
  luxCategory,
  placementAdvice,
  profileLuxRange,
} from "@/lib/lux-meter";
import type { Plant } from "@/lib/supabase/plants";

const CATEGORY_COLORS: Record<string, string> = {
  "Muy baja": "#7B756E",
  Baja: "#D7B65A",
  Media: "#6E8E6A",
  Alta: "#D7B65A",
  "Muy alta": "#C87C5A",
};

const ADVICE_COLOR_MAP: Record<string, string> = {
  green: "#6E8E6A",
  terracotta: "#C87C5A",
  mustard: "#D7B65A",
  muted: "#7B756E",
};

export default function LightResultScreen() {
  const { colors, spacing, type, radii } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    deviceLux: string;
    calibratedLux?: string;
    plantId?: string;
  }>();

  const lux = Math.round(Number(params.deviceLux) || 0);
  const isCalibrated = !!params.calibratedLux;
  const category = luxCategory(lux);
  const catColor = CATEGORY_COLORS[category] ?? colors.text.secondary;

  const [plant, setPlant] = useState<Plant | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const plantId = params.plantId;

  useEffect(() => {
    if (plantId) {
      fetchPlant(plantId).then(setPlant).catch(() => {});
    }
  }, [plantId]);

  useEffect(() => {
    if (!plantId) {
      fetchPlants().then(setPlants).catch(() => {});
    }
  }, [plantId]);

  const advice = plant?.light_profile
    ? placementAdvice(lux, plant.light_profile, plant.name)
    : null;

  const adviceColor = advice ? ADVICE_COLOR_MAP[advice.color] ?? colors.text.secondary : undefined;

  const handleSave = useCallback(
    async (targetPlantId: string) => {
      if (!user) return;
      setSaving(true);
      try {
        const targetPlant = plantId
          ? plant
          : plants.find((p) => p.id === targetPlantId) ?? null;
        await createLightMeasurement({
          user_id: user.id,
          plant_id: targetPlantId,
          device_lux: lux,
          calibrated_lux: isCalibrated ? lux : null,
          light_profile: targetPlant?.light_profile ?? null,
        });
        setSaved(true);
      } catch {
        // Silently fail — save button remains
      } finally {
        setSaving(false);
      }
    },
    [user, lux, isCalibrated, plantId, plant, plants],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
      }}
    >
      {/* Lux reading */}
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Text
          style={[
            styles.luxNumber,
            {
              fontFamily: type.display.fontFamily,
              color: colors.text.primary,
            },
          ]}
        >
          {lux.toLocaleString()}
        </Text>
        <Text
          style={[
            styles.luxLabel,
            { fontFamily: type.body.fontFamily, color: colors.text.secondary },
          ]}
        >
          lux
        </Text>

        {/* Category badge */}
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: catColor, borderRadius: radii.button },
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              {
                fontFamily: type.bodyMedium.fontFamily,
                color: colors.background,
              },
            ]}
          >
            {category}
          </Text>
        </View>

        {!isCalibrated && (
          <Pressable onPress={() => router.push("/light-meter?calibrate=1" as never)}>
            <Text
              style={{
                fontFamily: type.caption.fontFamily,
                fontSize: type.caption.size,
                color: colors.text.secondary,
                textDecorationLine: "underline",
              }}
            >
              (sin calibrar) — Calibrar
            </Text>
          </Pressable>
        )}
      </View>

      {/* Plant advice */}
      {plant && advice ? (
        <Card>
          <Text
            style={{
              fontFamily: type.h3.fontFamily,
              fontSize: type.h3.size,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            {plant.name}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={20}
              color={adviceColor}
            />
            <Text
              style={{
                fontFamily: type.body.fontFamily,
                fontSize: type.body.size,
                color: adviceColor,
                flex: 1,
                lineHeight: 22,
              }}
            >
              {advice.text}
            </Text>
          </View>

          {plant.light_profile && (
            <View style={{ marginTop: spacing.md }}>
              {(() => {
                const range = profileLuxRange(plant.light_profile);
                return (
                  <Text
                    style={{
                      fontFamily: type.caption.fontFamily,
                      fontSize: type.caption.size,
                      color: colors.text.secondary,
                    }}
                  >
                    Rango ideal: {range?.label ?? plant.light_profile}
                    {range ? ` (${range.min.toLocaleString()}–${range.max.toLocaleString()} lux)` : ""}
                  </Text>
                );
              })()}
            </View>
          )}
        </Card>
      ) : plant && !plant.light_profile ? (
        <Card>
          <Text
            style={{
              fontFamily: type.h3.fontFamily,
              fontSize: type.h3.size,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            {plant.name}
          </Text>
          <Text
            style={{
              fontFamily: type.body.fontFamily,
              fontSize: type.body.size,
              color: colors.text.secondary,
              lineHeight: 22,
            }}
          >
            Anota el nivel de luz ideal de {plant.name} para comparar la
            próxima vez.
          </Text>
        </Card>
      ) : null}

      {/* Plant picker (when no plantId) */}
      {!plantId && !saved && plants.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              fontFamily: type.h3.fontFamily,
              fontSize: type.h3.size,
              color: colors.text.primary,
              marginTop: spacing.md,
            }}
          >
            Asociar a una planta
          </Text>
          {plants.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => handleSave(p.id)}
              disabled={saving}
              style={[
                styles.plantRow,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radii.card,
                  ...colors.shadows?.soft ?? {},
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                {p.photo_url ? (
                  <View
                    style={[
                      styles.thumb,
                      { backgroundColor: colors.muted, borderRadius: radii.input },
                    ]}
                  >
                    <MaterialCommunityIcons name="leaf" size={20} color={colors.primary} />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      {
                        backgroundColor: colors.muted,
                        borderRadius: radii.input,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name="leaf" size={20} color={colors.primary} />
                  </View>
                )}
                <Text
                  style={{
                    fontFamily: type.bodyMedium.fontFamily,
                    fontSize: type.body.size,
                    color: colors.text.primary,
                  }}
                >
                  {p.name}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={22}
                color={colors.primary}
              />
            </Pressable>
          ))}
          {saving && (
            <Text
              style={{
                fontFamily: type.caption.fontFamily,
                fontSize: type.caption.size,
                color: colors.text.secondary,
                textAlign: "center",
              }}
            >
              Guardando…
            </Text>
          )}
        </View>
      )}

      {/* Save button (when plantId is known and not yet saved) */}
      {plantId && !saved && (
        <Button
          variant="primary"
          onPress={() => handleSave(plantId)}
          loading={saving}
          disabled={saving}
        >
          Guardar medición
        </Button>
      )}

      {/* Saved confirmation */}
      {saved && (
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <MaterialCommunityIcons name="check-circle" size={32} color={colors.primary} />
          <Text
            style={{
              fontFamily: type.bodyMedium.fontFamily,
              fontSize: type.body.size,
              color: colors.primary,
            }}
          >
            Medición guardada
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              const targetId = plantId ?? plants[0]?.id;
              if (targetId) {
                router.replace({
                  pathname: "/plants/[id]",
                  params: { id: targetId },
                } as never);
              } else {
                router.replace("/(app)");
              }
            }}
          >
            Ver planta
          </Button>
        </View>
      )}

      {/* Back to meter */}
      {!saved && (
        <Button variant="ghost" onPress={() => router.back()}>
          Volver a medir
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  luxNumber: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: "600",
  },
  luxLabel: {
    fontSize: 18,
    marginTop: -4,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 14,
  },
  plantRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
