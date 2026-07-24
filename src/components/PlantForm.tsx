import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/theme";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Illustration } from "@/components/Illustration";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export type PlantFormData = {
  name: string;
  species: string;
  location: string;
  notes: string;
  photoUri: string | null;
  lightProfile: string | null;
};

type Props = {
  initialData?: Omit<PlantFormData, "photoUri" | "lightProfile"> & {
    lightProfile?: string | null;
  };
  photoUri: string | null;
  existingPhotoUrl?: string | null;
  onSubmit: (data: PlantFormData) => void | Promise<void>;
  isLoading?: boolean;
  submitLabel: string;
  onPickPhoto: () => void;
};

const LIGHT_OPTIONS: readonly {
  value: string;
  icon: "weather-sunny-off" | "white-balance-sunny" | "weather-sunny" | "sun-wireless";
  label: string;
}[] = [
  { value: "low", icon: "weather-sunny-off", label: "Sombra" },
  { value: "medium", icon: "white-balance-sunny", label: "Indirecta" },
  { value: "bright", icon: "weather-sunny", label: "Brillante" },
  { value: "direct", icon: "sun-wireless", label: "Directa" },
];

export function PlantForm({
  initialData,
  photoUri: externalPhotoUri,
  existingPhotoUrl,
  onSubmit,
  isLoading = false,
  submitLabel,
  onPickPhoto,
}: Props) {
  const { colors, spacing, radii, type } = useTheme();

  const [name, setName] = useState(initialData?.name ?? "");
  const [species, setSpecies] = useState(initialData?.species ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [lightProfile, setLightProfile] = useState<string | null>(
    initialData?.lightProfile ?? null,
  );
  const [errors, setErrors] = useState<{ name?: string }>({});

  const displayPhotoUri = externalPhotoUri;
  const hasPhotoToShow = displayPhotoUri || existingPhotoUrl;

  const handleSubmit = () => {
    const nextErrors: { name?: string } = {};

    if (!name.trim()) {
      nextErrors.name = "El nombre no puede estar vacío";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmit({
      name: name.trim(),
      species: species.trim(),
      location: location.trim(),
      notes: notes.trim(),
      photoUri: externalPhotoUri,
      lightProfile,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photo picker */}
      <Pressable
        onPress={onPickPhoto}
        style={[
          styles.photoArea,
          {
            backgroundColor: colors.muted,
            borderRadius: radii.card,
            borderColor: colors.border,
          },
        ]}
      >
        {hasPhotoToShow ? (
          <Image
            source={{
              uri: displayPhotoUri || (existingPhotoUrl ?? ""),
            }}
            style={[styles.photoPreview, { borderRadius: radii.input }]}
            contentFit="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Illustration name="leaf" size={48} />
            <Text
              style={[
                styles.photoLabel,
                {
                  fontFamily: type.bodySmall.fontFamily,
                  fontSize: type.bodySmall.size,
                  color: colors.text.secondary,
                },
              ]}
            >
              Añadir foto
            </Text>
          </View>
        )}
        <View
          style={[
            styles.photoEditBadge,
            { backgroundColor: colors.primary, borderRadius: radii.button },
          ]}
        >
          <MaterialCommunityIcons name="camera-outline" size={14} color={colors.background} />
        </View>
      </Pressable>

      {/* Fields */}
      <Input
        label="Nombre"
        placeholder="Ej: Monstera"
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (errors.name) setErrors({});
        }}
        error={errors.name}
        autoCapitalize="sentences"
        editable={!isLoading}
      />

      <Input
        label="Especie"
        placeholder="Ej: Monstera deliciosa"
        value={species}
        onChangeText={setSpecies}
        autoCapitalize="sentences"
        editable={!isLoading}
      />

      <Input
        label="Ubicación"
        placeholder="Ej: Salón, cerca de la ventana"
        value={location}
        onChangeText={setLocation}
        autoCapitalize="sentences"
        editable={!isLoading}
      />

      {/* Light profile picker */}
      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.text.secondary,
          }}
        >
          Nivel de luz ideal
        </Text>
        <View style={styles.lightPickerRow}>
          {LIGHT_OPTIONS.map((opt) => {
            const isSelected = lightProfile === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() =>
                  setLightProfile(isSelected ? null : opt.value)
                }
                disabled={isLoading}
                style={[
                  styles.lightChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.muted,
                    borderRadius: radii.button,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={16}
                  color={isSelected ? colors.background : colors.text.secondary}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: type.caption.fontFamily,
                    fontSize: 11,
                    color: isSelected ? colors.background : colors.text.secondary,
                    marginLeft: 4,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label="Notas"
        placeholder="Algo que quieras recordar sobre esta planta…"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
        editable={!isLoading}
      />

      {/* Submit */}
      <View style={{ marginTop: spacing.md }}>
        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? "Guardando…" : submitLabel}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photoArea: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 240,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoLabel: {},
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  photoEditBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  lightPickerRow: {
    flexDirection: "row",
    gap: 8,
  },
  lightChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 2,
  },
});
