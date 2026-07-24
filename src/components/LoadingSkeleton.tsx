import { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  lines?: number;
};

export function LoadingSkeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  lines = 1,
}: Props) {
  const { colors, motion } = useTheme();

  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: motion.duration.slow }),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const bar: ViewStyle = {
    width: width as number,
    height,
    borderRadius,
    backgroundColor: colors.muted,
  };

  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Animated.View key={i} style={[bar, animatedStyle]} />
      ))}
    </View>
  );
}
