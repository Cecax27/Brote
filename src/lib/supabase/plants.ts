import { supabase } from "./client";
import type { Tables, TablesInsert, TablesUpdate } from "./database.types";

export type Plant = Tables<"plants">;
export type PlantInsert = TablesInsert<"plants">;
export type PlantUpdate = TablesUpdate<"plants">;

export async function fetchPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPlant(id: string): Promise<Plant | null> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createPlant(
  plant: Omit<PlantInsert, "user_id"> & { user_id: string },
): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .insert(plant)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlant(
  id: string,
  updates: PlantUpdate,
): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlant(id: string): Promise<void> {
  const { error } = await supabase.from("plants").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPlantPhotos(plantId: string): Promise<string[]> {
  const { data: plant, error: plantError } = await supabase
    .from("plants")
    .select("photo_url")
    .eq("id", plantId)
    .single();

  if (plantError && plantError.code !== "PGRST116") throw plantError;

  const { data: entries, error: entriesError } = await supabase
    .from("journal_entries")
    .select("photo_url, created_at")
    .eq("plant_id", plantId)
    .not("photo_url", "is", null)
    .order("created_at", { ascending: false });

  if (entriesError) throw entriesError;

  const photos: string[] = [];

  if (plant?.photo_url) {
    photos.push(plant.photo_url);
  }

  for (const entry of entries ?? []) {
    if (entry.photo_url && !photos.includes(entry.photo_url)) {
      photos.push(entry.photo_url);
    }
  }

  return photos;
}
