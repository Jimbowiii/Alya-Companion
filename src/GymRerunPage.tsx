import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Coins,
  Dumbbell,
  MapPinned,
  Pencil,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Swords,
} from "lucide-react";
import { GYM_RERUN_TEAMS, type GymPokemonBuild, type GymRerunTeam } from "./gymRerunData";
import gymRerunHubVideo from "./assets/gym-rerun/gym-rerun-hub.mp4";
import sixPillarsVideo from "./assets/gym-rerun/six-pillars.mp4";
import sevenHellsVideo from "./assets/gym-rerun/seven-hells.mp4";
import doubleTyphlosionVideo from "./assets/gym-rerun/double-typhlosion.mp4";
import prehistoricFiveVideo from "./assets/gym-rerun/prehistoric-5.mp4";
import starryDanceVideo from "./assets/gym-rerun/starry-dance.mp4";
import tempestExplosionVideo from "./assets/gym-rerun/tempest-explosion.mp4";
import sixPillarsPoster from "./assets/gym-rerun/six-pillars.webp";
import sevenHellsPoster from "./assets/gym-rerun/seven-hells.webp";
import doubleTyphlosionPoster from "./assets/gym-rerun/double-typhlosion.webp";
import prehistoricFivePoster from "./assets/gym-rerun/prehistoric-5.webp";
import starryDancePoster from "./assets/gym-rerun/starry-dance.webp";
import tempestExplosionPoster from "./assets/gym-rerun/tempest-explosion.webp";

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
const spriteUrl = (id: number) => `${SPRITE_BASE}/${id}.gif`;
const PROGRESS_KEY = "alya-gym-rerun-progress-v1";

type GymRerunPageProps = {
  onEditBackground: () => void;
  onBackgroundVideoChange: (src: string | null) => void;
};

type ViewMode = "team" | "path";

type ProgressMap = Record<string, number[]>;

type TeamMedia = { video: string; poster: string };

const TEAM_MEDIA: Record<string, TeamMedia> = {
  "6-pillars": { video: sixPillarsVideo, poster: sixPillarsPoster },
  "7-hells": { video: sevenHellsVideo, poster: sevenHellsPoster },
  "double-typhlosion": { video: doubleTyphlosionVideo, poster: doubleTyphlosionPoster },
  "prehistoric-5": { video: prehistoricFiveVideo, poster: prehistoricFivePoster },
  "starry-dance": { video: starryDanceVideo, poster: starryDancePoster },
  "tempest-explosion": { video: tempestExplosionVideo, poster: tempestExplosionPoster },
};

type TeamPotential = { label: string; note: string };

const TEAM_POTENTIALS: Record<string, TeamPotential> = {
  "6-pillars": { label: "≈ 400–450k ¥", note: "Potentiel indicatif selon la route, le boost d'argent et ta vitesse d'exécution." },
  "7-hells": { label: "≈ 350k ¥", note: "Potentiel indicatif sur un rerun simple ; la stratégie est particulièrement adaptée au multi-compte." },
  "double-typhlosion": { label: "≈ 250k ¥", note: "Potentiel indicatif : stratégie économique et simple, mais moins rentable que les routes avancées." },
  "prehistoric-5": { label: "≈ 450–500k ¥ + XP", note: "Le sixième emplacement libre permet aussi de monter un Pokémon pendant le rerun." },
  "starry-dance": { label: "≈ 400–500k ¥", note: "Estimation indicative pour cette route avancée ; le résultat varie fortement avec les changements d'objets et le rythme." },
  "tempest-explosion": { label: "jusqu’à ≈ 550k ¥", note: "Potentiel élevé avec exécution rapide ; cette stratégie demande davantage de concentration et de changements d'objets." },
};

function mediaForTeam(team: GymRerunTeam): TeamMedia {
  return TEAM_MEDIA[team.id] ?? { video: gymRerunHubVideo, poster: sixPillarsPoster };
}

function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: ProgressMap = {};
    for (const [teamId, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) result[teamId] = value.filter((entry): entry is number => typeof entry === "number");
    }
    return result;
  } catch {
    return {};
  }
}

