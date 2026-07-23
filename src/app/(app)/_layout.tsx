import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/(auth)/login");
    }
  }, [isLoading, session]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
