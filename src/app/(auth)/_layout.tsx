import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && session) {
      router.replace("/");
    }
  }, [isLoading, session]);

  if (isLoading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
