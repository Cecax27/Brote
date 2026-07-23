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

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }
    if (!password) {
      setError("La contraseña es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brote</Text>
      <Text style={styles.subtitle}>
        Tu compañero de plantas
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

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#9AAD98"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push("/(auth)/forgot-password")}
      >
        <Text style={styles.linkText}>Olvidé mi contraseña</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
          <Text style={styles.linkText}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3F2A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7B6A",
    marginBottom: 36,
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
  linkButton: {
    marginBottom: 24,
  },
  linkText: {
    color: "#4A7C59",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 48,
  },
  footerText: {
    color: "#6B7B6A",
    fontSize: 14,
  },
});
