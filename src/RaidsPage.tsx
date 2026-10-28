import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  MapPin,
  Pencil,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { RAIDS, type RaidGuide, type RaidPokemonBuild } from "./raidsData";

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
const spriteUrl = (id: number) => `${SPRITE_BASE}/${id}.gif`;
const PROGRESS_KEY = "alya-raids-turn-progress-v1";

type ViewMode = "teams" | "plan";
type ProgressMap = Record<string, number[]>;

type RaidsPageProps = {
  onEditBackground: () => void;
};

function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: ProgressMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) next[key] = value.filter((entry): entry is number => typeof entry === "number");
    }
    return next;
  } catch {
    return {};
  }
}

function PokemonMiniCard({ build, index }: { build: RaidPokemonBuild; index: number }) {
  const [failed, setFailed] = useState(false);
  return <article className="raid-pokemon-card">
    <div className="raid-pokemon-rank">#{index + 1}</div>
    <div className="raid-pokemon-head">
      <div className="raid-pokemon-sprite">
        {!failed ? <img src={spriteUrl(build.spriteId)} alt={build.name} onError={() => setFailed(true)} /> : <Swords size={24}/>} 
      </div>
      <div>
        <h4>{build.name}</h4>
        {build.ability && <span>{build.ability}</span>}
      </div>
    </div>
    <div className="raid-pokemon-meta"><span>Objet</span><strong>{build.item}</strong></div>
    <div className="raid-pokemon-meta"><span>Nature</span><strong>{build.nature}</strong></div>
    <div className="raid-pokemon-meta"><span>IV</span><strong>{build.ivs}</strong></div>
    <div className="raid-pokemon-meta"><span>EV</span><strong>{build.evs}</strong></div>
    <div className="raid-pokemon-moves">{build.moves.map((move) => <span key={move}>{move}</span>)}</div>
    {build.note && <p className="raid-pokemon-note"><CircleAlert size={13}/>{build.note}</p>}
  </article>;
}

function RaidGrid({ onSelect }: { onSelect: (raid: RaidGuide) => void }) {
  return <div className="raid-grid">
    {RAIDS.map((raid) => <button
      key={raid.id}
      className="raid-boss-card"
      onClick={() => onSelect(raid)}
      style={{ "--raid-accent": raid.accent } as CSSProperties}
    >
      <div className="raid-boss-aura" aria-hidden="true"/>
      <div className="raid-boss-sprite"><img src={spriteUrl(raid.bossId)} alt={raid.boss}/></div>
      <div className="raid-boss-copy">
        <div className="raid-boss-topline"><span>{raid.stars}★</span><strong>{raid.region}</strong></div>
        <h2>{raid.boss}</h2>
        <div className="raid-type-row">{raid.types.map((type) => <span key={type}>{type}</span>)}</div>
        <p>{raid.summary}</p>
        <div className="raid-location"><MapPin size={14}/>{raid.location}</div>
      </div>
      <span className="raid-open">Préparer →</span>
    </button>)}
  </div>;
}

function TeamsView({ raid }: { raid: RaidGuide }) {
  return <div className="raid-player-grid">
    {raid.players.map((player, playerIndex) => <section className="raid-player-panel" key={player.label}>
      <div className="raid-player-head">
        <div><span>Escouade {playerIndex + 1}</span><h3>{player.label}</h3></div>
        <strong>{player.role}</strong>
      </div>
      <div className="raid-player-team">{player.team.map((build, index) => <PokemonMiniCard key={`${player.label}-${index}-${build.name}`} build={build} index={index}/>)}</div>
    </section>)}
  </div>;
}

function PlanView({ raid, progress, onToggle, onReset }: {
  raid: RaidGuide;
  progress: number[];
  onToggle: (turn: number) => void;
  onReset: () => void;
}) {
  const completed = raid.turns.filter((entry) => progress.includes(entry.turn)).length;
  const percent = raid.turns.length ? Math.round((completed / raid.turns.length) * 100) : 0;
  return <div className="raid-plan">
    <div className="raid-plan-toolbar">
      <div><span>Progression du combat</span><strong>{completed}/{raid.turns.length} tours · {percent}%</strong></div>
      <div className="raid-plan-track"><i style={{ width: `${percent}%` }}/></div>
      <button onClick={onReset} disabled={!progress.length}><RefreshCw size={14}/> Réinitialiser</button>
    </div>
    <div className="raid-turn-table">
      <div className="raid-turn-head"><span>Tour</span>{raid.players.map((player) => <strong key={player.label}>{player.label}</strong>)}</div>
      {raid.turns.map((entry) => {
        const done = progress.includes(entry.turn);
        return <div className={`raid-turn-row ${done ? "done" : ""}`} key={entry.turn}>
          <button onClick={() => onToggle(entry.turn)}>{done ? <Check size={15}/> : entry.turn}</button>
          {entry.actions.map((action, index) => <div key={`${entry.turn}-${index}`}><span>J{index + 1}</span><strong>{action}</strong></div>)}
        </div>;
      })}
    </div>
  </div>;
}

