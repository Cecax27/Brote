import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/auth";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError("");

    if (!email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }
    if (!email.includes("@")) {
      setError("Introduce un correo válido.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar contraseña</Text>

      {sent ? (
        <View style={styles.sentContainer}>
          <Text style={styles.sentText}>
            Te hemos enviado un correo con las instrucciones para restablecer tu
            contraseña. Revisa tu bandeja de entrada.
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.linkText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>
            Escribe tu correo y te enviaremos un enlace para crear una nueva
            contraseña.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#9AAD98"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Enviar enlace</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.linkText}>Volver al inicio de sesión</Text>
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
    lineHeight: 20,
    maxWidth: 320,
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
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    color: "#4A7C59",
    fontSize: 14,
    fontWeight: "600",
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
