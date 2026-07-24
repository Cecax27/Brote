import { Pressable, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { Illustration } from "@/components/Illustration";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Plant } from "@/lib/supabase/plants";

type Props = {
  plant: Plant;
  onPress: (plant: Plant) => void;
};

export function PlantCard({ plant, onPress }: Props) {
  const { colors, type } = useTheme();

  return (
    <Pressable onPress={() => onPress(plant)}>
      <Card style={styles.card}>
        <View style={styles.photoContainer}>
          {plant.photo_url ? (
            <Image
              source={{ uri: plant.photo_url }}
              style={styles.photo}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
              <Illustration name="pot" size={32} />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.name, { fontFamily: type.h3.fontFamily, fontSize: type.h3.size, color: colors.text.primary }]}
            numberOfLines={1}
          >
            {plant.name}
          </Text>
          {plant.species ? (
            <Text
              style={[styles.species, { fontFamily: type.bodySmall.fontFamily, fontSize: type.bodySmall.size, color: colors.text.secondary }]}
              numberOfLines={1}
            >
              {plant.species}
            </Text>
          ) : null}
          {plant.location ? (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={12}
                color={colors.text.secondary}
              />
              <Text
                style={[styles.location, { fontFamily: type.caption.fontFamily, fontSize: type.caption.size, color: colors.text.secondary }]}
                numberOfLines={1}
              >
                {plant.location}
              </Text>
            </View>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.text.secondary}
        />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  photoContainer: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: "hidden",
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: "600",
  },
  species: {
    fontStyle: "italic",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  location: {},
});
