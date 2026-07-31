import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/theme";

export default function AppLayout() {
  const { session, isLoading } = useAuth();
  const { colors, type } = useTheme();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/(auth)/login");
    }
  }, [isLoading, session]);

  if (isLoading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontFamily: type.h3.fontFamily,
          fontSize: type.h3.size,
          fontWeight: "600",
        },
        headerShadowVisible: false,
        headerBackTitle: "Volver",
        contentStyle: { backgroundColor: colors.background },
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-plant"
        options={{
          title: "Nueva planta",
        }}
      />
      <Stack.Screen
        name="plants/[id]/index"
        options={{
          title: "Planta",
        }}
      />
      <Stack.Screen
        name="plants/[id]/edit"
        options={{
          title: "Editar planta",
        }}
      />
      <Stack.Screen
        name="plants/[id]/new-entry"
        options={{
          title: "Nueva entrada",
        }}
      />
      <Stack.Screen
        name="plants/[id]/edit-entry"
        options={{
          title: "Editar entrada",
        }}
      />
      <Stack.Screen
        name="plants/[id]/watering"
        options={{
          title: "Recordatorio de riego",
        }}
      />
      <Stack.Screen
        name="watering"
        options={{
          title: "Riegos",
        }}
      />
      <Stack.Screen
        name="chat/index"
        options={{
          title: "Flora",
          headerBackTitle: "Volver",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/chat/new" as never)}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={24}
                color={colors.text.secondary}
              />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="chat/new"
        options={{
          title: "Nuevo chat",
          headerBackTitle: "Cerrar",
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: "Flora",
          headerBackTitle: "Volver",
        }}
      />
    </Stack>
  );
}
