import { useEffect, useMemo, useState } from "react";
import { Cherry, ShipWheel, Sparkles, Swords, Table2 } from "lucide-react";
import { DashboardEventWidget } from "../shared/DashboardEvent";
import { loadCloudShinyWar } from "../shared/auth";
import { loadCrossDeviceState, type CrossDeviceState } from "../sync";

type TabId = "berries" | "gym" | "raids" | "shinywar" | "surf";

export function DashboardMobilePage({
  userId,
  username,
  onNavigate,
}: {
  userId: string;
  username: string;
  onNavigate: (tab: TabId) => void;
}) {
  const [cross, setCross] = useState<CrossDeviceState | null>(null);
  const [shiny, setShiny] = useState<unknown[] | null>(null);

  useEffect(() => {
    void loadCrossDeviceState(userId).then(setCross).catch(() => undefined);
    void loadCloudShinyWar(userId).then(setShiny).catch(() => undefined);
  }, [userId]);

  const shinyTotal = useMemo(() => {
    if (!Array.isArray(shiny)) return 0;
    return shiny.reduce<number>((sum, account) => {
      if (!account || typeof account !== "object") return sum;
      const chars = Array.isArray((account as { characters?: unknown }).characters)
        ? (account as { characters: unknown[] }).characters
        : [];
      return sum + chars.reduce<number>((inner, c) => inner + (Number((c as { ditto?: unknown })?.ditto) || 0), 0);
    }, 0);
  }, [shiny]);

  return <section className="mobile-page">
    <header className="mobile-hero">
      <span>ALYA CLOUD</span>
      <h1>Salut {username}</h1>
      <p>Ton compagnon PokeMMO, maintenant synchronisé avec ton téléphone.</p>
    </header>
    <DashboardEventWidget />
    <div className="mobile-dashboard-grid">
      <button onClick={() => onNavigate("berries")}><Cherry/><span>Baies</span><strong>{Object.keys(cross?.berry_timers ?? {}).length}/6 actives</strong></button>
      <button onClick={() => onNavigate("shinywar")}><Table2/><span>Shiny-War</span><strong>{shinyTotal.toLocaleString("fr-FR")} Ditto</strong></button>
      <button onClick={() => onNavigate("surf")}><ShipWheel/><span>Surf Manager</span><strong>{cross?.surf_android_active_patch_id ?? "Original"}</strong></button>
      <button onClick={() => onNavigate("gym")}><Sparkles/><span>Gym Rerun</span><strong>6 stratégies</strong></button>
      <button onClick={() => onNavigate("raids")}><Swords/><span>Raids</span><strong>6 boss</strong></button>
    </div>
  </section>;
}
