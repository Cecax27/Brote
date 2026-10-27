import { supabase } from "./client";
import type { Tables, TablesUpdate } from "./database.types";

export type Conversation = Tables<"ai_conversations">;
export type ConversationUpdate = TablesUpdate<"ai_conversations">;

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function renameConversation(
  id: string,
  title: string,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
