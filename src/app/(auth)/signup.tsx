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

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");

    if (!email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }
    if (!email.includes("@")) {
      setError("Introduce un correo válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Empieza a cuidar de tus plantas</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Nombre (cómo te llamaremos)"
        placeholderTextColor="#9AAD98"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        editable={!loading}
      />

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
        autoComplete="new-password"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar contraseña"
        placeholderTextColor="#9AAD98"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Crear cuenta</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.linkText}>Iniciar sesión</Text>
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
    fontSize: 28,
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
