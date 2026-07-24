import { useState, useEffect, useCallback } from "react";
import { Alert, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/context/auth";
import { fetchPlant, updatePlant } from "@/lib/supabase/plants";
import { uploadPlantPhoto } from "@/lib/supabase/storage";
import { pickPhotoSource, openImagePicker } from "@/lib/image-picker";
import { PlantForm, type PlantFormData } from "@/components/PlantForm";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useTheme } from "@/theme";

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [initialName, setInitialName] = useState("");
  const [initialSpecies, setInitialSpecies] = useState("");
  const [initialLocation, setInitialLocation] = useState("");
  const [initialNotes, setInitialNotes] = useState("");
  const [initialLightProfile, setInitialLightProfile] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsFetching(true);
    fetchPlant(id)
      .then((plant) => {
        if (!plant) {
          setFetchError("Planta no encontrada.");
          return;
        }
        setInitialName(plant.name);
        setInitialSpecies(plant.species ?? "");
        setInitialLocation(plant.location ?? "");
        setInitialNotes(plant.notes ?? "");
        setInitialLightProfile(plant.light_profile ?? null);
        setExistingPhotoUrl(plant.photo_url);
      })
      .catch((e) => {
        setFetchError(
          e instanceof Error
            ? e.message
            : "No se pudo cargar la planta.",
        );
      })
      .finally(() => setIsFetching(false));
  }, [id]);

  const handlePickPhoto = useCallback(async () => {
    const source = await pickPhotoSource();
    if (!source) return;

    const asset = await openImagePicker(source);
    if (asset?.uri) {
      setPhotoUri(asset.uri);
    }
  }, []);

  const handleSubmit = useCallback(
    async (data: PlantFormData) => {
      if (!id || !user) return;

      setIsLoading(true);
      try {
        const updates: Record<string, string | null> = {
          name: data.name,
          species: data.species || null,
          location: data.location || null,
          notes: data.notes || null,
          light_profile: data.lightProfile,
        };

        if (data.photoUri) {
          try {
            const photoUrl = await uploadPlantPhoto(user.id, id, data.photoUri);
            updates.photo_url = photoUrl;
          } catch {
            Alert.alert(
              "Error al subir la foto",
              "Los cambios se han guardado, pero no hemos podido actualizar la foto. Inténtalo de nuevo.",
            );
          }
        }

        await updatePlant(id, updates);
        router.back();
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la planta. Inténtalo de nuevo.";
        Alert.alert("Error", message);
      } finally {
        setIsLoading(false);
      }
    },
    [id, user],
  );

  if (isFetching) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          gap: spacing.lg,
        }}
      >
        <LoadingSkeleton width="100%" height={200} />
        <LoadingSkeleton width="100%" height={52} />
        <LoadingSkeleton width="100%" height={52} />
      </ScrollView>
    );
  }

  if (fetchError) {
    return (
      <EmptyState
        illustration="pot"
        title="Error"
        subtitle={fetchError}
        action={{ label: "Volver", onPress: () => router.back() }}
      />
    );
  }

  return (
    <PlantForm
      initialData={{
        name: initialName,
        species: initialSpecies,
        location: initialLocation,
        notes: initialNotes,
        lightProfile: initialLightProfile,
      }}
      photoUri={photoUri}
      existingPhotoUrl={existingPhotoUrl}
      submitLabel="Guardar cambios"
      isLoading={isLoading}
      onPickPhoto={handlePickPhoto}
      onSubmit={handleSubmit}
    />
  );
}
