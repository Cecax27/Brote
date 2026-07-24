import { useState, useCallback } from "react";
import { ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Button } from "@/components/Button";
import { JournalEntryForm } from "@/components/JournalEntryForm";
import { JOURNAL_ENTRY_TYPES } from "@/lib/journal";
import { createJournalEntry, updateJournalEntry } from "@/lib/supabase/journal-entries";
import { uploadPlantPhoto } from "@/lib/supabase/storage";
import type { JournalEntryType } from "@/lib/supabase/journal-entries";

const VALID_TYPES = Object.keys(JOURNAL_ENTRY_TYPES) as JournalEntryType[];

export default function NewEntryScreen() {
  const { id, type: typeParam } = useLocalSearchParams<{
    id: string;
    type?: string;
  }>();
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const initialType: JournalEntryType = VALID_TYPES.includes(
    typeParam as JournalEntryType,
  )
    ? (typeParam as JournalEntryType)
    : "observation";

  const [type, setType] = useState<JournalEntryType>(initialType);
  const [content, setContent] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user || !id) return;
    setIsSaving(true);
    try {
      const entry = await createJournalEntry({
        plant_id: id,
        user_id: user.id,
        type,
        content: content.trim() || null,
      });

      if (photoUri) {
        try {
          const photoUrl = await uploadPlantPhoto(
            user.id,
            id,
            photoUri,
          );
          await updateJournalEntry(entry.id, { photo_url: photoUrl });
        } catch {
          Alert.alert(
            "Error al subir la foto",
            "La entrada se ha creado, pero no hemos podido guardar la foto.",
          );
        }
      }

      router.back();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo crear la entrada. Inténtalo de nuevo.";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [user, id, type, content, photoUri]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      }}
    >
      <JournalEntryForm
        type={type}
        onTypeChange={setType}
        content={content}
        onContentChange={setContent}
        photoUri={photoUri}
        onPhotoChange={setPhotoUri}
      />
      <Button
        onPress={handleSubmit}
        loading={isSaving}
        disabled={isSaving}
      >
        Guardar entrada
      </Button>
    </ScrollView>
  );
}
