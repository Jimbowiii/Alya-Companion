import { useEffect, useState } from "react";
import { Sparkles, TimerReset } from "lucide-react";

const ROTATION_CYCLE = [
  { bird: { name: "Électhor", region: "Kanto", id: 145 }, beast: { name: "Entei", region: "Johto", id: 244 } },
  { bird: { name: "Sulfura", region: "Kanto", id: 146 }, beast: { name: "Suicune", region: "Johto", id: 245 } },
  { bird: { name: "Artikodin", region: "Kanto", id: 144 }, beast: { name: "Raikou", region: "Johto", id: 243 } },
] as const;

const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
const spriteUrl = (id: number, shiny: boolean) => `${SPRITES}/${shiny ? "shiny/" : ""}${id}.gif`;

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days}j ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function Legend({ value, shiny, active = false }: { value: { name: string; region: string; id: number }; shiny: boolean; active?: boolean }) {
  return <article className={`mobile-rotation-legend ${active ? "active" : ""}`}>
    <img src={spriteUrl(value.id, shiny)} alt="" />
    <div><span>{value.region}</span><strong>{value.name}</strong></div>
  </article>;
}

export function RotationsMobilePage() {
  const [now, setNow] = useState(Date.now());
  const [shiny, setShiny] = useState(false);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);

  const date = new Date(now);
  const index = date.getUTCMonth() % ROTATION_CYCLE.length;
  const current = ROTATION_CYCLE[index];
  const next = ROTATION_CYCLE[(index + 1) % ROTATION_CYCLE.length];
  const after = ROTATION_CYCLE[(index + 2) % ROTATION_CYCLE.length];
  const resetAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0);
  const month = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const localReset = new Date(resetAt).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });

  return <section className="mobile-page rotations-mobile-page">
    <header className="mobile-page-header">
      <div><span>ROAMING LEGENDARIES</span><h1>Rotations</h1><p>Le même cycle mensuel que sur ALYA PC.</p></div>
      <button className={`mobile-rotation-shiny ${shiny ? "active" : ""}`} onClick={() => setShiny((v) => !v)} aria-label="Basculer shiny"><Sparkles size={20}/></button>
    </header>

    <div className="mobile-rotation-title"><div><span>Rotation actuelle</span><strong>{month.charAt(0).toUpperCase() + month.slice(1)}</strong></div><em>Reset 00:00 UTC</em></div>
    <div className="mobile-rotation-grid"><Legend value={current.bird} shiny={shiny} active/><Legend value={current.beast} shiny={shiny} active/></div>

    <article className="mobile-rotation-timer"><TimerReset size={20}/><div><span>Prochain reset</span><strong>{countdown(resetAt - now)}</strong><small>{localReset}</small></div></article>

    <div className="mobile-section-label">Prochaine rotation</div>
    <div className="mobile-rotation-grid"><Legend value={next.bird} shiny={shiny}/><Legend value={next.beast} shiny={shiny}/></div>

    <article className="mobile-rotation-after"><span>Rotation suivante</span><div><Legend value={after.bird} shiny={shiny}/><Legend value={after.beast} shiny={shiny}/></div></article>
    <p className="mobile-rotation-note">Cycle fixe : Électhor/Entei → Sulfura/Suicune → Artikodin/Raikou. Calcul local, sans requête réseau.</p>
  </section>;
}
