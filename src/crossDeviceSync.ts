import { useEffect, useRef } from "react";
import { supabase } from "./auth";
import {
  BERRY_NAMES_STORAGE_KEY,
  BERRY_TIMER_EVENT,
  BERRY_TIMER_STORAGE_KEY,
  BERRY_WATERING_MODE_STORAGE_KEY,
  readBerryTimers,
  readBerryWateringMode,
  writeBerryTimers,
  type BerryTimerMap,
  type BerryWateringMode,
} from "./berryTimers";

export const BERRY_NAMES_CHANGED_EVENT = "alya:berry-names-changed";

export type CloudBerryTimer = {
  startedAt: number;
  durationHours: 16 | 20;
  wateringMode: BerryWateringMode;
};

export type AlyaCrossDeviceState = {
  user_id: string;
  berry_names: Record<string, string>;
  berry_timers: Record<string, CloudBerryTimer>;
  berry_watering_mode: BerryWateringMode;
  berries_initialized: boolean;
  berries_updated_at: string;
  // Legacy fields kept during the v1 -> v1.1 migration.
  surf_active_patch_id: string | null;
  surf_requested_patch_id: string | null;
  surf_pc_active_patch_id: string | null;
  surf_android_active_patch_id: string | null;
  surf_pc_updated_at: string | null;
  surf_android_updated_at: string | null;
  surf_updated_at: string;
  updated_at: string;
};

function requireClient() {
  if (!supabase) throw new Error("Supabase n'est pas configuré.");
  return supabase;
}

function readBerryNamesLocal(): Record<string, string> {
  try {
    const raw = localStorage.getItem(BERRY_NAMES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function stripNotified(timers: BerryTimerMap): Record<string, CloudBerryTimer> {
  return Object.fromEntries(
    Object.entries(timers).map(([slotId, timer]) => [
      slotId,
      {
        startedAt: timer.startedAt,
        durationHours: timer.durationHours,
        wateringMode: timer.wateringMode,
      },
    ]),
  );
}

function mergeCloudTimers(
  cloud: Record<string, CloudBerryTimer> | null | undefined,
): BerryTimerMap {
  const local = readBerryTimers();
  const result: BerryTimerMap = {};
  for (const [slotId, remote] of Object.entries(cloud ?? {})) {
    if (!remote || typeof remote.startedAt !== "number") continue;
    if (remote.durationHours !== 16 && remote.durationHours !== 20) continue;
    const previous = local[slotId];
    result[slotId] = {
      startedAt: remote.startedAt,
      durationHours: remote.durationHours,
      wateringMode: remote.wateringMode === "10h" ? "10h" : "8h",
      // "notified" stays device-local: a Windows popup must never suppress
      // the corresponding Android notification, and vice-versa.
      notified: previous?.startedAt === remote.startedAt ? previous.notified : [],
    };
  }
  return result;
}

export async function loadCrossDeviceState(userId: string): Promise<AlyaCrossDeviceState | null> {
  const client = requireClient();
  const { data, error } = await client
    .from("alya_cross_device_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as AlyaCrossDeviceState | null;
}

export async function saveBerryCloudState(userId: string) {
  const client = requireClient();
  const now = new Date().toISOString();
  const { error } = await client.from("alya_cross_device_state").upsert({
    user_id: userId,
    berry_names: readBerryNamesLocal(),
    berry_timers: stripNotified(readBerryTimers()),
    berry_watering_mode: readBerryWateringMode(),
    berries_initialized: true,
    berries_updated_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function saveSurfActivePatch(patchId: string | null) {
  const client = requireClient();
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;
  const now = new Date().toISOString();
  const { error } = await client.from("alya_cross_device_state").upsert({
    user_id: userId,
    // New v1.1 field. Keep the legacy value too so older RC11 clients
    // continue to display the PC Surf correctly during rollout.
    surf_pc_active_patch_id: patchId,
    surf_pc_updated_at: now,
    surf_active_patch_id: patchId,
    surf_requested_patch_id: null,
    surf_updated_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function requestSurfPatch(userId: string, patchId: string | null) {
  const client = requireClient();
  const now = new Date().toISOString();
  const { error } = await client.from("alya_cross_device_state").upsert({
    user_id: userId,
    surf_requested_patch_id: patchId,
    surf_updated_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

function applyRemoteBerryState(state: AlyaCrossDeviceState) {
  try {
    localStorage.setItem(BERRY_NAMES_STORAGE_KEY, JSON.stringify(state.berry_names ?? {}));
    localStorage.setItem(
      BERRY_WATERING_MODE_STORAGE_KEY,
      state.berry_watering_mode === "10h" ? "10h" : "8h",
    );
  } catch {
    // localStorage can be unavailable; the rest of ALYA remains usable.
  }

  writeBerryTimers(mergeCloudTimers(state.berry_timers));
  window.dispatchEvent(new Event(BERRY_NAMES_CHANGED_EVENT));
}

export function CrossDeviceSyncBridge({ userId }: { userId: string }) {
  const applyingRemote = useRef(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!supabase || !userId) return;

    let disposed = false;

    const pushLocal = () => {
      if (applyingRemote.current || disposed) return;
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void saveBerryCloudState(userId).catch(() => undefined);
      }, 500);
    };

    const apply = (state: AlyaCrossDeviceState | null) => {
      if (!state || !state.berries_initialized || disposed) return;
      applyingRemote.current = true;
      try {
        applyRemoteBerryState(state);
      } finally {
        window.setTimeout(() => {
          applyingRemote.current = false;
        }, 0);
      }
    };

    void loadCrossDeviceState(userId)
      .then(async (state) => {
        if (disposed) return;
        if (state?.berries_initialized) apply(state);
        else await saveBerryCloudState(userId);
      })
      .catch(() => undefined);

    const channel = supabase
      .channel(`alya-cross-device-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alya_cross_device_state",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadCrossDeviceState(userId).then(apply).catch(() => undefined);
        },
      )
      .subscribe();

    window.addEventListener(BERRY_TIMER_EVENT, pushLocal);
    window.addEventListener(BERRY_NAMES_CHANGED_EVENT, pushLocal);

    return () => {
      disposed = true;
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      window.removeEventListener(BERRY_TIMER_EVENT, pushLocal);
      window.removeEventListener(BERRY_NAMES_CHANGED_EVENT, pushLocal);
      void supabase?.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
