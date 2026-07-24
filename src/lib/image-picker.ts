import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type PhotoSource = "camera" | "gallery" | null;

export async function pickPhotoSource(): Promise<PhotoSource> {
  return new Promise((resolve) => {
    Alert.alert(
      "Foto de la planta",
      "¿Cómo quieres añadir la foto?",
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
        { text: "Tomar foto", onPress: () => resolve("camera") },
        {
          text: "Elegir de galería",
          onPress: () => resolve("gallery"),
        },
      ],
    );
  });
}

export async function openImagePicker(
  source: "camera" | "gallery",
): Promise<ImagePicker.ImagePickerAsset | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
    aspect: [4, 3],
  };

  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a la cámara para tomar fotos de tus plantas. Puedes habilitarlo en los ajustes de tu dispositivo.",
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync(options);
    return result.assets?.[0] ?? null;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permiso denegado",
      "Necesitamos acceso a la galería para seleccionar fotos. Puedes habilitarlo en los ajustes de tu dispositivo.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync(options);
  return result.assets?.[0] ?? null;
}
