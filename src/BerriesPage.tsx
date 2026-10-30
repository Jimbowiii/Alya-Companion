import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  BellRing,
  Cherry,
  Droplets,
  Eraser,
  Hourglass,
  Leaf,
  RotateCcw,
  Sprout,
  Wheat,
} from "lucide-react";
import {
  BERRY_NAMES_STORAGE_KEY,
  BERRY_TIMER_EVENT,
  clearBerryTimer,
  ensureBerryNotificationPermission,
  formatTimerRemaining,
  readBerryTimers,
  readBerryWateringMode,
  setBerryWateringMode,
  startBerryTimer,
  timerSnapshot,
  type BerryTimerMap,
  type BerryWateringMode,
} from "./berryTimers";
import { BERRY_NAMES_CHANGED_EVENT } from "./crossDeviceSync";

type BerrySlot = {
  id: string;
  berry: "Mépo" | "Ceriz" | "Pécha" | "Fraive";
  label: string;
  accent: string;
  seeds: Array<{ name: string; amount: number }>;
};

type Props = {
  onEditBackground: () => void;
};

const SLOTS: BerrySlot[] = [
  {
    id: "mepo-1",
    berry: "Mépo",
    label: "Mépo · Personnage 1",
    accent: "#f2b84b",
    seeds: [
      { name: "Très Épicée", amount: 156 },
      { name: "Simple Amère", amount: 156 },
      { name: "Simple Sucrée", amount: 156 },
    ],
  },
  {
    id: "mepo-2",
    berry: "Mépo",
    label: "Mépo · Personnage 2",
    accent: "#f2b84b",
    seeds: [
      { name: "Très Épicée", amount: 156 },
      { name: "Simple Amère", amount: 156 },
      { name: "Simple Sucrée", amount: 156 },
    ],
  },
  {
    id: "ceriz-1",
    berry: "Ceriz",
    label: "Ceriz · Personnage 1",
    accent: "#ff5a63",
    seeds: [{ name: "Simple Épicée", amount: 468 }],
  },
  {
    id: "ceriz-2",
    berry: "Ceriz",
    label: "Ceriz · Personnage 2",
    accent: "#ff5a63",
    seeds: [{ name: "Simple Épicée", amount: 468 }],
  },
  {
    id: "pecha-1",
    berry: "Pécha",
    label: "Pécha · Personnage",
    accent: "#ff8fc8",
    seeds: [
      { name: "Très Sucrée", amount: 156 },
      { name: "Simple Sucrée", amount: 156 },
    ],
  },
  {
    id: "fraive-1",
    berry: "Fraive",
    label: "Fraive · Personnage",
    accent: "#77a8ff",
    seeds: [
      { name: "Très Amère", amount: 156 },
      { name: "Simple Amère", amount: 156 },
    ],
  },
];

const TOTALS = [
  { name: "Très Épicée", amount: 312, tone: "spicy" },
  { name: "Simple Amère", amount: 468, tone: "bitter" },
  { name: "Simple Sucrée", amount: 468, tone: "sweet" },
  { name: "Simple Épicée", amount: 936, tone: "spicy" },
  { name: "Très Sucrée", amount: 156, tone: "sweet" },
  { name: "Très Amère", amount: 156, tone: "bitter" },
] as const;