export function RaidsPage({ onEditBackground }: RaidsPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("teams");
  const [progress, setProgress] = useState<ProgressMap>(() => readProgress());
  const raid = selectedId ? RAIDS.find((entry) => entry.id === selectedId) ?? null : null;

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  const completedTotal = useMemo(() => Object.values(progress).reduce((sum, turns) => sum + turns.length, 0), [progress]);

  const selectRaid = (next: RaidGuide) => {
    setSelectedId(next.id);
    setView("teams");
  };

  const toggleTurn = (turn: number) => {
    if (!raid) return;
    setProgress((current) => {
      const values = current[raid.id] ?? [];
      const next = values.includes(turn) ? values.filter((value) => value !== turn) : [...values, turn].sort((a, b) => a - b);
      return { ...current, [raid.id]: next };
    });
  };

  if (!raid) {
    return <div className="raid-page">
      <header className="raid-hero">
        <div>
          <span className="eyebrow">Centre de commandement</span>
          <h1>Raids</h1>
          <p>Choisis un boss, répartis les quatre joueurs et suis le plan de combat tour par tour.</p>
        </div>
        <button className="raid-background-button" onClick={onEditBackground}><Pencil size={16}/> Fond</button>
      </header>
      <div className="raid-overview">
        <div><Sparkles size={18}/><span><strong>{RAIDS.length}</strong> raids préparés</span></div>
        <div><Users size={18}/><span><strong>4</strong> joueurs par raid</span></div>
        <div><Shield size={18}/><span><strong>{completedTotal}</strong> tours cochés</span></div>
      </div>
      <RaidGrid onSelect={selectRaid}/>
    </div>;
  }

  const currentProgress = progress[raid.id] ?? [];
  return <div className="raid-page raid-detail" style={{ "--raid-accent": raid.accent } as CSSProperties}>
    <header className="raid-detail-hero">
      <button className="raid-back" onClick={() => setSelectedId(null)}><ArrowLeft size={17}/> Tous les raids</button>
      <div className="raid-detail-main">
        <div className="raid-detail-boss"><img src={spriteUrl(raid.bossId)} alt={raid.boss}/></div>
        <div>
          <span className="eyebrow">{raid.region} · {raid.location}</span>
          <h1>{raid.boss}</h1>
          <div className="raid-detail-tags"><span>{raid.stars}★</span>{raid.types.map((type) => <span key={type}>{type}</span>)}</div>
          <p>{raid.summary}</p>
        </div>
      </div>
      <div className="raid-detail-actions">
        <button className={view === "teams" ? "active" : ""} onClick={() => setView("teams")}><Users size={15}/> Escouades</button>
        <button className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><Swords size={15}/> Plan de combat</button>
        <button onClick={onEditBackground}><Pencil size={15}/> Fond</button>
      </div>
    </header>

    {raid.warnings.length > 0 && <section className="raid-warning-panel">
      <div className="raid-warning-title"><CircleAlert size={18}/><strong>Points de vigilance</strong></div>
      <div className="raid-warning-list">{raid.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
    </section>}

    {raid.mechanics?.length ? <section className="raid-mechanics">
      <div className="raid-mechanics-title"><Shield size={18}/><strong>Mécaniques du boss</strong></div>
      <div>{raid.mechanics.map((entry) => <span key={entry}>{entry}</span>)}</div>
    </section> : null}

    {view === "teams"
      ? <TeamsView raid={raid}/>
      : <PlanView raid={raid} progress={currentProgress} onToggle={toggleTurn} onReset={() => setProgress((current) => ({ ...current, [raid.id]: [] }))}/>} 
  </div>;
}
