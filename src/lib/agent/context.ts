import { fetchPlant } from "@/lib/supabase/plants";
import { fetchJournalEntries } from "@/lib/supabase/journal-entries";
import { fetchWateringSchedule } from "@/lib/supabase/watering-schedules";
import type { PlantContext } from "./client";

const contextCache = new Map<string, PlantContext>();

export async function buildPlantContext(
  plantId: string,
): Promise<PlantContext> {
  const cached = contextCache.get(plantId);
  if (cached) return cached;

  const [plant, recentEntries, schedule] = await Promise.all([
    fetchPlant(plantId),
    fetchJournalEntries(plantId),
    fetchWateringSchedule(plantId).catch(() => null),
  ]);

  if (!plant) {
    throw new Error("Planta no encontrada");
  }

  const ctx: PlantContext = {
    plant: {
      id: plant.id,
      name: plant.name,
      species: plant.species,
      location: plant.location,
      notes: plant.notes,
    },
    recentEntries: (recentEntries ?? []).slice(0, 10).map((entry) => ({
      type: entry.type,
      content: entry.content,
      created_at: entry.created_at,
    })),
    schedule: schedule
      ? {
          frequency_days: schedule.frequency_days,
          last_watered_at: schedule.last_watered_at,
          next_due_at: schedule.next_due_at,
          active: schedule.active,
        }
      : undefined,
  };

  contextCache.set(plantId, ctx);
  return ctx;
}

export function clearPlantContext(plantId: string): void {
  contextCache.delete(plantId);
}
