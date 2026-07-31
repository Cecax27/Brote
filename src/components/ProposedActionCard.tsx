import { Text, View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import { FloraAvatar } from "@/components/FloraAvatar";
import { Button } from "@/components/Button";
import type { ProposedAction } from "@/lib/agent";

type ActionStatus = "idle" | "executing" | "executed" | "rejected" | "error";

type Props = {
  action: ProposedAction;
  status: ActionStatus;
  error?: string;
  onAccept: () => void;
  onReject: () => void;
};

const ACTION_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  create_watering_schedule: "water",
  add_journal_entry: "pencil",
};

export function ProposedActionCard({
  action,
  status,
  error,
  onAccept,
  onReject,
}: Props) {
  const { colors, type, radii, shadows } = useTheme();

  if (status === "rejected") return null;

  const iconName = ACTION_ICONS[action.action_type] ?? "check-circle";
  const isPending = status === "idle";
  const isExecuting = status === "executing";

  return (
    <View style={styles.row}>
      <View style={styles.avatarCol}>
        <FloraAvatar mood="idle" size={28} />
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.card,
            borderColor: colors.border,
          },
          shadows.resting,
        ]}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons
            name={iconName}
            size={20}
            color={colors.primary}
          />
          <Text
            style={[
              {
                fontFamily: type.h3.fontFamily,
                fontSize: type.h3.size,
                lineHeight: type.h3.lineHeight,
                color: colors.text.primary,
              },
              styles.title,
            ]}
          >
            {action.title}
          </Text>
        </View>

        <Text
          style={[
            {
              fontFamily: type.body.fontFamily,
              fontSize: type.body.size,
              lineHeight: type.body.lineHeight,
              color: colors.text.secondary,
            },
            styles.summary,
          ]}
        >
          {action.summary_es}
        </Text>

        {status === "executed" ? (
          <View style={styles.executedRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={colors.primary}
            />
            <Text
              style={[
                {
                  fontFamily: type.bodyMedium.fontFamily,
                  fontSize: type.bodySmall.size,
                  lineHeight: type.bodySmall.lineHeight,
                  color: colors.primary,
                },
                styles.executedText,
              ]}
            >
              Listo
            </Text>
          </View>
        ) : status === "error" ? (
          <View>
            <Text
              style={[
                {
                  fontFamily: type.bodySmall.fontFamily,
                  fontSize: type.bodySmall.size,
                  lineHeight: type.bodySmall.lineHeight,
                  color: colors.accent.terracotta,
                },
                styles.errorText,
              ]}
            >
              {error ?? "No se pudo ejecutar la acción."}
            </Text>
            <View style={styles.buttonsRow}>
              <Button variant="ghost" onPress={onReject}>
                Cancelar
              </Button>
              <Button onPress={onAccept}>Reintentar</Button>
            </View>
          </View>
        ) : (
          <View style={styles.buttonsRow}>
            {isPending && (
              <Pressable
                onPress={onReject}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text
                  style={{
                    fontFamily: type.bodyMedium.fontFamily,
                    fontSize: type.bodySmall.size,
                    lineHeight: type.bodySmall.lineHeight,
                    color: colors.text.secondary,
                  }}
                >
                  Rechazar
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onAccept}
              disabled={!isPending}
              style={({ pressed }) => [
                styles.acceptBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.button,
                  opacity: isExecuting ? 0.7 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {isExecuting && (
                <ActivityIndicator
                  size="small"
                  color={colors.background}
                  style={styles.acceptSpinner}
                />
              )}
              <Text
                style={{
                  fontFamily: type.bodyMedium.fontFamily,
                  fontSize: type.bodySmall.size,
                  lineHeight: type.bodySmall.lineHeight,
                  color: colors.background,
                }}
              >
                {isExecuting ? "Guardando…" : "Aceptar"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    maxWidth: "85%",
  },
  avatarCol: {
    marginRight: 8,
    alignSelf: "flex-end",
  },
  card: {
    padding: 14,
    borderWidth: 1,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    marginLeft: 8,
    flex: 1,
  },
  summary: {
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  acceptSpinner: {
    marginRight: 6,
  },
  executedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  executedText: {
    marginLeft: 6,
  },
  errorText: {
    marginBottom: 10,
  },
});
