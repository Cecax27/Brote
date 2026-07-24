import { useState } from "react";
import { Text, View, StyleSheet, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

const logo = require("@/assets/images/logo.png");

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors, type } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) { setError("El correo es obligatorio."); return; }
    if (!password) { setError("La contraseña es obligatoria."); return; }
    setLoading(true);
    try { await signIn({ email: email.trim(), password }); router.replace("/"); }
    catch (e) { setError(e instanceof Error ? e.message : "Algo salió mal."); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { fontFamily: type.display.fontFamily, fontSize: type.display.size, lineHeight: type.display.lineHeight, color: colors.text.primary }]}>
          Brote
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary, fontFamily: type.body.fontFamily, fontSize: type.body.size }]}>
          Tu compañero de plantas
        </Text>
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.accent.terracotta, fontFamily: type.bodySmall.fontFamily, fontSize: type.bodySmall.size }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.form}>
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
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          editable={!loading}
          wrapperStyle={styles.inputWrapper}
        />

        <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={styles.forgotLink}>
          <Text style={[styles.linkText, { color: colors.primary, fontFamily: type.bodyMedium.fontFamily }]}>
            Olvidé mi contraseña
          </Text>
        </Pressable>

        <Button onPress={handleLogin} loading={loading} style={styles.fullButton}>
          Entrar
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={{ color: colors.text.secondary, fontFamily: type.bodySmall.fontFamily, fontSize: type.bodySmall.size }}>
          ¿No tienes cuenta?{" "}
        </Text>
        <Pressable onPress={() => router.replace("/(auth)/signup")}>
          <Text style={[styles.linkText, { color: colors.primary, fontFamily: type.bodyMedium.fontFamily }]}>
            Crear cuenta
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
    width: 80,
    height: 80,
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
  forgotLink: {
    alignItems: "flex-end",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  fullButton: {
    minWidth: "100%",
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
