import { View, ViewStyle } from "react-native";
import { Image } from "expo-image";

const FloraIdle = require("../../assets/images/illustrations/Flora/Simple Flora.png");
const FloraRainy = require("../../assets/images/illustrations/Flora/Flora in rain.png");
const FloraHot = require("../../assets/images/illustrations/Flora/Hot flora, in a warmer day.png");
const FloraConfused = require("../../assets/images/illustrations/Flora/Flora with a confused expression, as if she were in doubt.png");

const moodImageMap: Record<string, number> = {
  idle: FloraIdle,
  rainy: FloraRainy,
  hot: FloraHot,
  confused: FloraConfused,
};

export type FloraMood = "idle" | "rainy" | "hot" | "confused";

type Props = {
  mood?: FloraMood;
  size?: number;
  style?: ViewStyle;
};

export function FloraAvatar({ mood = "idle", size = 72, style }: Props) {
  const source = moodImageMap[mood] ?? moodImageMap.idle;

  return (
    <View style={[{ width: size, height: size, overflow: "hidden" }, style]}>
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </View>
  );
}
