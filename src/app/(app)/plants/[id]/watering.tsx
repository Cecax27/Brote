import { useState, useEffect, useCallback } from "react";
import { Alert, ScrollView, Text, View, TextInput, Switch } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TimePickerField } from "@/components/TimePickerField";
import {
  fetchWateringSchedule,
  createWateringSchedule,
  updateWateringSchedule,
  deleteWateringSchedule,
  fetchUpcomingSchedules,
} from "@/lib/supabase/watering-schedules";
import { requestNotificationPermissions, reconcileWateringNotifications } from "@/lib/notifications";
import type { WateringSchedule } from "@/lib/supabase/watering-schedules";

export default function WateringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, spacing, radii, type } = useTheme();

  const [existing, setExisting] = useState<WateringSchedule | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [frequencyDays, setFrequencyDays] = useState("7");
  const [notifyTime, setNotifyTime] = useState("09:00");
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [frequencyError, setFrequencyError] = useState<string | null>(null);

  const isEdit = existing !== null;

  useEffect(() => {
    if (!id) return;
    setIsFetching(true);
    fetchWateringSchedule(id)
      .then((s) => {
        if (s) {
          setExisting(s);
          setFrequencyDays(String(s.frequency_days));
          setNotifyTime(s.notify_time.slice(0, 5));
          setActive(s.active);
        }
      })
      .catch((e) => {
        setFetchError(
          e instanceof Error ? e.message : "No se pudo cargar el recordatorio.",
        );
      })
      .finally(() => setIsFetching(false));
  }, [id]);

  const validate = useCallback((): boolean => {
    const n = parseInt(frequencyDays, 10);
    if (isNaN(n) || n < 1) {
      setFrequencyError("Pon un número de días (1 o más).");
      return false;
    }
    setFrequencyError(null);
    return true;
  }, [frequencyDays]);

  const handleSave = useCallback(async () => {
    if (!validate() || !user || !id) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      if (active) {
        await requestNotificationPermissions();
      }

      if (isEdit && existing) {
        const updates: { frequency_days: number; notify_time: string; active: boolean; next_due_at?: string } = {
          frequency_days: parseInt(frequencyDays, 10),
          notify_time: `${notifyTime}:00`,
          active,
        };
        if (parseInt(frequencyDays, 10) !== existing.frequency_days) {
          const base = existing.last_watered_at ?? existing.created_at;
          const d = new Date(base);
          d.setDate(d.getDate() + parseInt(frequencyDays, 10));
          updates.next_due_at = d.toISOString();
        }
        await updateWateringSchedule(existing.id, updates);
      } else {
        await createWateringSchedule({
          plant_id: id,
          user_id: user.id,
          frequency_days: parseInt(frequencyDays, 10),
          notify_time: `${notifyTime}:00`,
          active,
          next_due_at: new Date().toISOString(),
          last_watered_at: null,
        });
      }

      const schedules = await fetchUpcomingSchedules();
      await reconcileWateringNotifications(schedules);

      router.back();
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "No se pudo guardar el recordatorio.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [validate, user, id, isEdit, existing, frequencyDays, notifyTime, active]);

  const handleDelete = useCallback(() => {
    if (!existing) return;
    Alert.alert(
      "Eliminar recordatorio",
      "¿Estás seguro? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWateringSchedule(existing.id);
              const schedules = await fetchUpcomingSchedules();
              await reconcileWateringNotifications(schedules);
              router.back();
            } catch {
              Alert.alert("Error", "No se pudo eliminar el recordatorio. Inténtalo de nuevo.");
            }
          },
        },
      ],
    );
  }, [existing]);

  if (isFetching) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, gap: spacing.lg }}
      >
        <LoadingSkeleton width="100%" height={80} />
        <LoadingSkeleton width="100%" height={44} />
      </ScrollView>
    );
  }

  if (fetchError) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl }}
      >
        <EmptyState
          illustration="leaf"
          title="Error al cargar"
          subtitle={fetchError}
          action={{ label: "Volver", onPress: () => router.back() }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg }}
    >
      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.text.secondary,
            fontWeight: "600",
            letterSpacing: 0.5,
          }}
        >
          FRECUENCIA
        </Text>
        <Text
          style={{
            fontFamily: type.body.fontFamily,
            fontSize: type.body.size,
            color: colors.text.secondary,
          }}
        >
          Cada cuántos días la riegas
        </Text>
        <TextInput
          value={frequencyDays}
          onChangeText={(t) => {
            setFrequencyDays(t);
            setFrequencyError(null);
          }}
          keyboardType="number-pad"
          placeholder="Cada 7 días"
          placeholderTextColor={colors.text.secondary}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.input,
            paddingVertical: 14,
            paddingHorizontal: 16,
            fontFamily: type.body.fontFamily,
            fontSize: type.body.size,
            color: colors.text.primary,
          }}
        />
        {frequencyError ? (
          <Text
            style={{
              fontFamily: type.caption.fontFamily,
              fontSize: type.caption.size,
              color: colors.accent.terracotta,
            }}
          >
            {frequencyError}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.text.secondary,
            fontWeight: "600",
            letterSpacing: 0.5,
          }}
        >
          HORA DEL RECORDATORIO
        </Text>
        <Text
          style={{
            fontFamily: type.body.fontFamily,
            fontSize: type.body.size,
            color: colors.text.secondary,
          }}
        >
          A qué hora quieres que te avise
        </Text>
        <TimePickerField value={notifyTime} onChange={setNotifyTime} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: type.body.fontFamily,
              fontSize: type.body.size,
              color: colors.text.primary,
            }}
          >
            Recordarme los días de riego
          </Text>
        </View>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={active ? colors.primary : colors.text.secondary}
        />
      </View>

      {saveError ? (
        <Text
          style={{
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.accent.terracotta,
            textAlign: "center",
          }}
        >
          {saveError}
        </Text>
      ) : null}

      <Button onPress={handleSave} loading={isSaving}>
        {isEdit ? "Guardar cambios" : "Crear recordatorio"}
      </Button>

      {isEdit && (
        <Button variant="destructive" onPress={handleDelete}>
          Eliminar recordatorio
        </Button>
      )}
    </ScrollView>
  );
}
