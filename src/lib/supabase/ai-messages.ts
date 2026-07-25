import { supabase } from "./client";
import type { Tables, TablesInsert } from "./database.types";

export type ConversationMessage = Tables<"ai_messages">;
export type ConversationMessageInsert = TablesInsert<"ai_messages">;

export async function fetchMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createMessage(
  input: Omit<ConversationMessageInsert, "">,
): Promise<ConversationMessage> {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
