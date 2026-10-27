import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushTokenWithCount {
  user_id: string;
  token: string;
  plant_count: number;
  plant_names: string[];
}

async function getUsersToNotify(): Promise<PushTokenWithCount[]> {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTodayISO = endOfToday.toISOString();

  const { data: tokens, error: tokenError } = await supabase
    .from("push_tokens")
    .select("user_id, token");

  if (tokenError || !tokens || tokens.length === 0) {
    console.log("No push tokens found or error:", tokenError?.message);
    return [];
  }

  const result: PushTokenWithCount[] = [];

  for (const t of tokens) {
    const { data: schedules, error: schedError } = await supabase
      .from("watering_schedules")
      .select("plant_id, plants(name)")
      .eq("user_id", t.user_id)
      .eq("active", true)
      .lte("next_due_at", endOfTodayISO);

    if (schedError) {
      console.error("Error fetching schedules for user", t.user_id, schedError.message);
      continue;
    }

    if (!schedules || schedules.length === 0) continue;

    const plantNames: string[] = [];
    for (const s of schedules) {
      const plants = s.plants as { name: string } | { name: string }[] | null;
      if (plants && !Array.isArray(plants) && plants.name) {
        plantNames.push(plants.name);
      }
    }

    if (plantNames.length > 0) {
      result.push({
        user_id: t.user_id,
        token: t.token,
        plant_count: plantNames.length,
        plant_names: plantNames,
      });
    }
  }

  return result;
}

function buildTitle(count: number): string {
  if (count === 1) {
    return "Tienes 1 planta por regar hoy";
  }
  return `Tienes ${count} plantas por regar hoy`;
}

function buildBody(names: string[]): string {
  if (names.length === 1) {
    return `No olvides regar a ${names[0]}.`;
  }
  const allButLast = names.slice(0, -1);
  const last = names[names.length - 1];
  return `No olvides regar a ${allButLast.join(", ")} y ${last}.`;
}

async function sendPush(token: string, title: string, body: string): Promise<void> {
  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data: { type: "watering" },
      sound: "default",
      priority: "high",
    }),
  });

  const result = await resp.json();
  console.log("Expo push response:", JSON.stringify(result));

  if (result.data?.status === "error") {
    console.error("Push error for token", token, result.data.message);

    if (result.data.details?.error === "DeviceNotRegistered") {
      await supabase.from("push_tokens").delete().eq("token", token);
      console.log("Removed invalid token:", token);
    }
  }
}

Deno.serve(async () => {
  try {
    const users = await getUsersToNotify();
    console.log(`Found ${users.length} users to notify`);

    for (const user of users) {
      const title = buildTitle(user.plant_count);
      const body = buildBody(user.plant_names);
      await sendPush(user.token, title, body);
    }

    return new Response(
      JSON.stringify({ success: true, notified: users.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
