import { useState, useEffect, useCallback } from "react";
import { ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { JournalEntryForm } from "@/components/JournalEntryForm";
import {
  fetchJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from "@/lib/supabase/journal-entries";
import { uploadPlantPhoto, deletePlantPhoto } from "@/lib/supabase/storage";
import type { JournalEntry, JournalEntryType } from "@/lib/supabase/journal-entries";

export default function EditEntryScreen() {
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<JournalEntryType>("observation");
  const [content, setContent] = useState("");
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!entryId) return;
    setIsLoading(true);
    fetchJournalEntry(entryId)
      .then((data) => {
        if (!data) {
          setError("Entrada no encontrada.");
          return;
        }
        setEntry(data);
        setType(data.type);
        setContent(data.content ?? "");
      })
      .catch(() => {
        setError("No se pudo cargar la entrada.");
      })
      .finally(() => setIsLoading(false));
  }, [entryId]);

  const handlePhotoChange = useCallback(
    (uri: string | null) => {
      if (uri === null) {
        if (entry?.photo_url) {
          setPhotoRemoved(true);
        }
        setNewPhotoUri(null);
      } else {
        setPhotoRemoved(false);
        setNewPhotoUri(uri);
      }
    },
    [entry],
  );

  const handleSubmit = useCallback(async () => {
    if (!user || !id || !entryId || !entry) return;
    setIsSaving(true);
    try {
      let photoUrl: string | null | undefined;

      if (photoRemoved) {
        try {
          if (entry.photo_url) await deletePlantPhoto(entry.photo_url);
        } catch {
          // Best-effort cleanup
        }
        photoUrl = null;
      } else if (newPhotoUri) {
        try {
          if (entry.photo_url) await deletePlantPhoto(entry.photo_url);
        } catch {
          // Best-effort cleanup
        }
        photoUrl = await uploadPlantPhoto(user.id, id, newPhotoUri);
      }

      const updates = {
        type,
        content: content.trim() || null,
        ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
      };

      await updateJournalEntry(entryId, updates);
      router.back();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la entrada. Inténtalo de nuevo.";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [user, id, entryId, entry, type, content, newPhotoUri, photoRemoved]);

  const handleDelete = useCallback(() => {
    if (!entryId) return;
    Alert.alert(
      "Eliminar entrada",
      "¿Estás seguro? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              if (entry?.photo_url) {
                try {
                  await deletePlantPhoto(entry.photo_url);
                } catch {
                  // Best-effort cleanup
                }
              }
              await deleteJournalEntry(entryId);
              router.back();
            } catch {
              Alert.alert(
                "Error",
                "No se pudo eliminar la entrada. Inténtalo de nuevo.",
              );
            }
          },
        },
      ],
    );
  }, [entryId, entry]);

  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.lg }}
      >
        <LoadingSkeleton width="100%" height={200} />
        <LoadingSkeleton width="70%" height={20} />
        <LoadingSkeleton width="50%" height={20} />
      </ScrollView>
    );
  }

  if (error || !entry) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}
      >
        <EmptyState
          illustration="pot"
          title="Entrada no encontrada"
          subtitle={error ?? "Esta entrada no existe o no tienes acceso a ella."}
          action={{ label: "Volver", onPress: () => router.back() }}
        />
      </ScrollView>
    );
  }

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
        photoUri={newPhotoUri}
        currentPhotoUrl={photoRemoved ? null : entry.photo_url}
        onPhotoChange={handlePhotoChange}
      />
      <Button onPress={handleSubmit} loading={isSaving} disabled={isSaving}>
        Guardar cambios
      </Button>
      <Button
        variant="destructive"
        onPress={handleDelete}
        disabled={isSaving}
      >
        Eliminar entrada
      </Button>
    </ScrollView>
  );
}