function statRows(build: GymPokemonBuild) {
  const keys = ["PV", "ATQ", "DEF", "ATQ SPÉ", "DEF SPÉ", "VIT"] as const;
  return keys.map((key) => ({ key, iv: build.ivs[key] ?? "—", ev: build.evs[key] ?? "0" }));
}

function TeamArtwork({ team, detail = false }: { team: GymRerunTeam; detail?: boolean }) {
  const media = mediaForTeam(team);
  const previewRef = useRef<HTMLVideoElement>(null);

  const startPreview = () => {
    const video = previewRef.current;
    if (!video) return;
    void video.play().catch(() => undefined);
  };

  const stopPreview = () => {
    const video = previewRef.current;
    if (!video) return;
    video.pause();
    try { video.currentTime = 0; } catch { /* WebView2 peut refuser tant que les métadonnées ne sont pas chargées. */ }
  };

  return <div
    className={`gym-team-artwork ${detail ? "detail" : ""}`}
    style={{ "--gym-team-accent": team.accent } as CSSProperties}
    onMouseEnter={startPreview}
    onMouseLeave={stopPreview}
  >
    <img className="gym-team-artwork-poster" src={media.poster} alt={`Illustration de ${team.name}`} loading="lazy" />
    <video
      ref={previewRef}
      className="gym-team-artwork-video"
      muted
      loop
      playsInline
      preload="metadata"
      poster={media.poster}
      aria-hidden="true"
    >
      <source src={media.video} type="video/mp4"/>
    </video>
    <div className="gym-team-artwork-shade" aria-hidden="true"/>
    {!detail && <div className="gym-team-artwork-clear-strip" aria-hidden="true"/>}
  </div>;
}

function PokemonBuildCard({ build, index }: { build: GymPokemonBuild; index: number }) {
  const [spriteFailed, setSpriteFailed] = useState(false);
  return <article className={`gym-pokemon-card ${build.optional ? "optional" : ""}`}>
    <div className="gym-pokemon-card-top">
      <span className="gym-pokemon-index">#{index + 1}</span>
      <span className="gym-pokemon-role">{build.optional ? "Option" : build.role}</span>
    </div>
    <div className="gym-pokemon-identity">
      <div className="gym-pokemon-sprite">
        {!spriteFailed
          ? <img src={spriteUrl(build.spriteId)} alt={build.name} onError={() => setSpriteFailed(true)} />
          : <Swords size={30}/>} 
      </div>
      <div><h3>{build.name}</h3>{build.englishName && build.englishName !== build.name && <small>{build.englishName}</small>}<div className="gym-type-row">{build.types.map((type) => <span key={type}>{type}</span>)}</div></div>
    </div>

    <div className="gym-build-meta-grid">
      <div><span>Objet</span><strong>{build.item}</strong></div>
      <div><span>Talent</span><strong>{build.ability}</strong></div>
      <div><span>Nature</span><strong>{build.nature}</strong></div>
    </div>

    <div className="gym-move-section"><span className="gym-section-label">Attaques</span><div className="gym-move-list">{build.moves.map((move) => <span key={move}>{move}</span>)}</div></div>

    <div className="gym-stat-table">
      <div className="gym-stat-head"><span>Stat</span><span>IV</span><span>EV</span></div>
      {statRows(build).map(({ key, iv, ev }) => <div className="gym-stat-row" key={key}><span>{key}</span><strong>{iv}</strong><strong>{ev}</strong></div>)}
    </div>
    {build.notes?.length ? <div className="gym-build-notes">{build.notes.map((note) => <span key={note}><CircleAlert size={13}/>{note}</span>)}</div> : null}
  </article>;
}

