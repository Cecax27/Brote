import { ScrollView, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, type } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl }}
    >
      {/* Placeholder plant info */}
      <Card style={{ padding: spacing.lg, alignItems: "center" }}>
        <Text style={[styles.plantName, { fontFamily: type.display.fontFamily, fontSize: type.display.size, color: colors.text.primary }]}>
          Mi planta
        </Text>
        <Text style={[styles.plantSpecies, { fontFamily: type.body.fontFamily, color: colors.text.secondary }]}>
          ID: {id}
        </Text>
      </Card>

      {/* Placeholder sections */}
      <EmptyState illustration="pot" title="Diario" subtitle="Tu registro de cuidados aparecerá aquí. Próximamente." />
      <EmptyState illustration="flower" title="Fotos" subtitle="Galería de fotos de tu planta. Próximamente." />
      <EmptyState illustration="flora" title="Consulta a Flora" subtitle="Pregunta a Flora sobre esta planta. Próximamente." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  plantName: { marginBottom: 4 },
  plantSpecies: { fontSize: 16, fontStyle: "italic" },
});
