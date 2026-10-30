import { supabase } from "./shared/auth";

export type WateringMode = "8h" | "10h";
export type CloudBerryTimer = {
  startedAt: number;
  durationHours: 16 | 20;
  wateringMode: WateringMode;
};

export type CrossDeviceState = {
  user_id: string;
  berry_names: Record<string, string>;
  berry_timers: Record<string, CloudBerryTimer>;
  berry_watering_mode: WateringMode;
  berries_initialized: boolean;
  berries_updated_at: string;
  // Legacy RC11 v1 fields kept during migration.
  surf_active_patch_id: string | null;
  surf_requested_patch_id: string | null;
  // v1.1: each platform owns its active Surf state.
  surf_pc_active_patch_id: string | null;
  surf_android_active_patch_id: string | null;
  surf_pc_updated_at: string | null;
  surf_android_updated_at: string | null;
  surf_updated_at: string;
  updated_at: string;
};

function client() {
  if (!supabase) throw new Error("Supabase n'est pas configure.");
  return supabase;
}

export async function loadCrossDeviceState(userId: string): Promise<CrossDeviceState | null> {
  const { data, error } = await client()
    .from("alya_cross_device_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as CrossDeviceState | null;
}

export async function saveBerryState(
  userId: string,
  names: Record<string, string>,
  timers: Record<string, CloudBerryTimer>,
  mode: WateringMode,
) {
  const now = new Date().toISOString();
  const { error } = await client().from("alya_cross_device_state").upsert({
    user_id: userId,
    berry_names: names,
    berry_timers: timers,
    berry_watering_mode: mode,
    berries_initialized: true,
    berries_updated_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function saveAndroidSurfActivePatch(userId: string, patchId: string | null) {
  const now = new Date().toISOString();
  const { error } = await client().from("alya_cross_device_state").upsert({
    user_id: userId,
    surf_android_active_patch_id: patchId,
    surf_android_updated_at: now,
    surf_updated_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export function subscribeCrossDeviceState(userId: string, onChange: () => void) {
  const sb = client();
  const channel = sb
    .channel(`alya-mobile-cross-${userId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "alya_cross_device_state",
      filter: `user_id=eq.${userId}`,
    }, onChange)
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}
