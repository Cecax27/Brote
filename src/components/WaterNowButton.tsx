import { useCallback, useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from "react-native-reanimated";
import { waterNow } from "@/lib/supabase/watering-schedules";
import type { WateringSchedule } from "@/lib/supabase/watering-schedules";
import type { Plant } from "@/lib/supabase/plants";

type Props = {
  plant: Plant;
  onWatered?: (schedule: WateringSchedule | null) => void;
};

export function WaterNowButton({ plant, onWatered }: Props) {
  const { colors, type, motion } = useTheme();
  const [justWatered, setJustWatered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(async () => {
    if (isLoading || justWatered) return;
    setIsLoading(true);
    setError(null);
    scale.value = withTiming(0.97, { duration: motion.duration.micro });

    try {
      const result = await waterNow(plant.id);
      setJustWatered(true);
      scale.value = withTiming(1, { duration: motion.duration.micro });
      onWatered?.(result);

      setTimeout(() => {
        setJustWatered(false);
      }, 2000);
    } catch {
      setError("No se pudo registrar el riego. Inténtalo de nuevo.");
      scale.value = withTiming(1, { duration: motion.duration.micro });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, justWatered, plant.id, onWatered, motion, scale]);

  if (error) {
    return (
      <Text
        style={[
          styles.error,
          {
            fontFamily: type.caption.fontFamily,
            fontSize: type.caption.size,
            color: colors.accent.terracotta,
          },
        ]}
      >
        {error}
      </Text>
    );
  }

  return (
    <Pressable onPress={handlePress} disabled={isLoading || justWatered}>
      <Animated.View
        style={[
          styles.button,
          animatedStyle,
          {
            backgroundColor: justWatered ? colors.secondary : colors.primary,
            borderRadius: 20,
            opacity: isLoading ? 0.5 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={justWatered ? "check-circle-outline" : "watering-can-outline"}
          size={16}
          color={colors.background}
        />
        <Text
          style={[
            styles.label,
            {
              fontFamily: type.bodySmall.fontFamily,
              fontSize: type.bodySmall.size,
              color: colors.background,
            },
          ]}
        >
          {justWatered ? "Regada ✓" : "Regar"}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  label: {
    fontWeight: "500",
  },
  error: {
    textAlign: "center",
  },
});
