import { useState, useEffect, useCallback } from "react";
import { ScrollView, Text, View, Alert, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PhotoGrid } from "@/components/PhotoGrid";
import { Illustration } from "@/components/Illustration";
import { JournalSection } from "@/components/JournalSection";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { fetchPlant, deletePlant, fetchPlantPhotos } from "@/lib/supabase/plants";
import { fetchJournalEntries } from "@/lib/supabase/journal-entries";
import type { Plant } from "@/lib/supabase/plants";
import type { JournalEntry } from "@/lib/supabase/journal-entries";

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, type, radii } = useTheme();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJournalLoading, setIsJournalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [plantData, photoData] = await Promise.all([
        fetchPlant(id),
        fetchPlantPhotos(id),
      ]);
      setPlant(plantData);
      setPhotos(photoData);
    } catch {
      setError("No se pudo cargar la planta.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadJournal = useCallback(async () => {
    if (!id) return;
    setIsJournalLoading(true);
    try {
      const entries = await fetchJournalEntries(id);
      setJournalEntries(entries);
    } catch {
      // Silently fail — journal section shows empty
    } finally {
      setIsJournalLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    loadJournal();
  }, [loadData, loadJournal]);

  useFocusEffect(
    useCallback(() => {
      loadJournal();
    }, [loadJournal]),
  );

  const handleDelete = useCallback(() => {
    Alert.alert("Eliminar planta", "¿Estás seguro? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          try {
            await deletePlant(id);
            router.replace("/(app)");
          } catch {
            Alert.alert("Error", "No se pudo eliminar la planta. Inténtalo de nuevo.");
          }
        },
      },
    ]);
  }, [id]);

  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          gap: spacing.lg,
        }}
      >
        <LoadingSkeleton width="100%" height={240} />
        <LoadingSkeleton width="70%" height={24} />
        <LoadingSkeleton width="50%" height={16} />
      </ScrollView>
    );
  }

  if (error || !plant) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
        }}
      >
        <EmptyState
          illustration="pot"
          title="Planta no encontrada"
          subtitle={error ?? "Esta planta no existe o no tienes acceso a ella."}
          action={{ label: "Volver al inicio", onPress: () => router.replace("/(app)") }}
        />
      </ScrollView>
    );
  }

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
      {/* Photo */}
      {plant.photo_url ? (
        <Image
          source={{ uri: plant.photo_url }}
          style={[styles.mainPhoto, { borderRadius: radii.card }]}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View
          style={[
            styles.mainPhoto,
            styles.photoPlaceholder,
            { borderRadius: radii.card, backgroundColor: colors.muted },
          ]}
        >
          <Illustration name="pot" size={80} />
        </View>
      )}

      {/* Plant info */}
      <Card>
        <Text
          style={[
            styles.plantName,
            {
              fontFamily: type.display.fontFamily,
              fontSize: type.display.size,
              color: colors.text.primary,
            },
          ]}
        >
          {plant.name}
        </Text>
        {plant.species ? (
          <Text
            style={[
              styles.species,
              {
                fontFamily: type.body.fontFamily,
                fontSize: type.body.size,
                color: colors.text.secondary,
              },
            ]}
          >
            {plant.species}
          </Text>
        ) : null}
        {plant.location ? (
          <View style={styles.metaRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={16}
              color={colors.text.secondary}
            />
            <Text
              style={[
                styles.metaText,
                {
                  fontFamily: type.bodySmall.fontFamily,
                  fontSize: type.bodySmall.size,
                  color: colors.text.secondary,
                },
              ]}
            >
              {plant.location}
            </Text>
          </View>
        ) : null}
        {plant.notes ? (
          <Text
            style={[
              styles.notes,
              {
                fontFamily: type.bodySmall.fontFamily,
                fontSize: type.bodySmall.size,
                color: colors.text.primary,
              },
            ]}
          >
            {plant.notes}
          </Text>
        ) : null}
      </Card>

      {/* Quick actions */}
      <View style={styles.actions}>
        <Button
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/plants/[id]/edit",
              params: { id: plant.id },
            } as never)
          }
          style={{ flex: 1 }}
        >
          Editar
        </Button>
        <Button
          variant="destructive"
          onPress={handleDelete}
          style={{ flex: 1 }}
        >
          Eliminar
        </Button>
      </View>

      {/* Photo timeline */}
      <View style={{ marginTop: spacing.md }}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: type.h2.fontFamily,
              fontSize: type.h2.size,
              color: colors.text.primary,
            },
          ]}
        >
          Fotos
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <PhotoGrid photos={photos} />
        </View>
      </View>

      {/* Journal section */}
      <JournalSection
        entries={journalEntries}
        isLoading={isJournalLoading}
        onAdd={() =>
          router.push({
            pathname: "/plants/[id]/new-entry",
            params: { id: plant.id },
          })
        }
        onEntryPress={(entry) =>
          router.push({
            pathname: "/plants/[id]/edit-entry",
            params: { id: plant.id, entryId: entry.id },
          } as never)
        }
      />

      <EmptyState
        illustration="flora"
        title="Consulta a Flora"
        subtitle="Pregunta a Flora sobre esta planta. Próximamente."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainPhoto: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 280,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  plantName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  species: {
    fontStyle: "italic",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  metaText: {},
  notes: {
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  sectionTitle: {
    fontWeight: "400",
  },
});
