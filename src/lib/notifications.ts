import {
  AndroidImportance,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
  addNotificationResponseReceivedListener,
} from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";

export async function requestNotificationPermissions(): Promise<boolean> {
  const { granted } = await requestPermissionsAsync();
  return granted;
}

export async function checkNotificationPermissions(): Promise<boolean> {
  const { granted } = await getPermissionsAsync();
  return granted;
}

export async function ensureWateringChannel(): Promise<void> {
  await setNotificationChannelAsync("watering", {
    name: "Riegos",
    importance: AndroidImportance.HIGH,
  });
}

export function setupNotifications(
  onResponse: (plantId: string) => void,
): () => void {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  ensureWateringChannel();

  let sub: { remove: () => void } | null = null;

  sub = addNotificationResponseReceivedListener(
    (response: NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.plantId && typeof data.plantId === "string") {
        onResponse(data.plantId);
      }
    },
  );

  return () => {
    sub?.remove();
  };
}
