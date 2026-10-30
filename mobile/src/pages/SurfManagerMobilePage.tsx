import { useEffect, useState } from "react";
import { CheckCircle2, Cloud, FileCheck2, HardDriveDownload, RotateCcw, ShipWheel, Smartphone } from "lucide-react";
import { loadCrossDeviceState, subscribeCrossDeviceState, type CrossDeviceState } from "../sync";
import {
  applyMobileSurfPatch,
  chooseMobileSurfRom,
  readMobileSurfState,
  restoreMobileSurfOriginal,
  type MobileSurfState,
} from "../mobileSurf";

import togekiss from "../shared/assets/surf-previews/togekiss-shiny.png";
import kyogre from "../shared/assets/surf-previews/kyogre-shiny.png";
import primal from "../shared/assets/surf-previews/primal-kyogre-shiny.png";
import demanta from "../shared/assets/surf-previews/demanta.png";
import lugiaShiny from "../shared/assets/surf-previews/lugia-shiny.png";
import lugia from "../shared/assets/surf-previews/lugia-normal.png";
import latias from "../shared/assets/surf-previews/latias-shiny.png";

const PATCHES = [
  { id: "togekiss-shiny", name: "Togekiss Shiny", image: togekiss },
  { id: "kyogre-shiny", name: "Kyogre Shiny", image: kyogre },
  { id: "primal-kyogre-shiny", name: "Primo-Kyogre Shiny", image: primal },
  { id: "mantine-x3", name: "Démanta ×3", image: demanta },
  { id: "lugia-shiny", name: "Lugia Shiny", image: lugiaShiny },
  { id: "lugia-normal", name: "Lugia", image: lugia },
  { id: "latias-shiny", name: "Latias Shiny", image: latias },
];

function patchName(id: string | null | undefined) {
  if (!id) return "Original";
  return PATCHES.find((patch) => patch.id === id)?.name ?? id;
}

export function SurfManagerMobilePage({ userId }: { userId: string }) {
  const [cloud, setCloud] = useState<CrossDeviceState | null>(null);
  const [local, setLocal] = useState<MobileSurfState | null>(() => readMobileSurfState());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshCloud = async () => {
    try { setCloud(await loadCrossDeviceState(userId)); } catch { setCloud(null); }
  };

  useEffect(() => {
    void refreshCloud();
    return subscribeCrossDeviceState(userId, () => void refreshCloud());
  }, [userId]);

  const chooseRom = async () => {
    setError(null);
    setNotice(null);
    setBusy("rom");
    try {
      const selected = await chooseMobileSurfRom(userId);
      if (selected) {
        setLocal(selected);
        setNotice("ROM enregistrée. Un backup original privé a été créé dans ALYA.");
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(null);
    }
  };

  const apply = async (patchId: string) => {
    if (!local) return;
    setError(null);
    setNotice(null);
    setBusy(patchId);
    try {
      const next = await applyMobileSurfPatch(userId, local, patchId);
      setLocal(next);
      setNotice(`${patchName(patchId)} appliqué sur la ROM Android.`);
      await refreshCloud();
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      if (!message.includes("__cancelled__")) setError(message);
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (!local) return;
    setError(null);
    setNotice(null);
    setBusy("restore");
    try {
      const next = await restoreMobileSurfOriginal(userId, local);
      setLocal(next);
      setNotice("ROM originale restaurée.");
      await refreshCloud();
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      if (!message.includes("__cancelled__")) setError(message);
    } finally {
      setBusy(null);
    }
  };

  return <section className="mobile-page">
    <header className="mobile-page-header">
      <div><span>UTILITIES</span><h1>Surf Manager</h1><p>Applique directement tes profils Surf sur la ROM utilisée par PokeMMO Android.</p></div>
      <ShipWheel size={25}/>
    </header>

    <div className="mobile-info surf-mobile-warning">
      <Smartphone size={18}/>
      <div>
        <strong>ROM externe Android</strong>
        <span>Choisis le fichier .nds que PokeMMO utilise dans ton dossier dédié. Ferme PokeMMO avant chaque application ou restauration.</span>
      </div>
    </div>

    <article className="mobile-card surf-rom-card">
      <div className="mobile-card-title">
        <div><small>ROM MOBILE</small><h2>{local?.romLabel ?? "Aucune ROM sélectionnée"}</h2></div>
        {local ? <FileCheck2 size={22}/> : <HardDriveDownload size={22}/>} 
      </div>
      {local && <div className="surf-rom-hash">Backup original · SHA-256 {local.originalSha256.slice(0, 16)}…</div>}
      <div className="surf-rom-actions">
        <button className="mobile-action" onClick={() => void chooseRom()} disabled={busy !== null}>
          <HardDriveDownload size={15}/>{local ? "Changer de ROM" : "Choisir ma ROM"}
        </button>
        <button className="mobile-action ghost" onClick={() => void restore()} disabled={!local || busy !== null || !local.activePatchId}>
          <RotateCcw size={15}/>Restaurer l’original
        </button>
      </div>
    </article>

    {notice && <div className="surf-mobile-message ok">{notice}</div>}
    {error && <div className="surf-mobile-message error">{error}</div>}

    <div className="mobile-stats">
      <article><strong>{patchName(local?.activePatchId)}</strong><span>actif Android</span></article>
      <article><strong>{patchName(cloud?.surf_pc_active_patch_id ?? cloud?.surf_active_patch_id)}</strong><span>actif PC</span></article>
    </div>

    <div className="mobile-info">
      <Cloud size={17}/>
      <div>
        <strong>ALYA Cloud</strong>
        <span>Le profil actif Android et le profil actif PC sont enregistrés séparément. Tu peux donc utiliser deux Surf différents sur les deux appareils.</span>
      </div>
    </div>

    <div className="surf-mobile-grid">
      {PATCHES.map((patch) => {
        const active = local?.activePatchId === patch.id;
        return <article className={`mobile-card surf-mobile-card ${active ? "active" : ""}`} key={patch.id}>
          <img src={patch.image} alt="" />
          <div>
            <h2>{patch.name}</h2>
            <span>{active ? "Actif sur Android" : "Profil Surf"}</span>
          </div>
          <button disabled={!local || busy !== null || active} onClick={() => void apply(patch.id)}>
            {active ? <><CheckCircle2 size={15}/> Actif</> : busy === patch.id ? "Application…" : "Appliquer"}
          </button>
        </article>;
      })}
    </div>
  </section>;
}
