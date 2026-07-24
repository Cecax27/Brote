import { useState, useEffect, useCallback } from "react";
import { Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import * as Linking from "expo-linking";

type ScreenState = "verifying" | "ready" | "submitting" | "done";

function parseHashFragment(fragment: string): Record<string, string> {
  const params: Record<string, string> = {};
  fragment.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
  });
  return params;
}

export default function ResetPasswordScreen() {
  const { session } = useAuth();
  const { colors, spacing, type } = useTheme();
  const [screenState, setScreenState] = useState<ScreenState>("verifying");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleDeepLink = useCallback(async (url: string | null) => {
    if (!url) { setScreenState("ready"); return; }
    const fragment = url.split("#")[1];
    if (!fragment) { setScreenState("ready"); return; }
    const params = parseHashFragment(fragment);
    if (!params.access_token || !params.refresh_token || params.type !== "recovery") {
      setScreenState("ready"); return;
    }
    try { await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token }); }
    catch { setScreenState("ready"); }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener("url", (e) => { handleDeepLink(e.url); });
    return () => sub.remove();
  }, [handleDeepLink]);

  useEffect(() => {
    if (screenState === "verifying" && session) setScreenState("ready");
  }, [session, screenState]);

  const handleSubmit = async () => {
    setError("");
    if (newPassword.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setScreenState("submitting");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
      setScreenState("ready");
    }
  };

  if (screenState === "verifying") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Button loading>Verificando enlace</Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {success ? (
        <View style={styles.sentContainer}>
          <Text style={[styles.successTitle, { fontFamily: type.h1.fontFamily, fontSize: type.h1.size, color: colors.text.primary }]}>
            Contraseña actualizada
          </Text>
          <Text style={[styles.sentText, { color: colors.text.primary, fontFamily: type.body.fontFamily }]}>
            Tu contraseña se ha cambiado correctamente.
          </Text>
          <Button onPress={() => router.replace("/")}>Ir al inicio</Button>
        </View>
      ) : (
        <>
          <Text style={[styles.title, { fontFamily: type.h1.fontFamily, fontSize: type.h1.size, color: colors.text.primary }]}>
            Nueva contraseña
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontFamily: type.body.fontFamily }]}>
            Elige una contraseña nueva para tu cuenta.
          </Text>

          {error ? <Text style={[styles.error, { color: colors.accent.terracotta, fontFamily: type.bodySmall.fontFamily }]}>{error}</Text> : null}

          <Input placeholder="Nueva contraseña" value={newPassword}
            onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" editable={screenState === "ready"} />
          <Input placeholder="Confirmar contraseña" value={confirmPassword}
            onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" editable={screenState === "ready"} />

          <View style={{ marginTop: spacing.sm }}>
            <Button onPress={handleSubmit} loading={screenState === "submitting"} style={styles.fullButton}>
              Cambiar contraseña
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 36, textAlign: "center" },
  error: { fontSize: 14, marginBottom: 16, textAlign: "center" },
  fullButton: { minWidth: 340 },
  successTitle: { marginBottom: 12 },
  sentContainer: { alignItems: "center", paddingHorizontal: 16 },
  sentText: { fontSize: 16, textAlign: "center", lineHeight: 22, marginBottom: 32, maxWidth: 320 },
});
