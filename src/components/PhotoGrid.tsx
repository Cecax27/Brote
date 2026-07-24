import { useMemo, useCallback } from "react";
import { View, FlatList, Dimensions, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/theme";
import { EmptyState } from "@/components/EmptyState";

const GAP = 4;
const NUM_COLUMNS = 3;

type Props = {
  photos: string[];
};

function PhotoCell({ uri }: { uri: string }) {
  const { radii } = useTheme();

  return (
    <View style={styles.cell}>
      <Image
        source={{ uri }}
        style={[styles.image, { borderRadius: radii.input }]}
        contentFit="cover"
        transition={300}
      />
    </View>
  );
}

export function PhotoGrid({ photos }: Props) {
  const screenWidth = Dimensions.get("window").width;
  const horizontalPadding = 48;
  const availableWidth = screenWidth - horizontalPadding;
  const itemSize = (availableWidth - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const data = useMemo(() => photos.map((uri) => ({ id: uri, uri })), [photos]);

  const renderItem = useCallback(
    ({ item }: { item: { id: string; uri: string } }) => (
      <PhotoCell uri={item.uri} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: { id: string }) => item.id, []);

  if (photos.length === 0) {
    return (
      <EmptyState
        illustration="flower"
        title="Aún no hay fotos"
        subtitle="Las fotos que añadas de tu planta aparecerán aquí."
      />
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      scrollEnabled={false}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP }}
      getItemLayout={(_, index) => ({
        length: itemSize,
        offset: (itemSize + GAP) * Math.floor(index / NUM_COLUMNS),
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
