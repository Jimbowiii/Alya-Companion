import {
  Schedule,
  cancel,
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { CloudBerryTimer, WateringMode } from "./sync";

export type BerryName = "Mépo" | "Ceriz" | "Pécha" | "Fraive";

export type BerrySlot = {
  id: string;
  berry: BerryName;
  label: string;
  durationHours: 16 | 20;
  seeds: Array<{ name: string; amount: number }>;
};

export type BerryCheckpoint = {
  key: string;
  offsetHours: number;
  label: string;
  kind: "water" | "harvest";
};

export const BERRY_SLOTS: BerrySlot[] = [
  { id: "mepo-1", berry: "Mépo", label: "Mépo · Personnage 1", durationHours: 20, seeds: [
    { name: "Très Épicée", amount: 156 }, { name: "Simple Amère", amount: 156 }, { name: "Simple Sucrée", amount: 156 },
  ]},
  { id: "mepo-2", berry: "Mépo", label: "Mépo · Personnage 2", durationHours: 20, seeds: [
    { name: "Très Épicée", amount: 156 }, { name: "Simple Amère", amount: 156 }, { name: "Simple Sucrée", amount: 156 },
  ]},
  { id: "ceriz-1", berry: "Ceriz", label: "Ceriz · Personnage 1", durationHours: 16, seeds: [
    { name: "Simple Épicée", amount: 468 },
  ]},
  { id: "ceriz-2", berry: "Ceriz", label: "Ceriz · Personnage 2", durationHours: 16, seeds: [
    { name: "Simple Épicée", amount: 468 },
  ]},
  { id: "pecha-1", berry: "Pécha", label: "Pécha · Personnage", durationHours: 16, seeds: [
    { name: "Très Sucrée", amount: 156 }, { name: "Simple Sucrée", amount: 156 },
  ]},
  { id: "fraive-1", berry: "Fraive", label: "Fraive · Personnage", durationHours: 16, seeds: [
    { name: "Très Amère", amount: 156 }, { name: "Simple Amère", amount: 156 },
  ]},
];

const HOUR = 60 * 60 * 1000;
const ALL_KEYS = ["water-8", "water-10", "water-16", "harvest-16", "harvest-20"];

export function checkpointsFor(durationHours: 16 | 20, mode: WateringMode): BerryCheckpoint[] {
  if (mode === "10h") {
    return [
      { key: "water-10", offsetHours: 10, label: "Arrosage", kind: "water" },
      { key: durationHours === 20 ? "harvest-20" : "harvest-16", offsetHours: durationHours, label: "Récolte", kind: "harvest" },
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

export function timerSnapshot(timer: CloudBerryTimer, now = Date.now()) {
  const checkpoints = checkpointsFor(timer.durationHours, timer.wateringMode);
  const endAt = timer.startedAt + timer.durationHours * HOUR;
  const next = checkpoints.find((checkpoint) => timer.startedAt + checkpoint.offsetHours * HOUR > now) ?? null;
  return {
    endAt,
    completed: now >= endAt,
    totalRemaining: Math.max(0, endAt - now),
    checkpoints,
    next,
    nextRemaining: next ? Math.max(0, timer.startedAt + next.offsetHours * HOUR - now) : 0,
  };
}

export function formatRemaining(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}sec`;
}

function hash32(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const id = hash & 0x7fffffff;
  return id === 0 ? 1 : id;
}

function idsForSlot(slotId: string) {
  return ALL_KEYS.map((key) => hash32(`alya-berry:${slotId}:${key}`));
}

async function ensurePermission() {
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === "granted";
  return granted;
}

function bodyFor(berry: BerryName, checkpoint: BerryCheckpoint) {
  return checkpoint.kind === "harvest"
    ? `Récolte tes baies ${berry} toi !`
    : `Arrose tes baies ${berry} toi !`;
}

const SEEN_KEY = "alya-mobile-berry-seen-v1";

function readSeen(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, true>;
  } catch {
    return {};
  }
}

function markSeen(key: string) {
  const seen = readSeen();
  seen[key] = true;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
}

export async function cancelSlotNotifications(slotId: string) {
  try { await cancel(idsForSlot(slotId)); } catch {}
}

export async function scheduleSlotNotifications(slot: BerrySlot, timer: CloudBerryTimer) {
  if (!(await ensurePermission())) return;
  await cancelSlotNotifications(slot.id);

  const now = Date.now();
  const seen = readSeen();

  for (const checkpoint of checkpointsFor(timer.durationHours, timer.wateringMode)) {
    const due = timer.startedAt + checkpoint.offsetHours * HOUR;
    const seenKey = `${slot.id}:${timer.startedAt}:${checkpoint.key}`;
    const id = hash32(`alya-berry:${slot.id}:${checkpoint.key}`);
    const options = {
      id,
      title: "ALYA Companion · Baies",
      body: bodyFor(slot.berry, checkpoint),
    };

    if (due > now) {
      await sendNotification({
        ...options,
        schedule: Schedule.at(new Date(due), false, true),
      });
      continue;
    }

    // If Android was closed when the cloud timer changed, catch up once
    // when the app is opened again.
    if (!seen[seenKey]) {
      await sendNotification(options);
      markSeen(seenKey);
    }
  }
}

export async function scheduleAllNotifications(timers: Record<string, CloudBerryTimer>) {
  for (const slot of BERRY_SLOTS) {
    const timer = timers[slot.id];
    if (timer) await scheduleSlotNotifications(slot, timer);
    else await cancelSlotNotifications(slot.id);
  }
}
