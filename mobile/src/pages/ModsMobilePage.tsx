import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Download, FolderOpen, Import, Package, RefreshCw, Trash2 } from "lucide-react";
import { MOBILE_MODS, type MobileModEntry, type MobileModPart } from "../mobileModsCatalog";

const STORAGE_KEY = "alya-mobile-mod-folder-uri-v1";

type FolderResult = { uri: string };
type InstallResult = { fileName: string; bytes: number };

async function pickTargetFolder() {
  return invoke<FolderResult>("mobile_pick_mod_folder");
}
async function listTargetFolder(treeUri: string) {
  return invoke<string[]>("mobile_list_mod_folder", { treeUri });
}
async function installRemote(treeUri: string, part: MobileModPart) {
  if (!part.url) throw new Error("URL absente.");
  return invoke<InstallResult>("mobile_download_mod_to_folder", { treeUri, url: part.url, fallbackFileName: part.fallbackName });
}
async function installAsset(treeUri: string, part: MobileModPart) {
  if (!part.assetName) throw new Error("Asset absent.");
  return invoke<InstallResult>("mobile_install_packaged_mod", { treeUri, assetName: part.assetName, fileName: part.fallbackName });
}

export function ModsMobilePage() {
  const [folderUri, setFolderUri] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async (uri = folderUri) => {
    if (!uri) { setFiles([]); return; }
    try { setFiles(await listTargetFolder(uri)); } catch { setFiles([]); }
  };
  useEffect(() => { void refresh(); }, [folderUri]);

  const chooseFolder = async () => {
    setMessage(null);
    try {
      const result = await pickTargetFolder();
      if (!result?.uri) return;
      localStorage.setItem(STORAGE_KEY, result.uri);
      setFolderUri(result.uri);
      await refresh(result.uri);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  };

  const installPart = async (entry: MobileModEntry, part: MobileModPart) => {
    if (!folderUri) { setMessage("Choisis d'abord ton dossier Mods."); return; }
    if (entry.manualOnly && part.url) { await openUrl(part.url); setMessage("Télécharge le fichier puis utilise Importer."); return; }
    const key = `${entry.id}:${part.label}`;
    setBusy(key); setMessage(null);
    try {
      const result = part.assetName ? await installAsset(folderUri, part) : await installRemote(folderUri, part);
      setMessage(`${result.fileName} installé (${Math.max(1, Math.round(result.bytes / 1024))} Ko).`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(null); }
  };

  const importFile = async () => {
    if (!folderUri) { setMessage("Choisis d'abord ton dossier Mods."); return; }
    const selected = await open({ multiple: false, directory: false, filters: [{ name: "Mods PokeMMO", extensions: ["mod", "zip"] }] });
    if (!selected || Array.isArray(selected)) return;
    const fallback = decodeURIComponent(selected.split("/").pop() ?? "mod-import.mod").replace(/[^a-zA-Z0-9._() +%-]/g, "_");
    setBusy("import"); setMessage(null);
    try {
      const result = await invoke<InstallResult>("mobile_copy_mod_to_folder", { treeUri: folderUri, sourceUri: selected, fallbackFileName: fallback });
      setMessage(`${result.fileName} importé.`); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(null); }
  };

  const isInstalled = (part: MobileModPart) => files.some((name) => name.toLowerCase() === part.fallbackName.toLowerCase());

  return <section className="mobile-page mods-mobile-page">
    <header className="mobile-page-header"><div><span>UTILITIES</span><h1>Mods</h1><p>Installe les mods directement dans le dossier que tu as choisi.</p></div><Package size={26}/></header>

    <article className={`mobile-mod-folder ${folderUri ? "ready" : ""}`}>
      <div><FolderOpen size={20}/><div><strong>{folderUri ? "Dossier Mods autorisé" : "Choisis ton dossier Mods"}</strong><span>{folderUri ? "Accès Android persistant" : "ALYA demandera l'autorisation lecture/écriture."}</span></div></div>
      <button onClick={() => void chooseFolder()}>{folderUri ? "Changer" : "Choisir"}</button>
    </article>

    <div className="mobile-mod-actions"><button onClick={() => void importFile()} disabled={!folderUri || busy === "import"}><Import size={16}/> Importer .mod / .zip</button><button onClick={() => void refresh()} disabled={!folderUri}><RefreshCw size={16}/> Actualiser</button></div>
    {message && <div className="mobile-mod-message">{message}</div>}

    <div className="mobile-card-list">
      {MOBILE_MODS.map((entry) => <article className="mobile-card mobile-mod-card" key={entry.id}>
        <div><small>MOD POKEMMO</small><h2>{entry.title}</h2><p>{entry.description}</p>{entry.note && <p className="mobile-note">{entry.note}</p>}</div>
        <div className="mobile-mod-parts">
          {entry.parts.map((part) => {
            const key = `${entry.id}:${part.label}`;
            const installed = isInstalled(part);
            return <button key={part.label} className={installed ? "installed" : ""} disabled={busy === key || (!folderUri && !entry.manualOnly)} onClick={() => void installPart(entry, part)}>
              {installed ? <Check size={15}/> : entry.manualOnly ? <Download size={15}/> : <Download size={15}/>}<span>{installed ? "Installé" : busy === key ? "Installation…" : part.label}</span>
            </button>;
          })}
        </div>
      </article>)}
    </div>
  </section>;
}
