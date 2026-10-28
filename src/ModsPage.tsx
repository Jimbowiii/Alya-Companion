import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  CheckCircle2,
  CloudDownload,
  Download,
  FolderOpen,
  HardDriveDownload,
  Import,
  LoaderCircle,
  Music2,
  PackageCheck,
  PackageOpen,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ALYA_MODS } from "./modsData";
import type { AlyaMod, ModCategory, RemoteModFile } from "./modsData";
import "./mods.css";

type Props = {
  pokemmoDir: string;
  pokemmoRunning: boolean;
  onEditBackground: () => void;
};

type ModDownloadProgress = {
  modId: string;
  fileName: string;
  fileIndex: number;
  fileCount: number;
  downloaded: number;
  total: number | null;
  percent: number | null;
  stage: "resolving" | "downloading" | "done";
};

type Notice = { tone: "success" | "error" | "info"; text: string } | null;

const CATEGORY_ORDER: readonly ("Tous" | ModCategory)[] = ["Tous", "ALYA", "Graphismes", "Audio", "Followers"];

function filesFor(mod: AlyaMod): string[] {
  if (mod.source.kind === "bundled") return [mod.source.targetFile];
  return mod.source.files.map((file) => file.fileName);
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 100 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function sourceLabel(mod: AlyaMod): string {
  return mod.source.kind === "bundled" ? "Inclus avec ALYA" : mod.source.host;
}

function categoryIcon(category: ModCategory) {
  if (category === "Audio") return Music2;
  if (category === "Followers") return Sparkles;
  if (category === "ALYA") return PackageCheck;
  return PackageOpen;
}

export function ModsPage({ pokemmoDir, pokemmoRunning, onEditBackground }: Props) {
  const [installedFiles, setInstalledFiles] = useState<string[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORY_ORDER)[number]>("Tous");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, ModDownloadProgress>>({});
  const [notice, setNotice] = useState<Notice>(null);

  const installedSet = useMemo(
    () => new Set(installedFiles.map((file) => file.toLocaleLowerCase("fr"))),
    [installedFiles],
  );

  const refreshInstalled = useCallback(async () => {
    if (!pokemmoDir.trim()) {
      setInstalledFiles([]);
      return;
    }
    try {
      const files = await invoke<string[]>("mods_list_installed");
      setInstalledFiles(files);
    } catch (error) {
      setNotice({ tone: "error", text: String(error) });
    }
  }, [pokemmoDir]);

  useEffect(() => {
    void refreshInstalled();
  }, [refreshInstalled]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<ModDownloadProgress>("alya-mod-download-progress", (event) => {
      const payload = event.payload;
      setProgress((current) => ({ ...current, [payload.modId]: payload }));
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  const visibleMods = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return ALYA_MODS.filter((mod) => {
      const categoryMatch = category === "Tous" || mod.category === category || (category === "ALYA" && mod.source.kind === "bundled");
      if (!categoryMatch) return false;
      if (!normalized) return true;
      return `${mod.name} ${mod.description} ${mod.category}`.toLocaleLowerCase("fr").includes(normalized);
    });
  }, [category, query]);

  const isInstalled = (mod: AlyaMod) => filesFor(mod).every((file) => installedSet.has(file.toLocaleLowerCase("fr")));
  const hasPartialInstall = (mod: AlyaMod) => {
    const targets = filesFor(mod);
    const count = targets.filter((file) => installedSet.has(file.toLocaleLowerCase("fr"))).length;
    return count > 0 && count < targets.length;
  };

  const requireReady = () => {
    if (!pokemmoDir.trim()) {
      setNotice({ tone: "error", text: "Configure d’abord le dossier PokeMMO dans Settings." });
      return false;
    }
    if (pokemmoRunning) {
      setNotice({ tone: "error", text: "Ferme PokeMMO avant d’installer, mettre à jour ou supprimer un mod." });
      return false;
    }
    return true;
  };

  const installMod = async (mod: AlyaMod) => {
    if (!requireReady()) return;
    setBusyId(mod.id);
    setNotice(null);
    try {
      if (mod.source.kind === "bundled") {
        await invoke("mods_install_bundled", {
          resourceFile: mod.source.resourceFile,
          targetFile: mod.source.targetFile,
          sha256: mod.source.sha256,
        });
      } else {
        await invoke("mods_download_pack", {
          modId: mod.id,
          files: mod.source.files satisfies RemoteModFile[],
        });
      }
      await refreshInstalled();
      setNotice({ tone: "success", text: `${mod.shortName} est installé dans data\\mods.` });
    } catch (error) {
      setNotice({ tone: "error", text: String(error) });
    } finally {
      setBusyId(null);
    }
  };

  const removeMod = async (mod: AlyaMod) => {
    if (!requireReady()) return;
    setBusyId(mod.id);
    setNotice(null);
    try {
      await invoke("mods_remove_files", { fileNames: filesFor(mod) });
      await refreshInstalled();
      setNotice({ tone: "success", text: `${mod.shortName} a été retiré du dossier mods.` });
    } catch (error) {
      setNotice({ tone: "error", text: String(error) });
    } finally {
      setBusyId(null);
    }
  };

  const importLocal = async () => {
    if (!requireReady()) return;
    const picked = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Mods PokeMMO", extensions: ["mod", "zip"] }],
    });
    if (!picked || Array.isArray(picked)) return;
    setBusyId("local-import");
    try {
      const installedName = await invoke<string>("mods_install_local_file", { sourcePath: picked });
      await refreshInstalled();
      setNotice({ tone: "success", text: `${installedName} a été importé dans data\\mods.` });
    } catch (error) {
      setNotice({ tone: "error", text: String(error) });
    } finally {
      setBusyId(null);
    }
  };

  const openFolder = async () => {
    if (!pokemmoDir.trim()) {
      setNotice({ tone: "error", text: "Configure d’abord le dossier PokeMMO dans Settings." });
      return;
    }
    try {
      await invoke("mods_open_folder");
    } catch (error) {
      setNotice({ tone: "error", text: String(error) });
    }
  };

  const installedCatalogCount = ALYA_MODS.filter(isInstalled).length;

  return (
    <section className="mods-page">
      <header className="page-header mods-page-header">
        <div>
          <p className="eyebrow">BIBLIOTHÈQUE POKEMMO</p>
          <h1>Mods</h1>
          <p>Télécharge, installe et gère tes mods directement dans le dossier PokeMMO.</p>
        </div>
        <div className="page-header-actions mods-header-actions">
          <button className="secondary" type="button" onClick={() => void refreshInstalled()}>
            <RefreshCw size={17} /> Actualiser
          </button>
          <button className="secondary" type="button" onClick={() => void openFolder()}>
            <FolderOpen size={17} /> Dossier Mods
          </button>
          <button className="secondary" type="button" disabled={Boolean(busyId) || pokemmoRunning} onClick={() => void importLocal()}>
            <Import size={17} /> Importer
          </button>
          <button className="secondary icon-only" type="button" onClick={onEditBackground} title="Changer le fond">
            <Pencil size={17} />
          </button>
        </div>
      </header>

      {pokemmoRunning && (
        <div className="mods-warning">
          <TriangleAlert size={19} />
          <div><strong>PokeMMO est ouvert.</strong><span>Les installations et suppressions sont verrouillées jusqu’à la fermeture du jeu.</span></div>
        </div>
      )}

      {!pokemmoDir.trim() && (
        <div className="mods-warning">
          <TriangleAlert size={19} />
          <div><strong>Dossier PokeMMO non configuré.</strong><span>Renseigne-le dans Settings avant d’utiliser la bibliothèque.</span></div>
        </div>
      )}

      {notice && (
        <div className={`mods-notice ${notice.tone}`}>
          {notice.tone === "success" ? <CheckCircle2 size={18} /> : notice.tone === "error" ? <TriangleAlert size={18} /> : <CloudDownload size={18} />}
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <div className="mods-stats-row">
        <div className="mods-stat"><PackageCheck size={20} /><div><span>Catalogue</span><strong>{ALYA_MODS.length} mods</strong></div></div>
        <div className="mods-stat"><HardDriveDownload size={20} /><div><span>Installés</span><strong>{installedCatalogCount}/{ALYA_MODS.length}</strong></div></div>
        <div className="mods-stat"><FolderOpen size={20} /><div><span>Dossier cible</span><strong>{pokemmoDir.trim() ? "data\\mods" : "À configurer"}</strong></div></div>
      </div>

      <div className="mods-toolbar">
        <div className="mods-category-tabs">
          {CATEGORY_ORDER.map((item) => (
            <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un mod…" aria-label="Rechercher un mod" />
      </div>

      <div className="mods-grid">
        {visibleMods.map((mod) => {
          const installed = isInstalled(mod);
          const partial = hasPartialInstall(mod);
          const currentProgress = progress[mod.id];
          const isBusy = busyId === mod.id;
          const CategoryIcon = categoryIcon(mod.source.kind === "bundled" ? "ALYA" : mod.category);
          const fileCount = filesFor(mod).length;
          const progressPercent = currentProgress?.percent ?? null;
          return (
            <article key={mod.id} className={`mod-card ${installed ? "installed" : ""} ${mod.featured ? "featured" : ""}`}>
              <div className="mod-card-top">
                <div className="mod-icon"><CategoryIcon size={24} /></div>
                <div className="mod-source-block">
                  <span className={`mod-source ${mod.source.kind === "bundled" ? "alya" : "remote"}`}>{sourceLabel(mod)}</span>
                  {mod.sizeLabel && <span className="mod-size">{mod.sizeLabel}</span>}
                </div>
              </div>

              <div className="mod-title-row">
                <div><h3>{mod.name}</h3><p>{mod.description}</p></div>
                <span className={`mod-status ${installed ? "ok" : partial ? "partial" : "off"}`}>
                  {installed ? "Installé" : partial ? "Partiel" : "Non installé"}
                </span>
              </div>

              <div className="mod-meta-row">
                <span>{mod.category}</span>
                <span>{fileCount} fichier{fileCount > 1 ? "s" : ""}</span>
                {mod.source.kind === "bundled" && <span>SHA-256 vérifié</span>}
              </div>

              {mod.note && <div className="mod-note">{mod.note}</div>}

              {isBusy && currentProgress && (
                <div className="mod-progress-wrap">
                  <div className="mod-progress-head">
                    <span>{currentProgress.stage === "resolving" ? "Préparation du lien…" : `Fichier ${currentProgress.fileIndex}/${currentProgress.fileCount}`}</span>
                    <strong>{progressPercent !== null ? `${Math.round(progressPercent)}%` : formatBytes(currentProgress.downloaded)}</strong>
                  </div>
                  <div className="mod-progress-track"><span style={{ width: `${Math.max(2, progressPercent ?? 5)}%` }} /></div>
                  <small>{currentProgress.fileName}{currentProgress.total ? ` · ${formatBytes(currentProgress.downloaded)} / ${formatBytes(currentProgress.total)}` : ""}</small>
                </div>
              )}

              <div className="mod-actions">
                <button
                  className="primary"
                  type="button"
                  disabled={Boolean(busyId) || pokemmoRunning || !pokemmoDir.trim()}
                  onClick={() => void installMod(mod)}
                >
                  {isBusy ? <LoaderCircle className="spin" size={17} /> : mod.source.kind === "bundled" ? <PackageOpen size={17} /> : <Download size={17} />}
                  {isBusy ? "Installation…" : installed ? "Réinstaller" : mod.source.kind === "bundled" ? "Installer" : fileCount > 1 ? `Télécharger ${fileCount} fichiers` : "Télécharger"}
                </button>
                {(installed || partial) && (
                  <button className="danger-ghost" type="button" disabled={Boolean(busyId) || pokemmoRunning} onClick={() => void removeMod(mod)}>
                    <Trash2 size={17} /> Supprimer
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {visibleMods.length === 0 && (
        <div className="mods-empty"><PackageOpen size={30} /><strong>Aucun mod trouvé</strong><span>Change le filtre ou la recherche.</span></div>
      )}
    </section>
  );
}
