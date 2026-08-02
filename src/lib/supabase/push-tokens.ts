import { Platform } from "react-native";
import { getExpoPushTokenAsync, getPermissionsAsync } from "expo-notifications";
import { supabase } from "./client";

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const perm = await getPermissionsAsync();
    if (!perm.granted) return null;

    const { data: token } = await getExpoPushTokenAsync({
      projectId: "b8b598c9-101c-4ad9-851c-dc81ba676eac",
    });

    return token;
  } catch {
    return null;
  }
}

export async function registerPushToken(token: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("push_tokens")
    .select("id")
    .eq("token", token)
    .maybeSingle();

  if (existing) return;

  await supabase.from("push_tokens").insert({
    user_id: user.id,
    token,
  });
}

export async function unregisterPushToken(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (Platform.OS !== "web") {
    try {
      const { data: currentToken } = await getExpoPushTokenAsync({
        projectId: "b8b598c9-101c-4ad9-851c-dc81ba676eac",
      });
      if (currentToken) {
        await supabase
          .from("push_tokens")
          .delete()
          .eq("token", currentToken);
      }
    } catch {
      // Token fetch may fail if permissions were revoked
    }
  }

  // Also cleanup any stale tokens for this user
  await supabase.from("push_tokens").delete().eq("user_id", user.id);
}
