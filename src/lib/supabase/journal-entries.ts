import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";

export type JournalEntry = Tables<"journal_entries">;
export type JournalEntryInsert = TablesInsert<"journal_entries">;
export type JournalEntryUpdate = TablesUpdate<"journal_entries">;
export type JournalEntryType = Database["public"]["Enums"]["journal_entry_type"];

export async function fetchJournalEntries(
  plantId: string,
): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("plant_id", plantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchJournalEntry(
  id: string,
): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createJournalEntry(
  entry: Omit<JournalEntryInsert, "user_id"> & { user_id: string },
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .insert(entry)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateJournalEntry(
  id: string,
  updates: JournalEntryUpdate,
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from("journal_entries")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}
