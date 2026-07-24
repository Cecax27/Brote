import { supabase } from "./client";
import type { Tables, TablesInsert } from "./database.types";

export type LightMeasurement = Tables<"light_measurements">;
export type LightMeasurementInsert = TablesInsert<"light_measurements">;

export async function fetchLightMeasurements(
  plantId: string,
): Promise<LightMeasurement[]> {
  const { data, error } = await supabase
    .from("light_measurements")
    .select("*")
    .eq("plant_id", plantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchLatestMeasurement(
  plantId: string,
): Promise<LightMeasurement | null> {
  const { data, error } = await supabase
    .from("light_measurements")
    .select("*")
    .eq("plant_id", plantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createLightMeasurement(
  m: Omit<LightMeasurementInsert, "user_id"> & { user_id: string },
): Promise<LightMeasurement> {
  const { data, error } = await supabase
    .from("light_measurements")
    .insert(m)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLightMeasurement(id: string): Promise<void> {
  const { error } = await supabase
    .from("light_measurements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
