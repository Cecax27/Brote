import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";
import { FloraAvatar } from "@/components/FloraAvatar";

type Props = {
  isTyping: boolean;
};

function TypingLeaf({ delay }: { delay: number }) {
  const { colors, motion } = useTheme();
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withRepeat(
      withDelay(
        delay,
        withTiming(1, {
          duration: motion.duration.slow,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
  }, [opacity, delay, motion.duration.slow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <MaterialCommunityIcons
        name="leaf"
        size={14}
        color={colors.secondary}
      />
    </Animated.View>
  );
}

export function FloraTypingIndicator({ isTyping }: Props) {
  if (!isTyping) return null;

  return (
    <View style={styles.row}>
      <FloraAvatar mood="idle" size={28} />
      <View style={styles.leaves}>
        <TypingLeaf delay={0} />
        <TypingLeaf delay={200} />
        <TypingLeaf delay={400} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  leaves: {
    flexDirection: "row",
    gap: 4,
    marginLeft: 8,
    paddingBottom: 6,
  },
});
