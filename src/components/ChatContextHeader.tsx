import { Text, View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Plant } from "@/lib/supabase/plants";

type Props = {
  plant: Plant;
};

export function ChatContextHeader({ plant }: Props) {
  const { colors, type, radii } = useTheme();

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: colors.muted,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={() =>
        router.push({
          pathname: "/plants/[id]",
          params: { id: plant.id },
        } as never)
      }
    >
      <View style={styles.row}>
        {plant.photo_url ? (
          <Image
            source={{ uri: plant.photo_url }}
            style={[styles.thumbnail, { borderRadius: radii.input }]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.thumbnail,
              styles.thumbnailPlaceholder,
              { borderRadius: radii.input, backgroundColor: colors.surface },
            ]}
          >
            <MaterialCommunityIcons
              name="flower-tulip-outline"
              size={20}
              color={colors.secondary}
            />
          </View>
        )}

        <View style={styles.textCol}>
          <Text
            style={[
              styles.label,
              {
                fontFamily: type.caption.fontFamily,
                fontSize: type.caption.size,
                color: colors.text.secondary,
              },
            ]}
          >
            Hablando sobre
          </Text>
          <Text
            style={[
              styles.name,
              {
                fontFamily: type.h3.fontFamily,
                fontSize: type.h3.size,
                color: colors.text.primary,
              },
            ]}
          >
            {plant.name}
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.text.secondary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnail: {
    width: 44,
    height: 44,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  label: {
    lineHeight: 16,
  },
  name: {
    fontWeight: "600",
  },
});
