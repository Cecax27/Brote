import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";
import { Input } from "./Input";
import { Illustration } from "./Illustration";
import { JOURNAL_ENTRY_TYPES } from "@/lib/journal";
import { pickPhotoSource, openImagePicker } from "@/lib/image-picker";
import type { JournalEntryType } from "@/lib/supabase/journal-entries";

type Props = {
  type: JournalEntryType;
  onTypeChange: (type: JournalEntryType) => void;
  content: string;
  onContentChange: (content: string) => void;
  photoUri: string | null;
  currentPhotoUrl?: string | null;
  onPhotoChange: (uri: string | null) => void;
};

export function JournalEntryForm({
  type,
  onTypeChange,
  content,
  onContentChange,
  photoUri,
  currentPhotoUrl,
  onPhotoChange,
}: Props) {
  const { colors, radii, spacing, type: typeScale } = useTheme();
  const [isPicking, setIsPicking] = useState(false);

  const handlePickPhoto = async () => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const source = await pickPhotoSource();
      if (!source) return;
      const asset = await openImagePicker(source);
      if (asset?.uri) {
        onPhotoChange(asset.uri);
      }
    } finally {
      setIsPicking(false);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null);
  };

  const hasPhoto = !!photoUri || !!currentPhotoUrl;
  const displayUri = photoUri ?? currentPhotoUrl;
  const chipLineHeight = typeScale.caption.lineHeight;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Type chips */}
      <View>
        <Text
          style={{
            fontFamily: typeScale.bodySmall.fontFamily,
            fontSize: typeScale.bodySmall.size,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}
        >
          Tipo de cuidado
        </Text>
        <View style={styles.chipsRow}>
          {(Object.entries(JOURNAL_ENTRY_TYPES) as [JournalEntryType, (typeof JOURNAL_ENTRY_TYPES)[JournalEntryType]][])
            .map(([key, config]) => {
              const selected = key === type;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => onTypeChange(key)}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? config.color : "transparent",
                      borderColor: selected ? config.color : colors.border,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={config.icon}
                    size={14}
                    color={selected ? colors.background : config.color}
                  />
                  <Text
                    style={{
                      fontFamily: typeScale.caption.fontFamily,
                      fontSize: typeScale.caption.size,
                      lineHeight: chipLineHeight,
                      color: selected ? colors.background : config.color,
                      fontWeight: "500",
                    }}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </View>

      {/* Content */}
      <Input
        label="Notas"
        placeholder="¿Qué has hecho con tu planta?"
        value={content}
        onChangeText={onContentChange}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Photo */}
      <View>
        <Text
          style={{
            fontFamily: typeScale.bodySmall.fontFamily,
            fontSize: typeScale.bodySmall.size,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}
        >
          Foto
        </Text>
        {hasPhoto && displayUri ? (
          <View>
            <Image
              source={{ uri: displayUri }}
              style={[
                styles.photoPreview,
                { borderRadius: radii.card },
              ]}
              contentFit="cover"
              transition={300}
            />
            <TouchableOpacity
              onPress={handleRemovePhoto}
              activeOpacity={0.7}
              style={[
                styles.removePhotoButton,
                { backgroundColor: colors.accent.terracotta },
              ]}
            >
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={colors.background}
              />
              <Text
                style={{
                  fontFamily: typeScale.caption.fontFamily,
                  fontSize: typeScale.caption.size,
                  color: colors.background,
                  fontWeight: "500",
                }}
              >
                Quitar foto
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handlePickPhoto}
            activeOpacity={0.7}
            disabled={isPicking}
            style={[
              styles.photoPicker,
              {
                borderColor: colors.border,
                borderRadius: radii.input,
                backgroundColor: colors.muted,
              },
            ]}
          >
            <Illustration name="leaf" size={64} />
            <Text
              style={{
                fontFamily: typeScale.bodySmall.fontFamily,
                fontSize: typeScale.bodySmall.size,
                color: colors.text.secondary,
                textAlign: "center",
              }}
            >
              Toca para añadir una foto
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  photoPreview: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 240,
  } satisfies ViewStyle,
  removePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 24,
  } satisfies ViewStyle,
  photoPicker: {
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  } satisfies ViewStyle,
});
