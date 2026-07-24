import {
  AndroidImportance,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
  scheduleNotificationAsync,
  getAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  addNotificationResponseReceivedListener,
} from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import type { WateringScheduleWithPlant } from "./supabase/watering-schedules";

const NOTIFICATION_PREFIX = "watering-";

export async function requestNotificationPermissions(): Promise<boolean> {
  const { granted } = await requestPermissionsAsync();
  return granted;
}

export async function ensureWateringChannel(): Promise<void> {
  await setNotificationChannelAsync("watering", {
    name: "Riegos",
    importance: AndroidImportance.HIGH,
  });
}

export function buildWateringTriggerDate(
  schedule: WateringScheduleWithPlant,
): Date {
  const next = new Date(schedule.next_due_at);
  const [h, m] = schedule.notify_time.split(":").map(Number);
  const trigger = new Date(
    next.getFullYear(),
    next.getMonth(),
    next.getDate(),
    h,
    m,
    0,
    0,
  );

  const now = Date.now();
  if (trigger.getTime() <= now) {
    return new Date(now + 60_000);
  }

  return trigger;
}

export async function reconcileWateringNotifications(
  schedules: WateringScheduleWithPlant[],
): Promise<void> {
  const existing = await getAllScheduledNotificationsAsync();

  for (const n of existing) {
    if (n.identifier.startsWith(NOTIFICATION_PREFIX)) {
      await cancelScheduledNotificationAsync(n.identifier);
    }
  }

  for (const s of schedules) {
    if (!s.active) continue;

    const trigger = buildWateringTriggerDate(s);
    if (trigger.getTime() <= Date.now()) continue;

    const plantName = s.plants?.name ?? "tu planta";

    await scheduleNotificationAsync({
      identifier: `${NOTIFICATION_PREFIX}${s.plant_id}`,
      content: {
        title: "Es hora de regar",
        body: `Tu ${plantName} necesita un poco de agua.`,
        data: { plantId: s.plant_id, type: "watering" },
        sound: true,
      },
      trigger: { date: trigger, channelId: "watering" },
    });
  }
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
