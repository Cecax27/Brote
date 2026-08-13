import { useState, useCallback } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/theme";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PlantCard } from "@/components/PlantCard";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { fetchPlants, type Plant } from "@/lib/supabase/plants";

export default function GardenScreen() {
  const { colors, spacing, type } = useTheme();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlants = useCallback(async () => {
    try {
      const data = await fetchPlants();
      setPlants(data);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlants();
    }, [loadPlants]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.xxl + 72,
          gap: spacing.md,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.brand,
              {
                fontFamily: type.h2.fontFamily,
                fontSize: type.h1.size,
                color: colors.primary,
              },
            ]}
          >
            Mi jardín
          </Text>
        </View>

        {isLoading ? (
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            <LoadingSkeleton width="100%" height={80} />
            <LoadingSkeleton width="100%" height={80} />
          </View>
        ) : plants.length === 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <EmptyState
              illustration="leaf"
              title="Aún no tienes plantas"
              subtitle="Vamos a añadir tu primera. Cada planta tendrá su propio espacio con su historia, fotos y cuidados."
              action={{
                label: "Añadir mi primera planta",
                onPress: () => router.push("/new-plant"),
              }}
            />
          </View>
        ) : (
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onPress={(p) =>
                  router.push({
                    pathname: "/plants/[id]",
                    params: { id: p.id },
                  } as never)
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingActionButton
        onPress={() => router.push("/new-plant")}
        accessibilityLabel="Añadir planta"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {},
});
