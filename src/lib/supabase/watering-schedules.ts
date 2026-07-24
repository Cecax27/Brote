import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";
import type { Plant } from "./plants";

export type WateringSchedule = Tables<"watering_schedules">;
export type WateringScheduleInsert = TablesInsert<"watering_schedules">;
export type WateringScheduleUpdate = TablesUpdate<"watering_schedules">;
export type WateringScheduleWithPlant = WateringSchedule & { plants: Plant };

function endOfToday(): string {
  const now = new Date();
  const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return eod.toISOString();
}

export async function fetchWateringSchedule(
  plantId: string,
): Promise<WateringSchedule | null> {
  const { data, error } = await supabase
    .from("watering_schedules")
    .select("*")
    .eq("plant_id", plantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchDueToday(): Promise<WateringScheduleWithPlant[]> {
  const { data, error } = await supabase
    .from("watering_schedules")
    .select("*, plants(*)")
    .eq("active", true)
    .lte("next_due_at", endOfToday())
    .order("next_due_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WateringScheduleWithPlant[];
}

export async function fetchUpcomingSchedules(): Promise<
  WateringScheduleWithPlant[]
> {
  const { data, error } = await supabase
    .from("watering_schedules")
    .select("*, plants(*)")
    .eq("active", true)
    .order("next_due_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WateringScheduleWithPlant[];
}

export async function createWateringSchedule(
  s: Omit<WateringScheduleInsert, "user_id"> & { user_id: string },
): Promise<WateringSchedule> {
  const { data, error } = await supabase
    .from("watering_schedules")
    .insert(s)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateWateringSchedule(
  id: string,
  updates: WateringScheduleUpdate,
): Promise<WateringSchedule> {
  const { data, error } = await supabase
    .from("watering_schedules")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWateringSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from("watering_schedules")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function waterNow(
  plantId: string,
): Promise<WateringSchedule | null> {
  const { data, error } = await supabase.rpc("water_now", {
    p_plant_id: plantId,
  });

  if (error) throw error;
  return (data as WateringSchedule) ?? null;
}