function TeamList({ onSelect }: { onSelect: (team: GymRerunTeam) => void }) {
  return <section className="gym-team-grid">
    {GYM_RERUN_TEAMS.map((team) => {
      const potential = TEAM_POTENTIALS[team.id];
      return <button className="gym-team-card" key={team.id} onClick={() => onSelect(team)} style={{ "--gym-team-accent": team.accent } as CSSProperties}>
        <TeamArtwork team={team}/>
        <div className="gym-team-card-body">
          <div className="gym-team-card-title"><div><span className="eyebrow">Gym Rerun</span><h2>{team.name}</h2></div><span className="gym-open-pill">Ouvrir →</span></div>
          <p>{team.subtitle}</p>
          {potential && <div className="gym-team-profit" title={potential.note}>
            <span><Coins size={15}/> Bénéfice potentiel</span>
            <strong>{potential.label}</strong>
          </div>}
          <div className="gym-team-stats">
            <span><Dumbbell size={14}/><strong>{team.pokemonCount}</strong> Pokémon</span>
            <span><Route size={14}/><strong>{team.routeCount}</strong> étapes</span>
          </div>
          <div className="gym-region-list">{team.regions.map((region) => <span key={region}>{region}</span>)}</div>
        </div>
      </button>;
    })}
  </section>;
}

function PathView({ team, progress, onToggle, onReset }: {
  team: GymRerunTeam;
  progress: number[];
  onToggle: (step: number) => void;
  onReset: () => void;
}) {
  const regions = useMemo(() => Array.from(new Set(team.path.map((step) => step.region))), [team]);
  const [region, setRegion] = useState<string>("Toutes");
  const filtered = region === "Toutes" ? team.path : team.path.filter((step) => step.region === region);
  const completed = team.path.filter((step) => progress.includes(step.number)).length;
  const percent = team.path.length ? Math.round((completed / team.path.length) * 100) : 0;

  return <div className="gym-path-layout">
    <div className="gym-path-toolbar">
      <div className="gym-path-progress-copy"><span>Progression de la route</span><strong>{completed}/{team.path.length} · {percent}%</strong></div>
      <div className="gym-path-progress-track"><span style={{ width: `${percent}%` }}/></div>
      <div className="gym-path-filters">
        <button className={region === "Toutes" ? "active" : ""} onClick={() => setRegion("Toutes")}>Toutes</button>
        {regions.map((item) => <button key={item} className={region === item ? "active" : ""} onClick={() => setRegion(item)}>{item}</button>)}
      </div>
      <button className="gym-path-reset" onClick={onReset} disabled={progress.length === 0}><RefreshCw size={14}/> Réinitialiser</button>
    </div>

    <div className="gym-path-timeline">
      {filtered.map((step) => {
        const done = progress.includes(step.number);
        return <article key={`${step.number}-${step.city}`} className={`gym-path-step ${done ? "done" : ""} ${step.optional ? "optional" : ""}`}>
          <button className="gym-path-check" onClick={() => onToggle(step.number)} aria-label={done ? `Marquer ${step.city} comme non terminée` : `Marquer ${step.city} comme terminée`}>
            {done ? <Check size={15}/> : <span>{step.number}</span>}
          </button>
          <div className="gym-path-step-main">
            <div className="gym-path-step-head">
              <div><span className="gym-path-region">{step.region}</span><h3>{step.city}</h3>{step.leader && <small>{step.leader}{step.specialty ? ` · ${step.specialty}` : ""}</small>}</div>
              {step.optional && <span className="gym-optional-pill">Optionnel</span>}
            </div>

            <div className="gym-path-lead"><span>Lead</span><strong>{step.lead.join(" + ")}</strong></div>
            <div className="gym-path-actions">{step.actions.map((action) => <p key={action}><Swords size={14}/>{action}</p>)}</div>
            {step.variants?.length ? <div className="gym-path-variants"><strong>Variantes</strong>{step.variants.map((item) => <p key={item}>{item}</p>)}</div> : null}
            <div className="gym-path-flags">
              {step.heal && <span className={`gym-heal-flag ${step.heal}`}><ShieldCheck size={13}/>Soin {step.heal}</span>}
              {step.itemChanges?.map((change) => <span className="gym-item-change" key={change}>Objet · {change}</span>)}
            </div>
          </div>
        </article>;
      })}
    </div>
  </div>;
}