function readNames(): Record<string, string> {
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

export function BerriesPage({ onEditBackground }: Props) {
  const [names, setNames] = useState<Record<string, string>>(() => readNames());
  const [timers, setTimers] = useState<BerryTimerMap>(() => readBerryTimers());
  const [wateringMode, setWateringModeState] = useState<BerryWateringMode>(() => readBerryWateringMode());
  const [now, setNow] = useState(() => Date.now());
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(BERRY_NAMES_STORAGE_KEY, JSON.stringify(names));
      window.dispatchEvent(new Event(BERRY_NAMES_CHANGED_EVENT));
    } catch {}
  }, [names]);

  useEffect(() => {
    const refresh = () => {
      setTimers(readBerryTimers());
      setWateringModeState(readBerryWateringMode());
    };
    const refreshNames = () => setNames(readNames());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener(BERRY_TIMER_EVENT, refresh);
    window.addEventListener(BERRY_NAMES_CHANGED_EVENT, refreshNames);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(BERRY_TIMER_EVENT, refresh);
      window.removeEventListener(BERRY_NAMES_CHANGED_EVENT, refreshNames);
    };
  }, []);

  const assigned = useMemo(
    () => SLOTS.filter((slot) => names[slot.id]?.trim()).length,
    [names],
  );

  const activeTimers = useMemo(
    () => Object.keys(timers).length,
    [timers],
  );

  const resetNames = () => {
    setNames({});
    try { localStorage.removeItem(BERRY_NAMES_STORAGE_KEY); } catch {}
    window.dispatchEvent(new Event(BERRY_NAMES_CHANGED_EVENT));
  };

  const changeWateringMode = (mode: BerryWateringMode) => {
    setBerryWateringMode(mode);
    setWateringModeState(mode);
    setTimers(readBerryTimers());
    setNow(Date.now());
    setNotificationNotice(
      mode === "10h"
        ? "Mode 10h activé : un seul arrosage à 10h pour toutes les baies."
        : "Mode 8h activé : chronos d’arrosage classiques restaurés.",
    );
  };

  const beginTimer = async (slot: BerrySlot) => {
    const durationHours: 16 | 20 = slot.berry === "Mépo" ? 20 : 16;
    const granted = await ensureBerryNotificationPermission();
    if (!granted) {
      setNotificationNotice("Notifications Windows refusées : le chrono fonctionnera, mais aucun popup ne pourra être envoyé.");
    } else {
      setNotificationNotice("Notifications Windows activées pour les checkpoints de culture.");
    }
    startBerryTimer(slot.id, durationHours, wateringMode);
    setTimers(readBerryTimers());
    setNow(Date.now());
  };

  const resetTimer = (slotId: string) => {
    clearBerryTimer(slotId);
    setTimers(readBerryTimers());
    setNow(Date.now());
  };

  return (
    <section className="berries-page">
      <header className="page-header berries-header">
        <div>
          <p className="eyebrow">Culture · autonomie Mépo</p>
          <h1>Baies</h1>
          <p>Prépare tes six personnages, lance leurs cultures et suis les arrosages jusqu’à la récolte.</p>
        </div>
        <div className="page-header-actions">
          <div className="berries-watering-mode" role="group" aria-label="Mode d’arrosage">
            <span>Arrosage</span>
            <button
              type="button"
              className={wateringMode === "8h" ? "active" : ""}
              onClick={() => changeWateringMode("8h")}
              aria-pressed={wateringMode === "8h"}
            >
              8h
            </button>
            <button
              type="button"
              className={wateringMode === "10h" ? "active" : ""}
              onClick={() => changeWateringMode("10h")}
              aria-pressed={wateringMode === "10h"}
            >
              10h
            </button>
          </div>
          <button className="berries-reset" type="button" onClick={resetNames} disabled={assigned === 0}>
            <Eraser size={16} /> Effacer les noms
          </button>
          <button className="berries-background-button" type="button" onClick={onEditBackground} title="Changer le fond de Baies">
            <span>Fond</span>
          </button>
        </div>
      </header>

      {notificationNotice && (
        <div className="berries-notification-notice">
          <BellRing size={15} />
          <span>{notificationNotice}</span>
          <button type="button" onClick={() => setNotificationNotice(null)} aria-label="Fermer">×</button>
        </div>
      )}

      <div className="berries-summary-grid">
        <article className="berries-summary-card">
          <span className="berries-summary-icon"><Sprout size={19} /></span>
          <div><small>Organisation</small><strong>6 personnages</strong><span>{assigned}/6 renseignés</span></div>
        </article>
        <article className="berries-summary-card">
          <span className="berries-summary-icon"><Cherry size={19} /></span>
          <div><small>Répartition</small><strong>2 Mépo · 2 Ceriz</strong><span>1 Pécha · 1 Fraive</span></div>
        </article>
        <article className="berries-summary-card">
          <span className="berries-summary-icon"><Hourglass size={19} /></span>
          <div><small>Cultures actives</small><strong>{activeTimers}/6 chronos</strong><span>{wateringMode === "10h" ? "1 arrosage à 10h · récolte 20h/16h" : "Mépo : 8h + 16h · autres : 8h"}</span></div>
        </article>
      </div>

      <div className="berries-layout">
        <div className="berries-character-section">
          <div className="berries-section-heading">
            <div><p className="eyebrow">Personnages</p><h2>Répartition des cultures</h2></div>
            <span>Les noms et chronos sont sauvegardés automatiquement sur cet appareil.</span>
          </div>

          <div className="berries-character-grid">
            {SLOTS.map((slot, index) => {
              const timer = timers[slot.id];
              const durationHours: 16 | 20 = slot.berry === "Mépo" ? 20 : 16;
              const snapshot = timer ? timerSnapshot(timer, now) : null;
              return (
                <article className={`berry-character-card ${timer ? "timer-running" : ""} ${snapshot?.completed ? "timer-complete" : ""}`} key={slot.id} style={{ "--berry-accent": slot.accent } as CSSProperties}>
                  <div className="berry-character-topline">
                    <span className="berry-slot-number">#{index + 1}</span>
                    <div className="berry-card-actions">
                      <span className="berry-type-pill"><Leaf size={13} /> {slot.berry}</span>
                      {!timer ? (
                        <button className="berry-timer-button" type="button" onClick={() => void beginTimer(slot)} title={`Lancer le chrono ${durationHours}h`}>
                          <Hourglass size={14} /> <span>Démarrer {durationHours}h</span>
                        </button>
                      ) : (
                        <button className="berry-timer-button reset" type="button" onClick={() => resetTimer(slot.id)} title="Réinitialiser le chrono">
                          <RotateCcw size={14} /> <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <h3>{slot.label}</h3>
                  <label className="berry-character-name">
                    <span>Nom du personnage</span>
                    <input
                      value={names[slot.id] ?? ""}
                      onChange={(event) => setNames((current) => ({ ...current, [slot.id]: event.target.value }))}
                      placeholder="Entre le nom du personnage…"
                      maxLength={40}
                      autoComplete="off"
                    />
                  </label>

                  {timer && snapshot && (
                    <div className={`berry-timer-panel ${snapshot.completed ? "complete" : ""}`}>
                      <div className="berry-timer-head">
                        <div>
                          <small>{snapshot.completed ? "Culture terminée" : "Temps restant"}</small>
                          <strong>{snapshot.completed ? "Récolte prête" : formatTimerRemaining(snapshot.totalRemaining)}</strong>
                        </div>
                        {snapshot.nextCheckpoint ? (
                          <span className={`berry-next-step ${snapshot.nextCheckpoint.kind === "harvest" ? "harvest" : ""}`}>
                            {snapshot.nextCheckpoint.kind === "harvest" ? <Wheat size={13} /> : <Droplets size={13} />}
                            {snapshot.nextCheckpoint.label} dans {formatTimerRemaining(snapshot.nextRemaining)}
                          </span>
                        ) : (
                          <span className="berry-next-step harvest"><Wheat size={13} /> Récolte maintenant</span>
                        )}
                      </div>
                      <div className="berry-checkpoints">
                        {snapshot.checkpoints.map((checkpoint) => {
                          const dueAt = timer.startedAt + checkpoint.offsetHours * 60 * 60 * 1000;
                          const done = now >= dueAt;
                          const isNext = snapshot.nextCheckpoint?.key === checkpoint.key;
                          return (
                            <div className={`berry-checkpoint ${done ? "done" : ""} ${isNext ? "next" : ""}`} key={checkpoint.key}>
                              <span className="berry-checkpoint-dot">{checkpoint.kind === "water" ? <Droplets size={11} /> : <Wheat size={11} />}</span>
                              <span>{checkpoint.label}</span>
                              <strong>{checkpoint.offsetHours}h</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="berry-seed-list">
                    {slot.seeds.map((seed) => (
                      <div className="berry-seed-row" key={`${slot.id}-${seed.name}`}>
                        <span>{seed.name}</span>
                        <strong>× {seed.amount}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="berry-card-total">
                    <span>Total personnage</span>
                    <strong>{slot.seeds.reduce((sum, seed) => sum + seed.amount, 0)} graines</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="berries-totals-card">
          <div className="berries-totals-heading">
            <span className="berries-summary-icon"><Wheat size={18} /></span>
            <div><p className="eyebrow">Stock à préparer</p><h2>Total par tournée</h2></div>
          </div>
          <p className="berries-totals-copy">Quantités cumulées pour rendre les six personnages autonomes sur une tournée Mépo.</p>
          <div className="berries-total-list">
            {TOTALS.map((seed) => (
              <div className={`berries-total-row ${seed.tone}`} key={seed.name}>
                <span>{seed.name}</span>
                <strong>{seed.amount}</strong>
              </div>
            ))}
          </div>
          <div className="berries-grand-total">
            <span>Total général</span>
            <strong>2 496</strong>
            <small>graines / tournée</small>
          </div>
          <div className="berries-pair-note">
            <strong>Repères rapides</strong>
            <span>Mépo ×2 : 312 Très Épicées + 312 Simples Amères + 312 Simples Sucrées.</span>
            <span>Ceriz ×2 : 936 Simples Épicées.</span>
          </div>
          <div className="berries-timer-note">
            <Hourglass size={14} />
            <div>
              <strong>Chronos de culture · mode {wateringMode}</strong>
              {wateringMode === "10h" ? (
                <>
                  <span>Toutes les baies : un seul arrosage à 10h.</span>
                  <span>Mépo : récolte à 20h · autres : récolte à 16h.</span>
                </>
              ) : (
                <>
                  <span>Mépo : arrosage à 8h et 16h, récolte à 20h.</span>
                  <span>Autres : arrosage à 8h, récolte à 16h.</span>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
