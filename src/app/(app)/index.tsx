import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { Illustration } from "@/components/Illustration";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

function greetingByTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { colors, spacing, type } = useTheme();
  const displayName = (user?.user_metadata?.display_name as string) || "";
  const firstName = displayName.split(" ")[0];
  const greeting = greetingByTime();

  const hasPlants = false;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.brand, { fontFamily: type.display.fontFamily, fontSize: type.h2.size, color: colors.primary }]}>
          Brote
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <MaterialCommunityIcons name="magnify" size={24} color={colors.text.secondary} />
          <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text.secondary} />
        </View>
      </View>

      {/* Greeting */}
      <View style={{ marginTop: spacing.xl }}>
        <Text style={[styles.greetingLabel, { fontFamily: type.body.fontFamily, color: colors.text.secondary }]}>
          ¡{greeting}{firstName ? `, ${firstName}` : ""}! ☀️
        </Text>
        <Text style={[styles.greetingHeading, { fontFamily: type.display.fontFamily, fontSize: type.display.size, color: colors.text.primary }]}>
          Tu jardín está{"\n"}creciendo hermoso 🌿
        </Text>
        <Text style={[styles.greetingSub, { fontFamily: type.body.fontFamily, color: colors.text.secondary }]}>
          Aquí tienes lo que necesita tu atención hoy.
        </Text>
      </View>

      {/* Content: empty state when no plants */}
      {!hasPlants ? (
        <View style={{ marginTop: spacing.xxl }}>
          <EmptyState
            illustration="leaf"
            title="Aún no tienes plantas"
            subtitle="Vamos a añadir tu primera. Cada planta tendrá su propio espacio con su historia, fotos y cuidados."
            action={{ label: "Añadir mi primera planta", onPress: () => {} }}
          />
        </View>
      ) : (
        /* TODO: 004 — plant summary + care cards */
        <View style={{ marginTop: spacing.xl }}>
          <Card style={{ padding: spacing.lg }}>
            <Text style={{ fontFamily: type.body.fontFamily, fontSize: type.body.size, color: colors.text.secondary }}>
              Tienes plantas esperándote.
            </Text>
          </Card>
        </View>
      )}

      {/* Flora AI teaser card — always visible */}
      <View style={{ marginTop: spacing.xl }}>
        <View style={[styles.floraCard, { backgroundColor: colors.muted }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.floraLabel, { fontFamily: type.caption.fontFamily, color: colors.primary }]}>
              PREGUNTA ALGO A
            </Text>
            <Text style={[styles.floraTitle, { fontFamily: type.display.fontFamily, fontSize: type.h1.size, color: colors.primary }]}>
              Flora
            </Text>
            <Text style={[styles.floraSub, { fontFamily: type.caption.fontFamily, color: colors.text.secondary }]}>
              Tu amiga experta{"\n"}en plantas 🌿
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button variant="primary" onPress={() => {}}>
                Hablar con Flora
              </Button>
            </View>
          </View>
          <View style={{ position: "absolute", right: 8, top: 8 }}>
            <Illustration name="flora" size={100} />
          </View>
        </View>
      </View>

      {/* Temporary logout */}
      <View style={{ marginTop: spacing.xxl, alignItems: "center" }}>
        <Button variant="ghost" onPress={signOut}>Cerrar sesión</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontWeight: "700" },
  greetingLabel: { fontSize: 16, marginBottom: 4 },
  greetingHeading: { lineHeight: 40, marginBottom: 8 },
  greetingSub: { fontSize: 16, maxWidth: 250 },
  floraCard: {
    flexDirection: "row",
    padding: 24,
    borderRadius: 22,
    overflow: "hidden" as const,
    minHeight: 180,
  },
  floraLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 1 },
  floraTitle: { fontWeight: "700", marginTop: 4 },
  floraSub: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
