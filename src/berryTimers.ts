import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export type BerryWateringMode = "8h" | "10h";

export type BerryTimer = {
  startedAt: number;
  durationHours: 16 | 20;
  wateringMode: BerryWateringMode;
  notified: string[];
};

export type BerryTimerMap = Record<string, BerryTimer>;

export type BerryCheckpoint = {
  key: string;
  offsetHours: number;
  label: string;
  kind: "water" | "harvest";
};

export const BERRY_TIMER_STORAGE_KEY = "alya-berries-mepo-timers-v1";
export const BERRY_NAMES_STORAGE_KEY = "alya-berries-mepo-characters-v1";
export const BERRY_WATERING_MODE_STORAGE_KEY = "alya-berries-watering-mode-v1";
export const BERRY_TIMER_EVENT = "alya:berry-timers-changed";

const HOUR = 60 * 60 * 1000;
let permissionCache: boolean | null = null;

export function readBerryWateringMode(): BerryWateringMode {
  try {
    return localStorage.getItem(BERRY_WATERING_MODE_STORAGE_KEY) === "10h" ? "10h" : "8h";
  } catch {
    return "8h";
  }
}

export function readBerryTimers(): BerryTimerMap {
  try {
    const raw = localStorage.getItem(BERRY_TIMER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: BerryTimerMap = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const timer = value as Partial<BerryTimer>;
      if (typeof timer.startedAt !== "number") continue;
      if (timer.durationHours !== 16 && timer.durationHours !== 20) continue;
      result[id] = {
        startedAt: timer.startedAt,
        durationHours: timer.durationHours,
        wateringMode: timer.wateringMode === "10h" ? "10h" : "8h",
        notified: Array.isArray(timer.notified)
          ? timer.notified.filter((entry): entry is string => typeof entry === "string")
          : [],
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function readBerryNames(): Record<string, string> {
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

export function writeBerryTimers(timers: BerryTimerMap) {
  try {
    localStorage.setItem(BERRY_TIMER_STORAGE_KEY, JSON.stringify(timers));
  } catch {}
  window.dispatchEvent(new Event(BERRY_TIMER_EVENT));
}

export function setBerryWateringMode(mode: BerryWateringMode) {
  try {
    localStorage.setItem(BERRY_WATERING_MODE_STORAGE_KEY, mode);
  } catch {}

  // Le sélecteur est global : les chronos déjà lancés suivent immédiatement le mode choisi.
  const timers = readBerryTimers();
  let changed = false;
  for (const timer of Object.values(timers)) {
    if (timer.wateringMode === mode) continue;
    timer.wateringMode = mode;
    const validKeys = new Set(checkpointsFor(timer.durationHours, mode).map((checkpoint) => checkpoint.key));
    timer.notified = timer.notified.filter((key) => validKeys.has(key));
    changed = true;
  }

  if (changed) {
    writeBerryTimers(timers);
  } else {
    window.dispatchEvent(new Event(BERRY_TIMER_EVENT));
  }
}

export function startBerryTimer(
  slotId: string,
  durationHours: 16 | 20,
  wateringMode: BerryWateringMode,
) {
  const timers = readBerryTimers();
  timers[slotId] = { startedAt: Date.now(), durationHours, wateringMode, notified: [] };
  writeBerryTimers(timers);
}

export function clearBerryTimer(slotId: string) {
  const timers = readBerryTimers();
  delete timers[slotId];
  writeBerryTimers(timers);
}

export function checkpointsFor(
  durationHours: 16 | 20,
  wateringMode: BerryWateringMode = "8h",
): BerryCheckpoint[] {
  if (wateringMode === "10h") {
    return [
      { key: "water-10", offsetHours: 10, label: "Arrosage", kind: "water" },
      {
        key: durationHours === 20 ? "harvest-20" : "harvest-16",
        offsetHours: durationHours,
        label: "Récolte",
        kind: "harvest",
      },
    ];
  }

  if (durationHours === 20) {
    return [
      { key: "water-8", offsetHours: 8, label: "Arrosage 1", kind: "water" },
      { key: "water-16", offsetHours: 16, label: "Arrosage 2", kind: "water" },
      { key: "harvest-20", offsetHours: 20, label: "Récolte", kind: "harvest" },
    ];
  }

  return [
    { key: "water-8", offsetHours: 8, label: "Arrosage", kind: "water" },
    { key: "harvest-16", offsetHours: 16, label: "Récolte", kind: "harvest" },
  ];
}

export function checkpointAt(timer: BerryTimer, checkpoint: BerryCheckpoint) {
  return timer.startedAt + checkpoint.offsetHours * HOUR;
}

export function formatTimerRemaining(milliseconds: number) {
  const safe = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}min ${String(seconds).padStart(2, "0")}sec`;
}

export function timerSnapshot(timer: BerryTimer, now = Date.now()) {
  const checkpoints = checkpointsFor(timer.durationHours, timer.wateringMode);
  const endAt = timer.startedAt + timer.durationHours * HOUR;
  const nextCheckpoint = checkpoints.find((checkpoint) => checkpointAt(timer, checkpoint) > now) ?? null;
  const completed = now >= endAt;
  return {
    checkpoints,
    endAt,
    completed,
    totalRemaining: Math.max(0, endAt - now),
    nextCheckpoint,
    nextRemaining: nextCheckpoint ? Math.max(0, checkpointAt(timer, nextCheckpoint) - now) : 0,
  };
}

export async function ensureBerryNotificationPermission() {
  if (permissionCache !== null) return permissionCache;
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    permissionCache = granted;
    return granted;
  } catch {
    permissionCache = false;
    return false;
  }
}

export async function sendBerryCheckpointNotification(
  berry: string,
  checkpoint: BerryCheckpoint,
) {
  const granted = await ensureBerryNotificationPermission();
  if (!granted) return false;

  const body = checkpoint.kind === "harvest"
    ? `Récolte tes baies ${berry} toi !`
    : `Arrose tes baies ${berry} toi !`;

  try {
    await sendNotification({
      title: "ALYA Companion · Baies",
      body,
    });
    return true;
  } catch {
    return false;
  }
}
