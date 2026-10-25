import { useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  CheckCircle2,
  CircleAlert,
  CloudDownload,
  FolderOpen,
  Gauge,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShipWheel,
  Sparkles,
  XCircle,
} from "lucide-react";
import { api } from "./bridge";
import type { AppState, CompanionUpdateStatus, Settings, SurfPatch, ThemeStatus } from "./types";
import alyaIcon from "./assets/alya-icon.png";
import dashboardBackground from "./assets/dashboard-background.webm";

type Tab = "dashboard" | "theme" | "surf" | "vanity" | "settings";

const EMPTY_SETTINGS: Settings = {
  pokemmo_dir: "",
  rom_path: "",
  vanity_url: "https://www.crimsoncoremmo.co.uk/vanity-booth",
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
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const vanityHostRef = useRef<HTMLDivElement | null>(null);

  const notify = (kind: "ok" | "error", text: string) => setMessage({ kind, text });

  const load = async () => {
    try {
      const next = await api.getState();
      // get_state() est volontairement local et ne refait pas un appel GitHub.
      // Si une vérification de release a déjà été faite, on conserve ces
      // métadonnées distantes lors des refresh locaux (dashboard, patch, settings…).
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
            update_available:
              local.local_version !== remote.latest_version && remote.update_available,
          },
        };
      });
      setSettings(next.settings);
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
    void api.checkCompanionUpdate().then(setCompanionUpdate).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tab !== "vanity") {
      void api.hideVanity().catch(() => undefined);
      return;
    }

    let frame = 0;
    let disposed = false;
    const host = vanityHostRef.current;
    if (!host || !settings.vanity_url) return;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed || !vanityHostRef.current) return;
        const rect = vanityHostRef.current.getBoundingClientRect();
        if (rect.width < 160 || rect.height < 160) return;
        void api.showVanity({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        }).catch((error) => notify("error", `Vanity : ${String(error)}`));
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
      void api.hideVanity().catch(() => undefined);
    };
  }, [tab, settings.vanity_url]);

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
    setSettings(next.settings);
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
    const update = await api.checkCompanionUpdate();
    setCompanionUpdate(update);
    return update;
  };

  const theme = state?.theme_status;
  const activePatch = state?.surf_state.active_patch_name ?? "ROM d'origine / inconnu";

  const nav = useMemo(() => [
    ["dashboard", "Dashboard", Gauge],
    ["theme", "AlyArchetype", Sparkles],
    ["surf", "Surf Manager", ShipWheel],
    ["vanity", "Vanity", ImageIcon],
    ["settings", "Settings", SettingsIcon],
  ] as const, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src={alyaIcon} alt="" />
          <div className="brand-copy">
            <strong>Alya Companion</strong>
          </div>
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "nav-active" : ""} onClick={() => setTab(id)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <StatusPill ok={Boolean(state?.pokemmo_detected)}>
            {state?.pokemmo_detected ? "PokeMMO détecté" : "PokeMMO non configuré"}
          </StatusPill>
          {state?.pokemmo_running && <span className="running-warning">PokeMMO est ouvert — modifications bloquées</span>}
          <span className="app-version">Alya Companion {companionUpdate?.current_version ?? "1.0.0-rc.2"}{companionUpdate?.development_build ? " DEV" : ""}</span>
        </div>
      </aside>

      <main className={`content ${tab === "dashboard" ? "dashboard-content" : ""}`}>
        {tab === "dashboard" && (
          <video className="dashboard-media" src={dashboardBackground} autoPlay loop muted playsInline aria-hidden="true" />
        )}
        {message && (
          <div className={`toast ${message.kind}`}>
            {message.kind === "ok" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        {tab === "dashboard" && (
          <section>
            <header className="page-header">
              <div><p className="eyebrow">Overview</p><h1>Dashboard</h1></div>
              <button className="ghost" disabled={Boolean(busy)} onClick={() => void load()}><RefreshCw size={17} /> Actualiser</button>
            </header>
            {companionUpdate?.update_available && (
              <div className="update-banner">
                <div><CloudDownload size={19}/><span><strong>Alya Companion {companionUpdate.latest_version}</strong> est disponible.</span></div>
                <button className="primary compact" disabled={Boolean(busy) || !companionUpdate.installer_available || !companionUpdate.checksum_available} onClick={() => run("companion-update", api.installCompanionUpdate, undefined, false)}>
                  <CloudDownload size={16}/> {busy === "companion-update" ? "Téléchargement…" : "Mettre à jour"}
                </button>
              </div>
            )}
            <div className="hero-card">
              <div><span className="kicker">Alya Companion</span><h2>Un seul endroit pour tes outils PokeMMO.</h2><p>Gestion du thème AlyArchetype, patches Surf et prévisualisation vanity, sans piloter le client de jeu.</p></div>
              <div className="hero-orb"><img src={alyaIcon} alt="" /></div>
            </div>
            <div className="grid three">
              <article className="card">
                <div className="card-title"><Sparkles size={18} /><span>AlyArchetype</span></div>
                <strong className="big-value">{theme?.local_version ?? "Non détecté"}</strong>
                <p>{theme?.latest_version ? `Dernière release : ${theme.latest_version}` : "Source : Jimbowiii/AlyArchetype · AlyArchetype.zip"}</p>
                {theme && <StatusPill ok={!theme.update_available}>{theme.update_available ? "Mise à jour disponible" : "À jour"}</StatusPill>}
              </article>
              <article className="card">
                <div className="card-title"><ShipWheel size={18} /><span>Surf</span></div>
                <strong className="big-value">{activePatch}</strong>
                <p>{settings.rom_path || "Aucune ROM configurée."}</p>
                <button className="text-button" onClick={() => setTab("surf")}>Gérer les patches →</button>
              </article>
              <article className="card">
                <div className="card-title"><ImageIcon size={18} /><span>Vanity</span></div>
                <strong className="big-value">Preview</strong>
                <p>Le Vanity Booth s'affiche directement dans le panneau Alya Companion.</p>
                <button className="text-button" onClick={() => setTab("vanity")}>Ouvrir le module →</button>
              </article>
            </div>
          </section>
        )}

        {tab === "theme" && (
          <ThemePage
            theme={theme}
            busy={busy}
            onRefresh={() => run("theme-refresh", async () => {
              const t = await api.refreshTheme();
              setState((s) => s ? { ...s, theme_status: t } : s);
            }, undefined, false)}
            onUpdate={() => run("theme-update", async () => {
              await api.updateTheme();
              const t = await api.refreshTheme();
              setState((s) => s ? { ...s, theme_status: t } : s);
            }, "AlyArchetype a été mis à jour.", false)}
            onRestore={() => run("theme-restore", async () => {
              await api.restoreTheme();
              const t = await api.refreshTheme();
              setState((s) => s ? { ...s, theme_status: t } : s);
            }, "Dernier backup AlyArchetype restauré.", false)}
            configured={Boolean(settings.pokemmo_dir)}
          />
        )}

        {tab === "surf" && (
          <section>
            <header className="page-header"><div><p className="eyebrow">ROM patching</p><h1>Surf Manager</h1><p>Chaque patch repart du backup de la ROM originale afin d'éviter d'empiler les modifications.</p></div></header>
            {state?.pokemmo_running && <div className="warning-box"><XCircle size={19} /><div><strong>PokeMMO est ouvert.</strong><span>Ferme le jeu avant d'appliquer ou restaurer une ROM.</span></div></div>}
            <div className="card current-surf"><span>Surf actif</span><strong>{activePatch}</strong><small>{state?.surf_state.rom_sha256 ? `SHA-256 : ${state.surf_state.rom_sha256.slice(0, 20)}…` : "Hash non disponible"}</small></div>
            <div className="patch-grid">
              {patches.length === 0 ? <div className="empty-state"><ShipWheel size={32} /><h3>Patches intégrés introuvables</h3><p>Réinstalle Alya Companion : le catalogue Surf fait désormais partie de l'application.</p></div> : patches.map((patch) => (
                <article className={`patch-card ${state?.surf_state.active_patch_id === patch.id ? "selected" : ""}`} key={patch.id}>
                  <div className="patch-art"><ShipWheel size={36} /></div>
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

        {tab === "vanity" && (
          <section className="vanity-page">
            <header className="page-header vanity-header">
              <div><p className="eyebrow">Cosmetics</p><h1>Vanity Preview</h1><p>Le Vanity Booth est intégré directement dans Alya Companion. Aucun second onglet ni fenêtre séparée.</p></div>
              <button className="ghost" disabled={!settings.vanity_url || Boolean(busy)} onClick={() => run("vanity-reload", api.reloadVanity, undefined, false)}><RefreshCw size={17}/> Recharger</button>
            </header>
            {!settings.vanity_url ? (
              <div className="empty-state"><ImageIcon size={32}/><h3>URL Vanity non configurée</h3><p>Renseigne l'URL du Vanity Booth dans Settings.</p></div>
            ) : (
              <>
                <div ref={vanityHostRef} className="vanity-embed-host" aria-label="Vanity Booth intégré">
                  <div className="vanity-loading"><RefreshCw size={22}/><span>Chargement du Vanity Booth…</span></div>
                </div>
                <div className="vanity-source">Source : <strong>Crimson Core MMO — Vanity Booth</strong> · le contenu reste chargé depuis le site d'origine.</div>
              </>
            )}
          </section>
        )}

        {tab === "settings" && (
          <section>
            <header className="page-header"><div><p className="eyebrow">Configuration</p><h1>Settings</h1><p>Configure uniquement les chemins locaux. AlyArchetype utilise directement ton dépôt et ton format de release existants.</p></div></header>
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
              <p className="settings-note">Si ton ancien AlyArchetype Updater est déjà installé, Alya Companion récupère automatiquement le chemin enregistré dans %APPDATA%\AlyArchetypeUpdater\pokemmo-path.txt au premier lancement.</p>
            </div>
            <div className="settings-card companion-update-card">
              <div className="settings-card-head">
                <div><h2>Alya Companion</h2><p className="settings-note">Les prochaines versions peuvent être installées depuis l'application, sans sources, npm ni PowerShell.</p></div>
                <button className="ghost" disabled={Boolean(busy)} onClick={() => run("companion-check", refreshCompanionUpdate, "Vérification terminée.", false)}><RefreshCw size={17}/> Vérifier</button>
              </div>
              <div className="fixed-config">
                <div><span>Version installée</span><strong>{companionUpdate?.current_version ?? "1.0.0-rc.2"}{companionUpdate?.development_build ? " (DEV)" : ""}</strong></div>
                <div><span>Dernière release</span><strong>{companionUpdate?.latest_version ?? "Non vérifiée"}</strong></div>
                <div><span>Dépôt de mise à jour</span><strong>{companionUpdate?.repository ?? "Jimbowiii/Alya-Companion"}</strong></div>
                <div><span>Intégrité</span><strong>{companionUpdate?.checksum_available ? "SHA-256 disponible" : "En attente de release"}</strong></div>
              </div>
              {companionUpdate?.changelog && <pre className="companion-changelog">{companionUpdate.changelog}</pre>}
              {companionUpdate?.update_available ? (
                <button className="primary" disabled={Boolean(busy) || !companionUpdate.installer_available || !companionUpdate.checksum_available} onClick={() => run("companion-update", api.installCompanionUpdate, undefined, false)}><CloudDownload size={17}/> {busy === "companion-update" ? "Téléchargement…" : `Installer ${companionUpdate.latest_version}`}</button>
              ) : companionUpdate?.latest_version ? <StatusPill ok={true}>Alya Companion est à jour</StatusPill> : null}
            </div>
            <div className="settings-card"><h2>Vanity</h2><TextField label="URL du booth" value={settings.vanity_url} onChange={(v) => setSettings((s) => ({ ...s, vanity_url: v }))} /></div>
            <div className="action-row"><button className="primary" disabled={Boolean(busy)} onClick={() => void saveSettings()}><Save size={17} /> {busy === "settings" ? "Enregistrement…" : "Enregistrer"}</button></div>
          </section>
        )}
      </main>
    </div>
  );
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
