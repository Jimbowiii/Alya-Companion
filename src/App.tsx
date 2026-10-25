import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  ChevronUp,
  CloudDownload,
  FolderOpen,
  Gauge,
  GripVertical,
  Gem,
  Image as ImageIcon,
  MessagesSquare,
  RefreshCw,
  RotateCcw,
  Save,
  Pencil,
  Settings as SettingsIcon,
  ShipWheel,
  Sparkles,
  TimerReset,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { api } from "./bridge";
import {
  checkCompanionUpdate,
  installCompanionUpdate,
} from "./updater";
import type { EmbeddedWebviewKind } from "./bridge";
import type { AppState, CompanionUpdateStatus, Settings, SurfPatch, ThemeStatus } from "./types";
import alyaIcon from "./assets/alya-icon.png";
import dashboardBackground from "./assets/dashboard-background.webm";
import surfTogekissShiny from "./assets/surf-previews/togekiss-shiny.png";
import surfKyogreShiny from "./assets/surf-previews/kyogre-shiny.png";
import surfPrimalKyogreShiny from "./assets/surf-previews/primal-kyogre-shiny.png";
import surfDemanta from "./assets/surf-previews/demanta.png";
import surfLugiaShiny from "./assets/surf-previews/lugia-shiny.png";
import surfLugiaNormal from "./assets/surf-previews/lugia-normal.png";
import surfLatiasShiny from "./assets/surf-previews/latias-shiny.png";

type Tab = "dashboard" | "theme" | "surf" | "vanity" | "shinyboard" | "rotations" | "forum" | "settings";

const EMPTY_SETTINGS: Settings = {
  pokemmo_dir: "",
  rom_path: "",
  vanity_url: "https://www.crimsoncoremmo.co.uk/vanity-booth",
  accent_color: "#9b7bdf",
  hidden_tabs: [],
  tab_order: ["dashboard", "theme", "surf", "vanity", "shinyboard", "rotations", "forum", "settings"],
  dashboard_modules: ["theme", "surf", "rotations"],
};

const NAV_ITEMS = [
  ["dashboard", "Dashboard", Gauge],
  ["theme", "AlyArchetype", Sparkles],
  ["surf", "Surf Manager", ShipWheel],
  ["vanity", "Vanity", ImageIcon],
  ["shinyboard", "Shinyboard", Gem],
  ["rotations", "Rotations", TimerReset],
  ["forum", "Forum", MessagesSquare],
  ["settings", "Settings", SettingsIcon],
] as const;

const DASHBOARD_MODULES = [
  ["theme", "AlyArchetype", Sparkles],
  ["surf", "Surf", ShipWheel],
  ["rotations", "Rotations", TimerReset],
  ["vanity", "Vanity", ImageIcon],
  ["shinyboard", "Shinyboard", Gem],
  ["forum", "Forum", MessagesSquare],
] as const;

const EXTERNAL_TABS: Partial<Record<Tab, EmbeddedWebviewKind>> = {
  vanity: "vanity",
  shinyboard: "shinyboard",
  forum: "forum",
};

const ROTATION_CYCLE = [
  {
    bird: { name: "Électhor", region: "Kanto", id: 145 },
    beast: { name: "Entei", region: "Johto", id: 244 },
  },
  {
    bird: { name: "Sulfura", region: "Kanto", id: 146 },
    beast: { name: "Suicune", region: "Johto", id: 245 },
  },
  {
    bird: { name: "Artikodin", region: "Kanto", id: 144 },
    beast: { name: "Raikou", region: "Johto", id: 243 },
  },
] as const;

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
const spriteUrl = (id: number, shiny = false) => `${SPRITE_BASE}/${shiny ? "shiny/" : ""}${id}.gif`;

