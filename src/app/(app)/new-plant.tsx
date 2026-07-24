import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/auth";
import { createPlant, updatePlant } from "@/lib/supabase/plants";
import { uploadPlantPhoto } from "@/lib/supabase/storage";
import { pickPhotoSource, openImagePicker } from "@/lib/image-picker";
import { PlantForm, type PlantFormData } from "@/components/PlantForm";

export default function NewPlantScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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
      if (!user) return;

      setIsLoading(true);
      try {
        const plant = await createPlant({
          user_id: user.id,
          name: data.name,
          species: data.species || null,
          location: data.location || null,
          notes: data.notes || null,
        });

        if (data.photoUri) {
          try {
            const photoUrl = await uploadPlantPhoto(
              user.id,
              plant.id,
              data.photoUri,
            );
            await updatePlant(plant.id, { photo_url: photoUrl });
          } catch (uploadError) {
            console.warn("Failed to upload photo:", uploadError);
          }
        }

        router.replace("/(app)");
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo crear la planta. Inténtalo de nuevo.";
        Alert.alert("Error", message);
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  return (
    <PlantForm
      submitLabel="Añadir planta"
      isLoading={isLoading}
      photoUri={photoUri}
      onPickPhoto={handlePickPhoto}
      onSubmit={handleSubmit}
    />
  );
}
