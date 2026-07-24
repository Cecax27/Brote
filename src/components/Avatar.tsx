import { View, Text, Image, type ViewStyle, type TextStyle } from "react-native";
import { useTheme } from "@/theme";

type Props = {
  source?: { uri: string } | null;
  name?: string;
  size?: number;
};

export function Avatar({ source, name, size = 40 }: Props) {
  const { colors, type } = useTheme();

  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  const container: ViewStyle & { borderRadius: number } = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const text: TextStyle = {
    color: colors.background,
    fontFamily: type.bodyMedium.fontFamily,
    fontSize: size * 0.4,
    fontWeight: type.bodyMedium.fontWeight as TextStyle["fontWeight"],
  };

  if (source?.uri) {
    return <Image source={source} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={container}>
      <Text style={text}>{initial}</Text>
    </View>
  );
}
