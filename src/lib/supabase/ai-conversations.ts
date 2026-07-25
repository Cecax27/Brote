import { supabase } from "./client";
import type { Tables, TablesInsert, TablesUpdate } from "./database.types";
import type { Plant } from "./plants";

export type AIConversation = Tables<"ai_conversations">;
export type AIConversationInsert = TablesInsert<"ai_conversations">;
export type AIConversationUpdate = TablesUpdate<"ai_conversations">;
export type ConversationWithPlant = AIConversation & { plants: Plant | null };

export async function fetchConversations(): Promise<ConversationWithPlant[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*, plants(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ConversationWithPlant[];
}

export async function fetchConversation(
  id: string,
): Promise<ConversationWithPlant | null> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*, plants(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ConversationWithPlant;
}

export async function createConversation(input: {
  plant_id?: string | null;
  title?: string;
}): Promise<AIConversation> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      plant_id: input.plant_id ?? null,
      title: input.title,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateConversation(
  id: string,
  updates: { title: string },
): Promise<AIConversation> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
