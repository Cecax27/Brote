import { useState, useEffect, useCallback } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth";
import * as Linking from "expo-linking";

type ScreenState = "verifying" | "ready" | "submitting" | "done";

function parseHashFragment(fragment: string): Record<string, string> {
  const params: Record<string, string> = {};
  fragment.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
    }
  });
  return params;
}

export default function ResetPasswordScreen() {
  const { session } = useAuth();
  const [screenState, setScreenState] = useState<ScreenState>("verifying");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleDeepLink = useCallback(async (url: string | null) => {
    if (!url) {
      setScreenState("ready");
      return;
    }

    const fragment = url.split("#")[1];
    if (!fragment) {
      setScreenState("ready");
      return;
    }

    const params = parseHashFragment(fragment);
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;
    const type = params.type;

    if (!accessToken || !refreshToken || type !== "recovery") {
      setScreenState("ready");
      return;
    }

    try {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch {
      setScreenState("ready");
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleDeepLink);

    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  useEffect(() => {
    if (screenState === "verifying" && session) {
      setScreenState("ready");
    }
  }, [session, screenState]);

  const handleSubmit = async () => {
    setError("");

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setScreenState("submitting");
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cambiar la contraseña.",
      );
      setScreenState("ready");
    }
  };

  if (screenState === "verifying") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A7C59" />
        <Text style={styles.verifyingText}>Verificando enlace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {success ? (
        <View style={styles.sentContainer}>
          <Text style={styles.successTitle}>
            Contraseña actualizada
          </Text>
          <Text style={styles.sentText}>
            Tu contraseña se ha cambiado correctamente.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.primaryButtonText}>Ir al inicio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Nueva contraseña</Text>
          <Text style={styles.subtitle}>
            Elige una contraseña nueva para tu cuenta.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor="#9AAD98"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={screenState === "ready"}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#9AAD98"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={screenState === "ready"}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              screenState === "submitting" && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={screenState === "submitting"}
          >
            {screenState === "submitting" ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Cambiar contraseña</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8F3",
    padding: 24,
  },
  verifyingText: {
    fontSize: 16,
    color: "#6B7B6A",
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3F2A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7B6A",
    marginBottom: 36,
    textAlign: "center",
  },
  error: {
    color: "#C44D34",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 340,
    height: 48,
    borderWidth: 1,
    borderColor: "#C5D1C1",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#2D3F2A",
    backgroundColor: "#FFF",
    marginBottom: 12,
  },
  primaryButton: {
    width: "100%",
    maxWidth: 340,
    height: 48,
    backgroundColor: "#4A7C59",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3F2A",
    marginBottom: 12,
  },
  sentContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sentText: {
    color: "#2D3F2A",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
});
