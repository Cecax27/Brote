import { useState } from "react";
import { Text, View, StyleSheet, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

const logo = require("@/assets/images/logo.png");

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { colors, type } = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError("");
    if (!email.trim()) { setError("El correo es obligatorio."); return; }
    if (!email.includes("@")) { setError("Introduce un correo válido."); return; }
    setLoading(true);
    try { await resetPassword(email.trim()); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Algo salió mal."); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { fontFamily: type.h1.fontFamily, fontSize: type.h1.size, lineHeight: type.h1.lineHeight, color: colors.text.primary }]}>
          Recuperar contraseña
        </Text>
      </View>

      {sent ? (
        <View style={styles.sentContainer}>
          <Text style={[styles.sentText, { color: colors.text.primary, fontFamily: type.body.fontFamily, fontSize: type.body.size, lineHeight: type.body.lineHeight }]}>
            Te hemos enviado un correo con las instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada.
          </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={[styles.linkText, { color: colors.primary, fontFamily: type.bodyMedium.fontFamily }]}>Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={[styles.subtitle, { color: colors.text.secondary, fontFamily: type.body.fontFamily, fontSize: type.body.size, lineHeight: type.body.lineHeight }]}>
            Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </Text>

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

            <Button onPress={handleReset} loading={loading} style={styles.fullButton}>
              Enviar enlace
            </Button>
          </View>

          <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backLink}>
            <Text style={[styles.linkText, { color: colors.primary, fontFamily: type.bodyMedium.fontFamily }]}>Volver al inicio de sesión</Text>
          </Pressable>
        </>
      )}
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
    marginBottom: 0,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 32,
  },
  form: {
    width: "100%",
    gap: 16,
  },
  inputWrapper: {
    width: "100%",
  },
  backLink: {
    marginTop: 24,
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
  sentContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sentText: {
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 320,
  },
});
