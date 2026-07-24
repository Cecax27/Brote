import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/auth";
import { ThemeProvider } from "@/theme";

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { isLoading: authLoading } = useAuth();

  const [fontsLoaded, fontError] = useFonts({
    "Fraunces9pt-Regular": require("../../assets/fonts/Fraunces9pt-Regular.ttf"),
    "Fraunces9pt-SemiBold": require("../../assets/fonts/Fraunces9pt-SemiBold.ttf"),
    "Fraunces9pt-Bold": require("../../assets/fonts/Fraunces9pt-Bold.ttf"),
    "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
  });

  const isReady = (fontsLoaded || fontError) && !authLoading;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  );
}
