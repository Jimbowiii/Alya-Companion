import { useEffect, useMemo, useRef, useState } from "react";
import { Droplets, Hourglass, RotateCcw, Wheat } from "lucide-react";
import {
  BERRY_SLOTS,
  formatRemaining,
  scheduleAllNotifications,
  timerSnapshot,
} from "../berryModel";
import {
  loadCrossDeviceState,
  saveBerryState,
  subscribeCrossDeviceState,
  type CloudBerryTimer,
  type WateringMode,
} from "../sync";

export function BerriesMobilePage({ userId }: { userId: string }) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [timers, setTimers] = useState<Record<string, CloudBerryTimer>>({});
  const [mode, setMode] = useState<WateringMode>("8h");
  const [now, setNow] = useState(Date.now());
  const [syncState, setSyncState] = useState<"syncing" | "synced" | "error">("syncing");
  const nameSaveTimer = useRef<number | null>(null);

  const applyCloud = async () => {
    try {
      const state = await loadCrossDeviceState(userId);
      if (!state?.berries_initialized) {
        // Do not create an empty cloud berry state here: the PC may still
        // contain the real local timers and publish them on its next launch.
        setNames({});
        setTimers({});
        setMode("8h");
      } else {
        setNames(state.berry_names ?? {});
        setTimers(state.berry_timers ?? {});
        setMode(state.berry_watering_mode === "10h" ? "10h" : "8h");
        await scheduleAllNotifications(state.berry_timers ?? {});
      }
      setSyncState("synced");
    } catch {
      setSyncState("error");
    }
  };

  useEffect(() => {
    void applyCloud();
    const stop = subscribeCrossDeviceState(userId, () => void applyCloud());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop();
      window.clearInterval(tick);
      if (nameSaveTimer.current !== null) window.clearTimeout(nameSaveTimer.current);
    };
  }, [userId]);

  const persist = async (
    nextNames = names,
    nextTimers = timers,
    nextMode = mode,
  ) => {
    setSyncState("syncing");
    try {
      await saveBerryState(userId, nextNames, nextTimers, nextMode);
      await scheduleAllNotifications(nextTimers);
      setSyncState("synced");
    } catch {
      setSyncState("error");
    }
  };

  const updateName = (slotId: string, value: string) => {
    const next = { ...names, [slotId]: value };
    setNames(next);
    if (nameSaveTimer.current !== null) window.clearTimeout(nameSaveTimer.current);
    nameSaveTimer.current = window.setTimeout(() => void persist(next, timers, mode), 500);
  };

  const switchMode = (nextMode: WateringMode) => {
    const nextTimers = Object.fromEntries(
      Object.entries(timers).map(([id, timer]: [string, CloudBerryTimer]) => [
        id,
        { ...timer, wateringMode: nextMode },
      ]),
    ) as Record<string, CloudBerryTimer>;
    setMode(nextMode);
    setTimers(nextTimers);
    void persist(names, nextTimers, nextMode);
  };

  const start = (slotId: string, durationHours: 16 | 20) => {
    const nextTimers = {
      ...timers,
      [slotId]: { startedAt: Date.now(), durationHours, wateringMode: mode },
    };
    setTimers(nextTimers);
    void persist(names, nextTimers, mode);
  };

  const reset = (slotId: string) => {
    const nextTimers = { ...timers };
    delete nextTimers[slotId];
    setTimers(nextTimers);
    void persist(names, nextTimers, mode);
  };

  const activeCount = Object.keys(timers).length;
  const assigned = useMemo(
    () => BERRY_SLOTS.filter((slot) => names[slot.id]?.trim()).length,
    [names],
  );

  return <section className="mobile-page">
    <header className="mobile-page-header">
      <div><span>MAKE BIG MONEY</span><h1>Baies</h1><p>Chronos synchronisés PC ↔ Android.</p></div>
      <div className={`sync-pill ${syncState}`}>{syncState === "synced" ? "Cloud OK" : syncState === "error" ? "Cloud indisponible" : "Sync…"}</div>
    </header>

    <div className="mobile-segmented">
      <span>Arrosage</span>
      <button className={mode === "8h" ? "active" : ""} onClick={() => switchMode("8h")}>8h</button>
      <button className={mode === "10h" ? "active" : ""} onClick={() => switchMode("10h")}>10h</button>
    </div>

    <div className="mobile-stats">
      <article><strong>{assigned}/6</strong><span>personnages</span></article>
      <article><strong>{activeCount}/6</strong><span>cultures actives</span></article>
    </div>

    <div className="mobile-card-list">
      {BERRY_SLOTS.map((slot, index) => {
        const timer = timers[slot.id];
        const snapshot = timer ? timerSnapshot(timer, now) : null;
        return <article className="mobile-card berry-mobile-card" key={slot.id}>
          <div className="mobile-card-title">
            <div><small>#{index + 1} · {slot.berry}</small><h2>{slot.label}</h2></div>
            {!timer
              ? <button className="mobile-action" onClick={() => start(slot.id, slot.durationHours)}><Hourglass size={15}/> {slot.durationHours}h</button>
              : <button className="mobile-action ghost" onClick={() => reset(slot.id)}><RotateCcw size={15}/> Reset</button>}
          </div>
          <label className="mobile-field">
            <span>Personnage</span>
            <input value={names[slot.id] ?? ""} onChange={(event) => updateName(slot.id, event.target.value)} placeholder="Nom du personnage…" />
          </label>
          {timer && snapshot && <div className={`mobile-timer ${snapshot.completed ? "complete" : ""}`}>
            <strong>{snapshot.completed ? "Récolte prête" : formatRemaining(snapshot.totalRemaining)}</strong>
            {snapshot.next
              ? <span>{snapshot.next.kind === "water" ? <Droplets size={14}/> : <Wheat size={14}/>} {snapshot.next.label} dans {formatRemaining(snapshot.nextRemaining)}</span>
              : <span><Wheat size={14}/> Récolte maintenant</span>}
            <div className="mobile-checkpoints">
              {snapshot.checkpoints.map((checkpoint) => {
                const due = timer.startedAt + checkpoint.offsetHours * 60 * 60 * 1000;
                return <span className={now >= due ? "done" : ""} key={checkpoint.key}>{checkpoint.offsetHours}h · {checkpoint.label}</span>;
              })}
            </div>
          </div>}
          <div className="mobile-seeds">
            {slot.seeds.map((seed) => <span key={seed.name}>{seed.name}<strong>× {seed.amount}</strong></span>)}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
