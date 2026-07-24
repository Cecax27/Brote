import { useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  CameraView,
  type CameraCapturedPicture,
  useCameraPermissions,
} from "expo-camera";
import { useTheme } from "@/theme";
import { Button } from "@/components/Button";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  decodeLuminanceFromJPEG,
  loadCalibration,
  saveCalibration,
  estimateLux,
  type CalibrationData,
} from "@/lib/lux-meter";

type CalibrationStep = "idle" | "step1" | "step2";

export default function LightMeterScreen() {
  const { colors, spacing, type, radii } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId?: string; calibrate?: string }>();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(true);
  const [calStep, setCalStep] = useState<CalibrationStep>(
    params.calibrate === "1" ? "step1" : "idle",
  );
  const [calBright, setCalBright] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const captureLuminance = useCallback(async (): Promise<number> => {
    if (!cameraRef.current) throw new Error("Camera not ready");

    const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({
      base64: true,
      quality: 0.1,
      shutterSound: false,
    });

    if (!photo?.base64) {
      throw new Error("No se pudo capturar la imagen");
    }

    const base64 = photo.base64.startsWith("data:")
      ? photo.base64
      : `data:image/jpeg;base64,${photo.base64}`;

    return decodeLuminanceFromJPEG(base64);
  }, []);

  const handleMeasure = useCallback(async () => {
    setIsMeasuring(true);
    setError(null);
    try {
      const raw = await captureLuminance();
      const cal = await loadCalibration();
      const lux = cal ? estimateLux(raw, cal) : Math.round(raw * 100);

      router.push({
        pathname: "/light-result",
        params: {
          deviceLux: String(lux),
          ...(cal ? { calibratedLux: String(lux) } : {}),
          ...(params.plantId ? { plantId: params.plantId } : {}),
        },
      } as never);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "No se pudo medir la luz. Inténtalo de nuevo.";
      setError(msg);
    } finally {
      setIsMeasuring(false);
    }
  }, [captureLuminance, params.plantId, router]);

  const handleCalStep1 = useCallback(async () => {
    setIsMeasuring(true);
    setError(null);
    try {
      const raw = await captureLuminance();
      setCalBright(raw);
      setCalStep("step2");
    } catch (e) {
      setError("No se pudo medir. Inténtalo de nuevo.");
    } finally {
      setIsMeasuring(false);
    }
  }, [captureLuminance]);

  const handleCalStep2 = useCallback(async () => {
    if (calBright === null) return;
    setIsMeasuring(true);
    setError(null);
    try {
      const raw = await captureLuminance();
      const cal: CalibrationData = {
        brightRef: Math.max(calBright, raw + 10),
        darkRef: Math.min(raw, calBright - 10),
      };
      await saveCalibration(cal);
      setCalStep("idle");
      setCalBright(null);
      Alert.alert("Calibración guardada", "Ya puedes medir la luz con precisión.");
    } catch (e) {
      setError("No se pudo guardar la calibración. Inténtalo de nuevo.");
    } finally {
      setIsMeasuring(false);
    }
  }, [calBright, captureLuminance]);

  const handleCancelCal = useCallback(() => {
    setCalStep("idle");
    setCalBright(null);
  }, []);

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.hint, { color: colors.text.secondary, fontFamily: type.body.fontFamily }]}>
          Cargando permisos…
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingHorizontal: spacing.lg,
            justifyContent: "center",
            alignItems: "center",
            gap: spacing.lg,
          },
        ]}
      >
        <MaterialCommunityIcons name="camera-off" size={48} color={colors.text.secondary} />
        <Text
          style={[
            styles.hint,
            {
              color: colors.text.primary,
              fontFamily: type.body.fontFamily,
              fontSize: type.body.size,
              textAlign: "center",
            },
          ]}
        >
          Brote necesita acceso a la cámara para medir la luz ambiental.
        </Text>
        <Button variant="primary" onPress={requestPermission}>
          Permitir acceso
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Reticle */}
        <View style={styles.reticleContainer}>
          <View
            style={[
              styles.reticle,
              { borderColor: "rgba(255,255,255,0.6)" },
            ]}
          />
        </View>

        {/* Hint / calibration instructions */}
        <View style={styles.topHint}>
          {calStep === "idle" ? (
            <Text
              style={[
                styles.hint,
                {
                  color: colors.background,
                  fontFamily: type.bodyMedium.fontFamily,
                },
              ]}
            >
              Apunta hacia la luz que quieres medir
            </Text>
          ) : calStep === "step1" ? (
            <View style={{ gap: 8 }}>
              <Text
                style={[
                  styles.calTitle,
                  { fontFamily: type.h3.fontFamily, color: colors.background },
                ]}
              >
                Paso 1 de 2
              </Text>
              <Text
                style={[
                  styles.hint,
                  { color: "rgba(255,255,255,0.8)", fontFamily: type.body.fontFamily },
                ]}
              >
                Apunta hacia la luz más brillante que tengas (junto a una ventana con sol)
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text
                style={[
                  styles.calTitle,
                  { fontFamily: type.h3.fontFamily, color: colors.background },
                ]}
              >
                Paso 2 de 2
              </Text>
              <Text
                style={[
                  styles.hint,
                  { color: "rgba(255,255,255,0.8)", fontFamily: type.body.fontFamily },
                ]}
              >
                Ahora apunta a una zona de sombra completa
              </Text>
            </View>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.accent.terracotta, borderRadius: radii.input },
            ]}
          >
            <Text
              style={[
                styles.errorText,
                { fontFamily: type.bodySmall.fontFamily, color: colors.background },
              ]}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {calStep === "idle" ? (
            <>
              <Pressable
                onPress={() => setCalStep("step1")}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderRadius: radii.button,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="tune-variant"
                  size={22}
                  color={colors.background}
                />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  variant="primary"
                  onPress={handleMeasure}
                  loading={isMeasuring}
                  disabled={isMeasuring}
                >
                  {isMeasuring ? "Midiendo…" : "Medir luz"}
                </Button>
              </View>
            </>
          ) : (
            <>
              <Button variant="ghost" onPress={handleCancelCal} style={{ flex: 1 }}>
                Cancelar
              </Button>
              <View style={{ flex: 1 }}>
                <Button
                  variant="primary"
                  onPress={calStep === "step1" ? handleCalStep1 : handleCalStep2}
                  loading={isMeasuring}
                  disabled={isMeasuring}
                >
                  {isMeasuring ? "Midiendo…" : calStep === "step1" ? "Medir luz brillante" : "Medir sombra"}
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  reticleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reticle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  topHint: {
    position: "absolute",
    top: 80,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  hint: {
    fontSize: 16,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  calTitle: {
    fontSize: 20,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  errorBanner: {
    position: "absolute",
    top: 160,
    left: 24,
    right: 24,
    padding: 12,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  bottomControls: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    alignItems: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
