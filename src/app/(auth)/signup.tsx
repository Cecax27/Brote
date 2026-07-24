import { useState } from "react";
import { Text, View, StyleSheet, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

const logo = require("@/assets/images/logo.png");

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { colors, type } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    if (!email.trim()) { setError("El correo es obligatorio."); return; }
    if (!email.includes("@")) { setError("Introduce un correo válido."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try { await signUp({ email: email.trim(), password, displayName: displayName.trim() }); router.replace("/"); }
    catch (e) { setError(e instanceof Error ? e.message : "Algo salió mal."); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { fontFamily: type.h1.fontFamily, fontSize: type.h1.size, lineHeight: type.h1.lineHeight, color: colors.text.primary }]}>
          Crear cuenta
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary, fontFamily: type.body.fontFamily, fontSize: type.body.size }]}>
          Empieza a cuidar de tus plantas
        </Text>
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.accent.terracotta, fontFamily: type.bodySmall.fontFamily, fontSize: type.bodySmall.size }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.form}>
        <Input
          label="Nombre"
          placeholder="Cómo te llamaremos"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          editable={!loading}
          wrapperStyle={styles.inputWrapper}
        />
        <Input
          label="Correo electrónico"
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
          wrapperStyle={styles.inputWrapper}
        />
        <Input
          label="Contraseña"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading}
          wrapperStyle={styles.inputWrapper}
        />
        <Input
          label="Confirmar contraseña"
          placeholder="Repite tu contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading}
          wrapperStyle={styles.inputWrapper}
        />

        <Button onPress={handleSignup} loading={loading} style={styles.fullButton}>
          Crear cuenta
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={{ color: colors.text.secondary, fontFamily: type.bodySmall.fontFamily, fontSize: type.bodySmall.size }}>
          ¿Ya tienes cuenta?{" "}
        </Text>
        <Pressable onPress={() => router.replace("/(auth)/login")}>
          <Text style={[styles.linkText, { color: colors.primary, fontFamily: type.bodyMedium.fontFamily }]}>
            Iniciar sesión
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 0,
  },
  form: {
    width: "100%",
    gap: 16,
  },
  inputWrapper: {
    width: "100%",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  fullButton: {
    minWidth: "100%",
    marginTop: 4,
  },
  error: {
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 48,
  },
});
