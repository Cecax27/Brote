import { View, Text, StyleSheet, Linking, Platform } from "react-native";
import { useTheme } from "@/theme";
import { Button } from "@/components/Button";
import { requestNotificationPermissions } from "@/lib/notifications";
import { getExpoPushToken, registerPushToken } from "@/lib/supabase/push-tokens";

type Props = {
  onDismiss: () => void;
};

export function NotificationPermissionBanner({ onDismiss }: Props) {
  const { colors, spacing, radii, shadows, type } = useTheme();

  async function handleEnable() {
    const granted = await requestNotificationPermissions();

    if (granted) {
      const token = await getExpoPushToken();
      if (token) {
        await registerPushToken(token);
      }
      onDismiss();
    } else {
      if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
      } else {
        Linking.openSettings();
      }
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.card,
          padding: spacing.lg,
          ...shadows.soft,
        },
      ]}
    >
      <Text
        style={[
          styles.message,
          {
            fontFamily: type.bodyMedium.fontFamily,
            fontSize: type.bodyMedium.size,
            color: colors.text.primary,
          },
        ]}
      >
        Activa las notificaciones y te avisamos cuando toque regar tus plantas.
      </Text>
      <View style={styles.actions}>
        <Button variant="ghost" onPress={onDismiss}>
          Ahora no
        </Button>
        <Button variant="primary" onPress={handleEnable}>
          Activar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  message: {
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
