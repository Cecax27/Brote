import { ScrollView, Text, View, StyleSheet, Alert } from "react-native";
import { useTheme } from "@/theme";
import { useAuth } from "@/context/auth";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { SettingsLinkRow } from "@/components/SettingsLinkRow";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { colors, spacing, type, radii, shadows } = useTheme();

  const displayName = (user?.user_metadata?.display_name as string) || "";
  const email = user?.email ?? "";

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxl,
      }}
    >
      {/* Header */}
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
        Ajustes
      </Text>

      {/* Profile card */}
      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.card,
            ...shadows.soft,
          },
        ]}
      >
        <Avatar name={displayName} size={56} />
        <View style={styles.profileText}>
          <Text
            style={[
              styles.profileName,
              {
                fontFamily: type.h3.fontFamily,
                fontSize: type.h3.size,
                color: colors.text.primary,
              },
            ]}
          >
            {displayName || "Usuario"}
          </Text>
          {email ? (
            <Text
              style={{
                fontFamily: type.bodySmall.fontFamily,
                fontSize: type.bodySmall.size,
                color: colors.text.secondary,
              }}
            >
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Account section */}
      <Text
        style={[
          styles.sectionLabel,
          {
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.text.secondary,
          },
        ]}
      >
        CUENTA
      </Text>
      <Button variant="destructive" onPress={handleSignOut}>
        Cerrar sesión
      </Button>

      {/* Information section */}
      <Text
        style={[
          styles.sectionLabel,
          {
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.text.secondary,
          },
        ]}
      >
        INFORMACIÓN
      </Text>
      <View
        style={[
          styles.linksCard,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.card,
            ...shadows.soft,
          },
        ]}
      >
        <SettingsLinkRow
          icon="shield-check-outline"
          label="Política de privacidad"
          url="https://brote-ashen.vercel.app/privacy"
          showDivider
        />
        <SettingsLinkRow
          icon="file-document-outline"
          label="Términos del servicio"
          url="https://brote-ashen.vercel.app/terms"
          showDivider
        />
        <SettingsLinkRow
          icon="newspaper-variant-outline"
          label="Blog"
          url="https://brote-ashen.vercel.app/blog"
          showDivider
        />
        <SettingsLinkRow
          icon="github"
          label="GitHub"
          url="https://github.com/Cecax27/Brote"
          showDivider
        />
        <SettingsLinkRow
          icon="bug-outline"
          label="Guía para reportar errores"
          url="https://brote-ashen.vercel.app/#guide"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  brand: {},
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 32,
    padding: 20,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginTop: 32,
    marginBottom: 12,
  },
  linksCard: {
    paddingHorizontal: 16,
  },
});