const SURF_PREVIEWS: Record<string, { src: string; photo?: boolean }> = {
  "togekiss-shiny": { src: surfTogekissShiny },
  "kyogre-shiny": { src: surfKyogreShiny },
  "primal-kyogre-shiny": { src: surfPrimalKyogreShiny },
  "mantine-x3": { src: surfDemanta, photo: true },
  "lugia-shiny": { src: surfLugiaShiny },
  "lugia-normal": { src: surfLugiaNormal },
  "latias-shiny": { src: surfLatiasShiny },
};

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={`pill ${ok ? "pill-ok" : "pill-warn"}`}>{children}</span>;
}

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [state, setState] = useState<AppState | null>(null);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [patches, setPatches] = useState<SurfPatch[]>([]);
  const [companionUpdate, setCompanionUpdate] = useState<CompanionUpdateStatus | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [dashboardEditorOpen, setDashboardEditorOpen] = useState(false);
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null);
  const draggedTabRef = useRef<Tab | null>(null);
  const dragOrderRef = useRef<Tab[] | null>(null);
  const embeddedHostRef = useRef<HTMLDivElement | null>(null);

  const notify = (kind: "ok" | "error", text: string) => setMessage({ kind, text });

  const load = async () => {
    try {
      const next = await api.getState();
      setState((current) => {
        const remote = current?.theme_status;
        const local = next.theme_status;
        if (!remote?.latest_version || !local) return next;
        return {
          ...next,
          theme_status: {
            ...local,
            latest_version: remote.latest_version,
            release_name: remote.release_name,
            changelog: remote.changelog,
            published_at: remote.published_at,
            asset_name: remote.asset_name,
            update_available: local.local_version !== remote.latest_version && remote.update_available,
          },
        };
      });
      setSettings({ ...EMPTY_SETTINGS, ...next.settings });
      try {
        setPatches(await api.listSurfPatches());
      } catch {
        setPatches([]);
      }
    } catch (error) {
      notify("error", String(error));
    }
  };

  useEffect(() => {
    void load();
    void checkCompanionUpdate()
      .then(setCompanionUpdate)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const kind = EXTERNAL_TABS[tab];
    if (!kind || customizeOpen) {
      void api.hideEmbeddedWebviews().catch(() => undefined);
      return;
    }

    let frame = 0;
    let disposed = false;
    const host = embeddedHostRef.current;
    if (!host) return;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed || !embeddedHostRef.current) return;
        const rect = embeddedHostRef.current.getBoundingClientRect();
        if (rect.width < 160 || rect.height < 160) return;
        void api.showEmbeddedWebview(kind, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        }).catch((error) => notify("error", `${kind} : ${String(error)}`));
      });
    };

    const observer = new ResizeObserver(sync);
    observer.observe(host);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    sync();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      void api.hideEmbeddedWebviews().catch(() => undefined);
    };
  }, [tab, customizeOpen, settings.vanity_url]);

  const run = async (label: string, action: () => Promise<unknown>, success?: string, reloadAfter = true) => {
    setBusy(label);
    setMessage(null);
    try {
      await action();
      if (success) notify("ok", success);
      if (reloadAfter) await load();
    } catch (error) {
      notify("error", String(error));
    } finally {
      setBusy(null);
    }
  };

  const persistSettings = async (nextSettings: Settings) => {
    const next = await api.saveSettings(nextSettings);
    setSettings({ ...EMPTY_SETTINGS, ...next.settings });
    setState(next);
    return next;
  };

  const saveSettings = () => run("settings", async () => {
    await persistSettings(settings);
  }, "Configuration enregistrée.");

  const pickDirectory = async (field: "pokemmo_dir") => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      const nextSettings = { ...settings, [field]: selected };
      setSettings(nextSettings);
      await run("settings", () => persistSettings(nextSettings), "Dossier PokeMMO enregistré.");
    }
  };

  const pickFile = async (field: "rom_path") => {
    const selected = await open({ directory: false, multiple: false });
    if (typeof selected === "string") {
      const nextSettings = { ...settings, [field]: selected };
      setSettings(nextSettings);
      await run("settings", () => persistSettings(nextSettings), "ROM enregistrée.");
    }
  };

  const refreshCompanionUpdate = async () => {
    const update = await checkCompanionUpdate();
    setCompanionUpdate(update);
    return update;
  };

  const performCompanionUpdate = async () => {
    setBusy("companion-update");
    setMessage(null);
    setUpdateProgress(0);

    try {
      await installCompanionUpdate((percent) => {
        setUpdateProgress(percent);
      });

      // Sur Windows, si l'installation est lancée correctement,
      // Tauri va quitter Alya Companion automatiquement.
    } catch (error) {
      notify("error", String(error));
      setBusy(null);
      setUpdateProgress(null);
    }
  };

  const applyAccentColor = async (color: string) => {
    const nextSettings = { ...settings, accent_color: color };
    setSettings(nextSettings);
    try {
      await persistSettings(nextSettings);
    } catch (error) {
      notify("error", String(error));
    }
  };

  const toggleTabVisibility = async (id: Tab) => {
    if (id === "dashboard") return;
    const hidden = new Set(settings.hidden_tabs ?? []);
    if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
    const nextSettings = { ...settings, hidden_tabs: Array.from(hidden) };
    setSettings(nextSettings);
    if (hidden.has(tab)) setTab("dashboard");
    try {
      await persistSettings(nextSettings);
    } catch (error) {
      notify("error", String(error));
    }
  };

  const normalizedTabOrder = (order: string[] | undefined): Tab[] => {
    const known = NAV_ITEMS.map(([id]) => id) as Tab[];
    const seen = new Set<Tab>();
    const result: Tab[] = [];
    for (const raw of order ?? []) {
      if ((known as string[]).includes(raw) && !seen.has(raw as Tab)) {
        seen.add(raw as Tab);
        result.push(raw as Tab);
      }
    }
    for (const id of known) if (!seen.has(id)) result.push(id);
    return result;
  };

  const persistTabOrder = async (order: Tab[]) => {
    const nextSettings = { ...settings, tab_order: order };
    setSettings(nextSettings);
    try {
      await persistSettings(nextSettings);
    } catch (error) {
      notify("error", String(error));
    }
  };

  const reorderTabs = (order: Tab[], from: Tab, to: Tab) => {
    if (from === to) return order;
    const fromIndex = order.indexOf(from);
    const toIndex = order.indexOf(to);
    if (fromIndex < 0 || toIndex < 0) return order;
    const next = [...order];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
  };

  const moveTab = async (from: Tab, to: Tab) => {
    const order = normalizedTabOrder(settings.tab_order);
    const next = reorderTabs(order, from, to);
    if (next === order) return;
    await persistTabOrder(next);
  };

  const moveTabByOffset = async (id: Tab, offset: -1 | 1) => {
    const order = normalizedTabOrder(settings.tab_order);
    const index = order.indexOf(id);
    const targetIndex = index + offset;
    if (index < 0 || targetIndex < 0 || targetIndex >= order.length) return;
    await moveTab(id, order[targetIndex]);
  };

  const beginTabPointerDrag = (event: React.PointerEvent<HTMLSpanElement>, id: Tab) => {
    if (event.button !== 0) return;
    event.preventDefault();
    draggedTabRef.current = id;
    dragOrderRef.current = normalizedTabOrder(settings.tab_order);
    setDraggedTab(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continueTabPointerDrag = (event: React.PointerEvent<HTMLSpanElement>) => {
    const from = draggedTabRef.current;
    if (!from) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const row = element?.closest<HTMLElement>("[data-tab-id]");
    const to = row?.dataset.tabId as Tab | undefined;
    if (!to || to === from) return;

    const order = dragOrderRef.current ?? normalizedTabOrder(settings.tab_order);
    const next = reorderTabs(order, from, to);
    if (next === order) return;

    dragOrderRef.current = next;
    setSettings((current) => ({ ...current, tab_order: next }));
  };

  const endTabPointerDrag = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!draggedTabRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const finalOrder = dragOrderRef.current;
    draggedTabRef.current = null;
    dragOrderRef.current = null;
    setDraggedTab(null);

    if (finalOrder) void persistTabOrder(finalOrder);
  };

  const toggleDashboardModule = async (id: string) => {
    const visible = new Set(settings.dashboard_modules ?? []);
    if (visible.has(id)) visible.delete(id); else visible.add(id);
    const nextSettings = { ...settings, dashboard_modules: Array.from(visible) };
    setSettings(nextSettings);
    try {
      await persistSettings(nextSettings);
    } catch (error) {
      notify("error", String(error));
    }
  };

  const theme = state?.theme_status;
  const activePatch = state?.surf_state.active_patch_name ?? "ROM d'origine / inconnu";
  const hiddenTabs = settings.hidden_tabs ?? [];
  const tabOrder = useMemo(() => normalizedTabOrder(settings.tab_order), [settings.tab_order]);
  const nav = useMemo(() => tabOrder.map((id) => NAV_ITEMS.find(([itemId]) => itemId === id)!).filter(([id]) => id === "dashboard" || !hiddenTabs.includes(id)), [tabOrder, hiddenTabs]);
  const dashboardModules = settings.dashboard_modules ?? ["theme", "surf", "rotations"];
  const appStyle = { "--accent": settings.accent_color || "#9b7bdf" } as CSSProperties;

  return (
    <div className="app-shell" style={appStyle}>
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src={alyaIcon} alt="Logo Alya Companion" />
          <div className="brand-copy"><strong>Alya Companion</strong></div>
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "nav-active" : ""} onClick={() => setTab(id)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className={`customize-trigger ${customizeOpen ? "active" : ""}`} onClick={() => setCustomizeOpen((value) => !value)} title="Personnaliser Alya Companion" aria-label="Personnaliser Alya Companion">
            <Wrench size={18} />
          </button>
          <StatusPill ok={Boolean(state?.pokemmo_detected)}>
            {state?.pokemmo_detected ? "PokeMMO détecté" : "PokeMMO non configuré"}
          </StatusPill>
          {state?.pokemmo_running && <span className="running-warning">PokeMMO est ouvert — modifications bloquées</span>}
          <span className="app-version">Alya Companion {companionUpdate?.current_version ?? "1.0.0-rc.4"}{companionUpdate?.development_build ? " DEV" : ""}</span>
        </div>
      </aside>

      <main className={`content ${tab === "dashboard" ? "dashboard-content" : ""}`}>
        {tab === "dashboard" && <video className="dashboard-media" src={dashboardBackground} autoPlay loop muted playsInline aria-hidden="true" />}
        {message && (
          <div className={`toast ${message.kind}`}>
            {message.kind === "ok" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
            <span>{message.text}</span><button onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        {tab === "dashboard" && (
          <section>
            <header className="page-header">
              <div><p className="eyebrow">Overview</p><h1>Dashboard</h1></div>
              <div className="dashboard-header-actions">
                <button className={`icon-button dashboard-edit-button ${dashboardEditorOpen ? "active" : ""}`} onClick={() => setDashboardEditorOpen((value) => !value)} title="Choisir les modules du Dashboard" aria-label="Choisir les modules du Dashboard"><Pencil size={16} /></button>
                <button className="ghost" disabled={Boolean(busy)} onClick={() => void load()}><RefreshCw size={17} /> Actualiser</button>
              </div>
            </header>
            {dashboardEditorOpen && (
              <div className="dashboard-editor-panel">
                <div className="dashboard-editor-head"><div><span className="eyebrow">Dashboard</span><strong>Modules affichés</strong></div><button className="icon-button" onClick={() => setDashboardEditorOpen(false)} title="Fermer"><X size={16}/></button></div>
                <div className="dashboard-module-list">
                  {DASHBOARD_MODULES.map(([id, label, Icon]) => (
                    <label className="dashboard-module-toggle" key={id}>
                      <input type="checkbox" checked={dashboardModules.includes(id)} onChange={() => void toggleDashboardModule(id)} />
                      <Icon size={16}/><span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {companionUpdate?.update_available && (
              <div className="update-banner">
                <div><CloudDownload size={19}/><span><strong>Alya Companion {companionUpdate.latest_version}</strong> est disponible.</span></div>
                <button
                  className="primary compact"
                  disabled={Boolean(busy)}
                  onClick={() => void performCompanionUpdate()}
                >
                  <CloudDownload size={16}/>
                  {busy === "companion-update"
                    ? updateProgress !== null
                      ? `Téléchargement ${updateProgress}%`
                      : "Téléchargement…"
                    : "Mettre à jour"}
                </button>
              </div>
            )}
            <div className="hero-card">
              <div><span className="kicker">Alya Companion</span><h2>Un seul endroit pour tes outils PokeMMO.</h2><p>Thème AlyArchetype, Surf Manager, Vanity, rotations légendaires, Shinyboard et forum dans une seule application.</p></div>
              <div className="hero-orb"><img src={alyaIcon} alt="" /></div>
            </div>
            <div className="grid three dashboard-modules-grid">
              {dashboardModules.includes("theme") && <article className="card">
                <div className="card-title"><Sparkles size={18} /><span>AlyArchetype</span></div>
                <strong className="big-value">{theme?.local_version ?? "Non détecté"}</strong>
                <p>{theme?.latest_version ? `Dernière release : ${theme.latest_version}` : "Source : Jimbowiii/AlyArchetype · AlyArchetype.zip"}</p>
                {theme && <StatusPill ok={!theme.update_available}>{theme.update_available ? "Mise à jour disponible" : "À jour"}</StatusPill>}
              </article>}
              {dashboardModules.includes("surf") && <article className="card">
                <div className="card-title"><ShipWheel size={18} /><span>Surf</span></div>
                <strong className="big-value">{activePatch}</strong>
                <p>{settings.rom_path || "Aucune ROM configurée."}</p>
                <button className="text-button" onClick={() => setTab("surf")}>Gérer les patches →</button>
              </article>}
              {dashboardModules.includes("rotations") && <article className="card">
                <div className="card-title"><TimerReset size={18} /><span>Rotations</span></div>
                <strong className="big-value">{currentRotationLabel()}</strong>
                <p>Les roamers de Kanto et Johto changent au 1er du mois à 00:00 UTC.</p>
                <button className="text-button" onClick={() => setTab("rotations")}>Voir le calendrier →</button>
              </article>}
              {dashboardModules.includes("vanity") && <article className="card">
                <div className="card-title"><ImageIcon size={18} /><span>Vanity</span></div>
                <strong className="big-value">Preview</strong>
                <p>Prévisualise les cosmétiques directement dans Alya Companion.</p>
                <button className="text-button" onClick={() => setTab("vanity")}>Ouvrir Vanity →</button>
              </article>}
              {dashboardModules.includes("shinyboard") && <article className="card">
                <div className="card-title"><Gem size={18} /><span>Shinyboard</span></div>
                <strong className="big-value">Dashboard</strong>
                <p>Accède à ton suivi Shinyboard directement depuis l'application.</p>
                <button className="text-button" onClick={() => setTab("shinyboard")}>Ouvrir Shinyboard →</button>
              </article>}
              {dashboardModules.includes("forum") && <article className="card">
                <div className="card-title"><MessagesSquare size={18} /><span>Forum</span></div>
                <strong className="big-value">PokeMMO</strong>
                <p>Consulte le forum officiel sans quitter Alya Companion.</p>
                <button className="text-button" onClick={() => setTab("forum")}>Ouvrir le forum →</button>
              </article>}
              {dashboardModules.length === 0 && <div className="dashboard-empty-modules"><Pencil size={20}/><span>Aucun module sélectionné. Utilise le crayon pour personnaliser le Dashboard.</span></div>}
            </div>
          </section>
        )}

        {tab === "theme" && <ThemePage theme={theme} busy={busy} configured={Boolean(settings.pokemmo_dir)} onRefresh={() => run("theme-refresh", async () => {
          const refreshed = await api.refreshTheme();
          setState((current) => current ? { ...current, theme_status: refreshed } : current);
        }, "Release AlyArchetype vérifiée.", false)} onUpdate={() => run("theme-update", api.updateTheme, "AlyArchetype mis à jour.").then(() => refreshCompanionUpdate().catch(() => undefined))} onRestore={() => run("theme-restore", api.restoreTheme, "Backup AlyArchetype restauré.")} />}

        {tab === "surf" && (
          <section>
            <header className="page-header"><div><p className="eyebrow">ROM Patching</p><h1>Surf Manager</h1><p>Chaque patch repart du backup de la ROM originale afin d'éviter d'empiler les modifications.</p></div></header>
            {state?.pokemmo_running && <div className="warning-box"><XCircle size={19} /><div><strong>PokeMMO est ouvert.</strong><span>Ferme le jeu avant d'appliquer ou restaurer une ROM.</span></div></div>}
            <div className="card current-surf"><span>Surf actif</span><strong>{activePatch}</strong><small>{state?.surf_state.rom_sha256 ? `SHA-256 : ${state.surf_state.rom_sha256.slice(0, 20)}…` : "Hash non disponible"}</small></div>
            <div className="patch-grid">
              {patches.length === 0 ? <div className="empty-state"><ShipWheel size={32} /><h3>Patches intégrés introuvables</h3><p>Réinstalle Alya Companion : le catalogue Surf fait désormais partie de l'application.</p></div> : patches.map((patch) => (
                <article className={`patch-card ${state?.surf_state.active_patch_id === patch.id ? "selected" : ""}`} key={patch.id}>
                  <div className={`patch-art ${SURF_PREVIEWS[patch.id]?.photo ? "patch-art-photo" : ""}`}>
                    {SURF_PREVIEWS[patch.id] ? (
                      <img className="patch-preview" src={SURF_PREVIEWS[patch.id].src} alt={`Preview ${patch.name}`} />
                    ) : (
                      <ShipWheel size={36} />
                    )}
                  </div>
                  <div className="patch-meta"><span>INTÉGRÉ</span>{patch.compatibility && <span>{patch.compatibility}</span>}</div>
                  <h3>{patch.name}</h3><p>{patch.description}</p>
                  <button className="primary" disabled={Boolean(busy) || Boolean(state?.pokemmo_running) || !settings.rom_path} onClick={() => run(`patch-${patch.id}`, async () => {
                    await persistSettings(settings);
                    await api.applySurfPatch(patch.id);
                  }, `${patch.name} appliqué.`)}>{busy === `patch-${patch.id}` ? "Application…" : state?.surf_state.active_patch_id === patch.id ? "Réappliquer" : "Appliquer"}</button>
                </article>
              ))}
            </div>
            {!settings.rom_path && <div className="surf-requirements"><strong>Configuration requise</strong><span>Sélectionne ta ROM Pokémon Blanche FR dans Settings.</span><button className="text-button" onClick={() => setTab("settings")}>Ouvrir Settings →</button></div>}
            <div className="surf-note"><CircleAlert size={17}/><span>Ces patches ont été créés pour <strong>Pokémon Blanche FR</strong>. Le hash exact de la ROM source n'est pas encore verrouillé : utilise la même ROM propre qui a servi à créer les patches.</span></div>
            <div className="action-row"><button className="danger-ghost" disabled={Boolean(busy) || Boolean(state?.pokemmo_running)} onClick={() => run("rom-restore", async () => {
              await persistSettings(settings);
              await api.restoreOriginalRom();
            }, "ROM originale restaurée.")}><RotateCcw size={17} /> Restaurer la ROM originale</button></div>
          </section>
        )}

        {tab === "vanity" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Cosmetics" title="Vanity Preview" description="Le Vanity Booth est chargé directement dans Alya Companion." source="Crimson Core MMO — Vanity Booth" onReload={() => run("vanity-reload", () => api.reloadEmbeddedWebview("vanity"), undefined, false)} />}
        {tab === "shinyboard" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Shiny hunting" title="Shinyboard" description="Dashboard Shinyboard intégré directement à Alya Companion." source="shinyboard.net/dashboard" onReload={() => run("shinyboard-reload", () => api.reloadEmbeddedWebview("shinyboard"), undefined, false)} />}
        {tab === "forum" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Community" title="Forum PokeMMO" description="Le forum officiel PokeMMO intégré dans Alya Companion." source="forums.pokemmo.com" onReload={() => run("forum-reload", () => api.reloadEmbeddedWebview("forum"), undefined, false)} />}
        {tab === "rotations" && <RotationsPage />}

        {tab === "settings" && (
          <section>
            <header className="page-header"><div><p className="eyebrow">Configuration</p><h1>Settings</h1><p>Configure les chemins locaux et les services utilisés par Alya Companion.</p></div></header>
            <div className="settings-card">
              <h2>PokeMMO & ROM</h2>
              <PathField label="Dossier PokeMMO" value={settings.pokemmo_dir} placeholder="C:\\Games\\PokeMMO" onChange={(v) => setSettings((s) => ({ ...s, pokemmo_dir: v }))} onBrowse={() => void pickDirectory("pokemmo_dir")} />
              <PathField label="ROM Pokémon Blanc/Noir" value={settings.rom_path} placeholder="C:\\...\\Pokemon White.nds" onChange={(v) => setSettings((s) => ({ ...s, rom_path: v }))} onBrowse={() => void pickFile("rom_path")} />
              <p className="settings-note">Les patches Surf et xdelta3 sont intégrés à Alya Companion : l'utilisateur n'a aucune dépendance externe à installer.</p>
            </div>
            <div className="settings-card">
              <h2>AlyArchetype</h2>
              <div className="fixed-config">
                <div><span>GitHub</span><strong>Jimbowiii/AlyArchetype</strong></div>
                <div><span>Asset de release</span><strong>AlyArchetype.zip</strong></div>
                <div><span>Installation</span><strong>data/mods/AlyArchetype.zip</strong></div>
                <div><span>Backup</span><strong>data/mods/AlyArchetype.backup.zip</strong></div>
              </div>
            </div>
            <div className="settings-card companion-update-card">
              <div className="settings-card-head">
                <div><h2>Alya Companion</h2><p className="settings-note">Les prochaines versions peuvent être installées depuis l'application, sans sources, npm ni PowerShell.</p></div>
                <button className="ghost" disabled={Boolean(busy)} onClick={() => run("companion-check", refreshCompanionUpdate, "Vérification terminée.", false)}><RefreshCw size={17}/> Vérifier</button>
              </div>
              <div className="fixed-config">
                <div><span>Version installée</span><strong>{companionUpdate?.current_version ?? "1.0.0-rc.4"}{companionUpdate?.development_build ? " (DEV)" : ""}</strong></div>
                <div><span>Dernière release</span><strong>{companionUpdate?.latest_version ?? "Non vérifiée"}</strong></div>
                <div><span>Dépôt de mise à jour</span><strong>{companionUpdate?.repository ?? "Jimbowiii/Alya-Companion"}</strong></div>
                <div><span>Sécurité update</span><strong>{companionUpdate?.update_available ? "Signature Tauri requise" : "Vérification cryptographique"}</strong></div>
              </div>
              {companionUpdate?.changelog && <pre className="companion-changelog">{companionUpdate.changelog}</pre>}
              {companionUpdate?.update_available ? (
                <button
                  className="primary"
                  disabled={Boolean(busy)}
                  onClick={() => void performCompanionUpdate()}
                >
                  <CloudDownload size={17}/>
                  {busy === "companion-update"
                    ? updateProgress !== null
                      ? `Téléchargement ${updateProgress}%`
                      : "Téléchargement…"
                    : `Installer ${companionUpdate.latest_version}`}
                </button>
              ) : companionUpdate?.latest_version ? <StatusPill ok={true}>Alya Companion est à jour</StatusPill> : null}
            </div>
            <div className="settings-card"><h2>Vanity</h2><TextField label="URL du booth" value={settings.vanity_url} onChange={(v) => setSettings((s) => ({ ...s, vanity_url: v }))} /></div>
            <div className="action-row"><button className="primary" disabled={Boolean(busy)} onClick={() => void saveSettings()}><Save size={17} /> {busy === "settings" ? "Enregistrement…" : "Enregistrer"}</button></div>
          </section>
        )}
      </main>

      {customizeOpen && (
        <div className="customizer-panel" role="dialog" aria-label="Personnaliser Alya Companion">
          <div className="customizer-head"><div><span className="eyebrow">Interface</span><h2>Personnaliser</h2></div><button className="icon-button" onClick={() => setCustomizeOpen(false)} title="Fermer"><X size={17}/></button></div>
          <div className="customizer-section">
            <h3>Onglets du volet</h3>
            <div className="tab-order-list">
              {tabOrder.map((id) => {
                const item = NAV_ITEMS.find(([itemId]) => itemId === id);
                if (!item) return null;
                const [, label, Icon] = item;
                const locked = id === "dashboard";
                return (
                  <div
                    className={`tab-order-row ${draggedTab === id ? "dragging" : ""}`}
                    key={id}
                    data-tab-id={id}
                  >
                    <span
                      className="drag-handle"
                      role="button"
                      tabIndex={0}
                      title={`Maintiens et déplace ${label}`}
                      aria-label={`Déplacer ${label}`}
                      onPointerDown={(event) => beginTabPointerDrag(event, id)}
                      onPointerMove={continueTabPointerDrag}
                      onPointerUp={endTabPointerDrag}
                      onPointerCancel={endTabPointerDrag}
                    >
                      <GripVertical size={16} aria-hidden="true" />
                    </span>
                    <Icon size={15} />
                    <span className="tab-order-label">{label}</span>
                    <div className="tab-order-actions" aria-label={`Position de ${label}`}>
                      <button
                        type="button"
                        disabled={tabOrder.indexOf(id) === 0}
                        onClick={() => void moveTabByOffset(id, -1)}
                        title={`Monter ${label}`}
                        aria-label={`Monter ${label}`}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={tabOrder.indexOf(id) === tabOrder.length - 1}
                        onClick={() => void moveTabByOffset(id, 1)}
                        title={`Descendre ${label}`}
                        aria-label={`Descendre ${label}`}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    {locked ? <small>Toujours affiché</small> : <input type="checkbox" checked={!hiddenTabs.includes(id)} onChange={() => void toggleTabVisibility(id)} aria-label={`Afficher ${label}`} />}
                  </div>
                );
              })}
            </div>
            <p className="customizer-hint">Maintiens la poignée ⋮⋮ et déplace la souris. Les flèches permettent aussi de monter ou descendre un onglet.</p>
          </div>
          <div className="customizer-section">
            <h3>Couleur d'accentuation</h3>
            <div className="accent-picker-row">
              <input className="accent-picker" type="color" value={settings.accent_color || "#9b7bdf"} onChange={(e) => setSettings((s) => ({ ...s, accent_color: e.target.value }))} onBlur={(e) => void applyAccentColor(e.currentTarget.value)} aria-label="Couleur d'accentuation" />
              <code>{settings.accent_color || "#9b7bdf"}</code>
            </div>
            <div className="accent-presets">
              {["#9b7bdf", "#00a7ff", "#ff3b5c", "#ff8a32", "#1fcf9a", "#e7c84b"].map((color) => <button key={color} className="accent-dot" style={{ background: color }} onClick={() => void applyAccentColor(color)} aria-label={`Accent ${color}`} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExternalWebviewPage({ hostRef, eyebrow, title, description, source, onReload }: { hostRef: React.RefObject<HTMLDivElement | null>; eyebrow: string; title: string; description: string; source: string; onReload: () => void }) {
  return <section className="embedded-page">
    <header className="page-header embedded-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      <button className="ghost" onClick={onReload}><RefreshCw size={17}/> Recharger</button>
    </header>
    <div ref={hostRef} className="embedded-webview-host" aria-label={`${title} intégré`}>
      <div className="embedded-loading"><RefreshCw size={22}/><span>Chargement de {title}…</span></div>
    </div>
    <div className="embedded-source">Source : <strong>{source}</strong> · le contenu reste chargé depuis le site d'origine.</div>
  </section>;
}

function RotationsPage() {
  const [now, setNow] = useState(Date.now());
  const [shinyMode, setShinyMode] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = new Date(now);
  const index = date.getUTCMonth() % ROTATION_CYCLE.length;
  const current = ROTATION_CYCLE[index];
  const next = ROTATION_CYCLE[(index + 1) % ROTATION_CYCLE.length];
  const after = ROTATION_CYCLE[(index + 2) % ROTATION_CYCLE.length];
  const nextReset = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0);
  const remaining = Math.max(0, nextReset - now);

  const monthLabel = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const resetDate = new Date(nextReset);
  const localReset = resetDate.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });

  return <section className="rotations-page">
    <header className="page-header rotations-header">
      <div><p className="eyebrow">Roaming Legendaries</p><h1>Rotations</h1><p>Cycle mensuel fixe des oiseaux de Kanto et des fauves de Johto.</p></div>
      <button
        type="button"
        className={`shiny-toggle ${shinyMode ? "active" : ""}`}
        onClick={() => setShinyMode((value) => !value)}
        aria-pressed={shinyMode}
        aria-label={shinyMode ? "Afficher les sprites normaux" : "Afficher les sprites shiny"}
        title={shinyMode ? "Revenir aux sprites normaux" : "Afficher les sprites shiny"}
      >
        <Sparkles size={18} />
      </button>
    </header>
    <div className="rotation-title-row"><div><span>Rotation actuelle</span><strong>{capitalize(monthLabel)}</strong></div><span className="utc-badge">Reset 00:00 UTC</span></div>
    <div className="legend-grid">
      <LegendCard legendary={current.bird} active shiny={shinyMode} />
      <LegendCard legendary={current.beast} active shiny={shinyMode} />
    </div>

    <div className="reset-timer-card">
      <div><span>Prochain reset</span><strong>{formatCountdown(remaining)}</strong></div>
      <small>{localReset} en heure locale · 00:00 UTC</small>
    </div>

    <div className="rotation-subtitle"><span>Prochaine rotation</span></div>
    <div className="legend-grid next">
      <LegendCard legendary={next.bird} shiny={shinyMode} />
      <LegendCard legendary={next.beast} shiny={shinyMode} />
    </div>

    <div className="cached-rotation">
      <span>Rotation suivante en cache</span>
      <div><MiniLegend legendary={after.bird} shiny={shinyMode} /><span>+</span><MiniLegend legendary={after.beast} shiny={shinyMode} /></div>
    </div>
    <p className="rotation-note">Le calendrier est calculé localement à partir du cycle fixe : Électhor/Entei → Sulfura/Suicune → Artikodin/Raikou. Aucune requête réseau n'est nécessaire pour connaître les rotations futures.</p>
  </section>;
}

function LegendCard({ legendary, active = false, shiny = false }: { legendary: { name: string; region: string; id: number }; active?: boolean; shiny?: boolean }) {
  return <article className={`legend-card ${active ? "active" : ""} ${shiny ? "shiny" : ""}`}>
    <div className="legend-sprite-wrap"><img className="legend-sprite" src={spriteUrl(legendary.id, shiny)} alt={`Sprite animé ${shiny ? "shiny " : ""}de ${legendary.name}`} /></div>
    <div><span className="region-badge">{legendary.region}</span><h2>{legendary.name}</h2></div>
  </article>;
}

function MiniLegend({ legendary, shiny = false }: { legendary: { name: string; region: string; id: number }; shiny?: boolean }) {
  return <div className={`mini-legend ${shiny ? "shiny" : ""}`}><img src={spriteUrl(legendary.id, shiny)} alt={`Sprite ${shiny ? "shiny " : ""}de ${legendary.name}`} /><div><strong>{legendary.name}</strong><small>{legendary.region}</small></div></div>;
}

function currentRotationLabel() {
  const month = new Date().getUTCMonth();
  const rotation = ROTATION_CYCLE[month % ROTATION_CYCLE.length];
  return `${rotation.beast.name} · ${rotation.bird.name}`;
}

function formatCountdown(milliseconds: number) {
  const total = Math.floor(milliseconds / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days}j ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function capitalize(value: string) {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

function ThemePage({ theme, busy, configured, onRefresh, onUpdate, onRestore }: { theme: ThemeStatus | null | undefined; busy: string | null; configured: boolean; onRefresh: () => void; onUpdate: () => void; onRestore: () => void }) {
  return <section>
    <header className="page-header"><div><p className="eyebrow">GitHub Releases</p><h1>AlyArchetype</h1><p>Même logique que ton updater actuel : version.txt + info.xml, release Jimbowiii/AlyArchetype, asset AlyArchetype.zip et backup unique dans data/mods.</p></div><button className="ghost" disabled={!configured || Boolean(busy)} onClick={onRefresh}><RefreshCw size={17}/> Vérifier</button></header>
    {!configured ? <div className="empty-state"><CloudDownload size={32}/><h3>Configuration requise</h3><p>Renseigne uniquement le dossier principal de PokeMMO dans Settings.</p></div> : <>
      <div className="version-row">
        <div className="version-card"><span>Installée</span><strong>{theme?.local_version ?? "Inconnue"}</strong></div>
        <div className="version-arrow">→</div>
        <div className="version-card accent"><span>Dernière release</span><strong>{theme?.latest_version ?? "—"}</strong></div>
      </div>
      <div className="card changelog"><div className="card-title"><CloudDownload size={18}/><span>{theme?.release_name ?? "Release notes"}</span></div><pre>{theme?.changelog ?? "Clique sur Vérifier pour charger la dernière release."}</pre>{theme?.published_at && <small>Publiée : {new Date(theme.published_at).toLocaleString("fr-FR")}</small>}</div>
      <div className="action-row"><button className="primary" disabled={!theme?.update_available || Boolean(busy)} onClick={onUpdate}><CloudDownload size={17}/> {busy === "theme-update" ? "Mise à jour…" : "Mettre à jour"}</button><button className="ghost" disabled={Boolean(busy) || !theme?.backup_available} onClick={onRestore}><RotateCcw size={17}/> Restaurer AlyArchetype.backup.zip</button></div>
    </>}
  </section>;
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return <label className="field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

function PathField({ label, value, placeholder, onChange, onBrowse }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void; onBrowse: () => void }) {
  return <label className="field"><span>{label}</span><div className="path-row"><input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /><button type="button" className="icon-button" onClick={onBrowse} title="Parcourir"><FolderOpen size={18}/></button></div></label>;
}

export default App;