export function GymRerunPage({ onEditBackground, onBackgroundVideoChange }: GymRerunPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("team");
  const [progress, setProgress] = useState<ProgressMap>(() => readProgress());

  const team = selectedId ? GYM_RERUN_TEAMS.find((entry) => entry.id === selectedId) ?? null : null;

  const backgroundVideo = team ? mediaForTeam(team).video : gymRerunHubVideo;

  useEffect(() => {
    onBackgroundVideoChange(backgroundVideo);
  }, [backgroundVideo, onBackgroundVideoChange]);

  useEffect(() => () => onBackgroundVideoChange(null), [onBackgroundVideoChange]);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  const selectTeam = (next: GymRerunTeam) => {
    setSelectedId(next.id);
    setView("team");
  };

  const toggleStep = (teamId: string, step: number) => {
    setProgress((current) => {
      const values = current[teamId] ?? [];
      return {
        ...current,
        [teamId]: values.includes(step) ? values.filter((value) => value !== step) : [...values, step],
      };
    });
  };

  return <section className="gym-rerun-page">
    {!team ? <>
      <header className="page-header gym-rerun-header">
        <div><p className="eyebrow">PokeMMO · Stratégies</p><h1>Gym Rerun</h1><p>Choisis une équipe, prépare ses Pokémon puis suis le chemin d'arènes directement dans ALYA Companion.</p></div>
        <button className="icon-button" onClick={onEditBackground} title="Changer le fond de Gym Rerun" aria-label="Changer le fond de Gym Rerun"><Pencil size={16}/></button>
      </header>
      <div className="gym-rerun-intro">
        <div><Sparkles size={22}/><span>Compose ton équipe de milliardaire !</span><p>Choisis la stratégie qui te correspond, prépare tes Pokémon et transforme chaque rerun en tournée ultra rentable.</p></div>
        <div><MapPinned size={22}/><span>Trace ta route vers le jackpot</span><p>Suis l'ordre des arènes, les leads, les attaques, les soins et les changements d'objets sans perdre le fil.</p></div>
      </div>
      <TeamList onSelect={selectTeam}/>
    </> : <>
      <header className="page-header gym-team-detail-header" style={{ "--gym-team-accent": team.accent } as CSSProperties}>
        <div className="gym-team-detail-title">
          <button className="gym-back-button" onClick={() => { setSelectedId(null); setView("team"); }}><ArrowLeft size={15}/> Toutes les équipes</button>
          <p className="eyebrow">Gym Rerun</p><h1>{team.name}</h1><p>{team.description}</p>
        </div>
        <div className="gym-team-detail-actions">
          <button className={view === "team" ? "active" : ""} onClick={() => setView("team")}><Dumbbell size={16}/> Équipe</button>
          <button className={view === "path" ? "active" : ""} onClick={() => setView("path")}><Route size={16}/> Path</button>
          <button className="icon-button" onClick={onEditBackground} title="Changer le fond"><Pencil size={15}/></button>
        </div>
      </header>

      <div className="gym-team-summary" style={{ "--gym-team-accent": team.accent } as CSSProperties}>
        <div><span>Composition</span><strong>{team.pokemonCount} Pokémon</strong></div>
        <div><span>Route</span><strong>{team.routeCount} étapes</strong></div>
        <div><span>Régions</span><strong>{team.regions.join(" · ")}</strong></div>
      </div>

      {view === "team" ? <>
        {team.preparation?.length ? <div className="gym-preparation"><strong>Préparation consommables</strong><div>{team.preparation.map((item) => <span key={item}>{item}</span>)}</div></div> : null}
        <div className="gym-pokemon-grid">{team.pokemon.map((build, index) => <PokemonBuildCard key={`${build.name}-${index}`} build={build} index={index}/>)}</div>
      </> : <PathView
        team={team}
        progress={progress[team.id] ?? []}
        onToggle={(step) => toggleStep(team.id, step)}
        onReset={() => setProgress((current) => ({ ...current, [team.id]: [] }))}
      />}
    </>}
  </section>;
}
