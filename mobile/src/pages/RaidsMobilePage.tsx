import { useState } from "react";
import { ArrowLeft, Swords, Users } from "lucide-react";
import { RAIDS, type RaidGuide } from "../shared/raidsData";

const sprite = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

export function RaidsMobilePage() {
  const [raid, setRaid] = useState<RaidGuide | null>(null);
  const [view, setView] = useState<"teams" | "plan">("teams");

  if (!raid) return <section className="mobile-page">
    <header className="mobile-page-header"><div><span>UTILITIES</span><h1>Raids</h1><p>Boss, escouades et plan de combat.</p></div><Swords size={26}/></header>
    <div className="raid-mobile-grid">
      {RAIDS.map((item) => <button className="mobile-card raid-mobile-select" key={item.id} onClick={() => setRaid(item)}>
        <img src={sprite(item.bossId)} alt=""/>
        <div><small>{item.stars}★ · {item.region}</small><h2>{item.boss}</h2><p>{item.summary}</p></div>
      </button>)}
    </div>
  </section>;

  return <section className="mobile-page">
    <header className="mobile-page-header">
      <button className="mobile-back" onClick={() => setRaid(null)}><ArrowLeft size={18}/></button>
      <div><span>{raid.stars}★ · {raid.region}</span><h1>{raid.boss}</h1><p>{raid.location}</p></div>
    </header>
    <div className="mobile-tabs">
      <button className={view === "teams" ? "active" : ""} onClick={() => setView("teams")}><Users size={15}/> Escouades</button>
      <button className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><Swords size={15}/> Plan</button>
    </div>
    {view === "teams" ? <div className="mobile-card-list">
      {raid.players.map((player) => <article className="mobile-card" key={player.label}>
        <div className="mobile-card-title"><div><small>{player.label}</small><h2>{player.role}</h2></div></div>
        {player.team.map((pokemon) => <div className="raid-pokemon-mobile" key={`${player.label}-${pokemon.name}`}>
          <img src={sprite(pokemon.spriteId)} alt=""/>
          <div><strong>{pokemon.name}</strong><span>{pokemon.item}</span><small>{pokemon.moves.join(" · ")}</small></div>
        </div>)}
      </article>)}
    </div> : <div className="mobile-card-list">
      {raid.turns.map((turn) => <article className="mobile-card" key={turn.turn}>
        <small>TOUR {String(turn.turn).padStart(2, "0")}</small>
        {turn.actions.map((action, index) => <p key={index}><strong>J{index + 1}</strong> · {action}</p>)}
      </article>)}
    </div>}
  </section>;
}
