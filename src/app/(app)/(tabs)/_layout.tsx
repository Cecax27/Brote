import { Tabs } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/theme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function tabIcon(name: IconName) {
  return function renderTabIcon({ color, size }: { color: string; size: number }) {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  };
}

export default function TabsLayout() {
  const { colors, type } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: type.caption.fontFamily,
          fontSize: type.caption.size,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: tabIcon("home-variant-outline"),
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: "Mi jardín",
          tabBarIcon: tabIcon("sprout-outline"),
        }}
      />
      <Tabs.Screen
        name="flora"
        options={{
          title: "Flora",
          tabBarIcon: tabIcon("flower-outline"),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: tabIcon("cog-outline"),
        }}
      />
    </Tabs>
  );
}
