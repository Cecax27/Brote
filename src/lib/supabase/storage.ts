import { supabase } from "./client";

const BUCKET = "plant-photos";

export async function uploadPlantPhoto(
  userId: string,
  plantId: string,
  uri: string,
): Promise<string> {
  const ext = uri.split(".").pop()?.split("?")[0] ?? "jpg";
  const timestamp = Date.now();
  const path = `${userId}/${plantId}/${timestamp}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

export function getPublicUrl(path: string): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

export function extractPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/");
    const bucketIndex = segments.indexOf(BUCKET);
    if (bucketIndex === -1) return null;
    return segments.slice(bucketIndex + 1).join("/");
  } catch {
    return null;
  }
}

export async function deletePlantPhoto(url: string): Promise<void> {
  const path = extractPathFromUrl(url);
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
