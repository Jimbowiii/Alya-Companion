import { useMemo, useState } from "react";
import { ArrowLeft, Check, MapPinned, Swords } from "lucide-react";
import { GYM_RERUN_TEAMS, type GymRerunTeam } from "../shared/gymRerunData";

const sprite = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
const KEY = "alya-mobile-gym-progress-v1";

function readProgress(): Record<string, number[]> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number[]>; } catch { return {}; }
}

export function GymRerunMobilePage() {
  const [team, setTeam] = useState<GymRerunTeam | null>(null);
  const [view, setView] = useState<"team" | "path">("team");
  const [progress, setProgress] = useState<Record<string, number[]>>(readProgress);

  const done = useMemo(() => new Set(team ? progress[team.id] ?? [] : []), [progress, team]);

  const toggle = (number: number) => {
    if (!team) return;
    const next = new Set(progress[team.id] ?? []);
    if (next.has(number)) next.delete(number); else next.add(number);
    const updated = { ...progress, [team.id]: [...next] };
    setProgress(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  };

  if (!team) return <section className="mobile-page">
    <header className="mobile-page-header"><div><span>MAKE BIG MONEY</span><h1>Gym Rerun</h1><p>Choisis ta stratégie.</p></div><Swords size={26}/></header>
    <div className="mobile-card-list">
      {GYM_RERUN_TEAMS.map((item) => <button className="mobile-card mobile-select-card" key={item.id} onClick={() => setTeam(item)}>
        <div><small>{item.pokemonCount} Pokémon · {item.routeCount} étapes</small><h2>{item.name}</h2><p>{item.subtitle}</p></div>
        <span>Ouvrir →</span>
      </button>)}
    </div>
  </section>;

  return <section className="mobile-page">
    <header className="mobile-page-header">
      <button className="mobile-back" onClick={() => setTeam(null)}><ArrowLeft size={18}/></button>
      <div><span>GYM RERUN</span><h1>{team.name}</h1><p>{team.subtitle}</p></div>
    </header>
    <div className="mobile-tabs">
      <button className={view === "team" ? "active" : ""} onClick={() => setView("team")}>Équipe</button>
      <button className={view === "path" ? "active" : ""} onClick={() => setView("path")}><MapPinned size={15}/> Path</button>
    </div>
    {view === "team" ? <div className="mobile-card-list">
      {team.pokemon.map((pokemon) => <article className="mobile-card pokemon-mobile-card" key={pokemon.name}>
        <div className="pokemon-mobile-head"><img src={sprite(pokemon.spriteId)} alt=""/><div><h2>{pokemon.name}</h2><span>{pokemon.role}</span></div></div>
        <div className="mobile-meta-grid"><span>Objet<strong>{pokemon.item}</strong></span><span>Talent<strong>{pokemon.ability}</strong></span><span>Nature<strong>{pokemon.nature}</strong></span></div>
        <div className="mobile-chip-row">{pokemon.moves.map((move) => <span key={move}>{move}</span>)}</div>
        {pokemon.notes?.map((note) => <p className="mobile-note" key={note}>{note}</p>)}
      </article>)}
    </div> : <div className="mobile-card-list">
      {team.path.map((step) => <article className={`mobile-card path-mobile-card ${done.has(step.number) ? "done" : ""}`} key={step.number}>
        <div className="mobile-card-title"><div><small>ÉTAPE {step.number} · {step.region}</small><h2>{step.city}</h2><span>{step.leader ?? ""} {step.specialty ? `· ${step.specialty}` : ""}</span></div><button className="round-check" onClick={() => toggle(step.number)}>{done.has(step.number) ? <Check size={17}/> : step.number}</button></div>
        <p><strong>Lead :</strong> {step.lead.join(" + ")}</p>
        {step.actions.map((action) => <p key={action}>• {action}</p>)}
        {step.itemChanges?.map((item) => <p className="mobile-note" key={item}>Objet : {item}</p>)}
      </article>)}
    </div>}
  </section>;
}
