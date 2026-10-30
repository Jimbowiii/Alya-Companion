import { useState, type CSSProperties } from "react";
import { AuthGate } from "./shared/AuthGate";
import { useAlyaAuth } from "./shared/useAlyaAuth";
import { DashboardMobilePage } from "./pages/DashboardMobilePage";
import { BerriesMobilePage } from "./pages/BerriesMobilePage";
import { GymRerunMobilePage } from "./pages/GymRerunMobilePage";
import { RaidsMobilePage } from "./pages/RaidsMobilePage";
import { ShinyWarMobilePage } from "./pages/ShinyWarMobilePage";
import { SurfManagerMobilePage } from "./pages/SurfManagerMobilePage";
import { RotationsMobilePage } from "./pages/RotationsMobilePage";
import { ModsMobilePage } from "./pages/ModsMobilePage";
import { MobileMenuButton, MobileSidebar, type MobileTab } from "./MobileSidebar";
import { MobileUtilityPanel, type MobileUtilityMode } from "./MobileUtilityPanel";

import dashboardBg from "./assets/mobile-backgrounds/dashboard.png";
import berriesBg from "./assets/mobile-backgrounds/berries.png";
import gymBg from "./assets/mobile-backgrounds/gym.png";
import raidsBg from "./assets/mobile-backgrounds/raids.png";
import shinyWarBg from "./assets/mobile-backgrounds/shinywar.png";
import surfBg from "./assets/mobile-backgrounds/surf.png";
import rotationsBg from "./assets/mobile-backgrounds/rotations.png";
import modsBg from "./assets/mobile-backgrounds/mods.png";

const TAB_META: Record<MobileTab, { title: string; background: string; position?: string }> = {
  dashboard: { title: "Accueil", background: dashboardBg, position: "center center" },
  berries: { title: "Baies", background: berriesBg, position: "center center" },
  gym: { title: "Gym Rerun", background: gymBg, position: "center center" },
  raids: { title: "Raids", background: raidsBg, position: "center center" },
  shinywar: { title: "Shiny-War", background: shinyWarBg, position: "center center" },
  surf: { title: "Surf Manager", background: surfBg, position: "center center" },
  rotations: { title: "Rotations", background: rotationsBg, position: "center center" },
  mods: { title: "Mods", background: modsBg, position: "center center" },
};

export default function App() {
  const auth = useAlyaAuth();
  const [tab, setTab] = useState<MobileTab>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [utilityMode, setUtilityMode] = useState<MobileUtilityMode | null>(null);

  if (!auth.configured || auth.loading || !auth.session || auth.recoveryMode) {
    return <AuthGate
      configured={auth.configured}
      loading={auth.loading}
      error={auth.error}
      recoveryMode={auth.recoveryMode}
      onClearError={auth.clearError}
      onSignIn={auth.signIn}
      onSignUp={auth.signUp}
      onDiscord={auth.signInDiscord}
      onReset={auth.resetPassword}
      onSetNewPassword={auth.setNewPassword}
    />;
  }

  const userId = auth.session.user.id;
  const username = auth.profile?.username ?? "ALYA";
  const role = auth.profile?.role ?? "user";
  const avatarUrl =
    (auth.session.user.user_metadata?.avatar_url as string | undefined) ??
    (auth.session.user.user_metadata?.picture as string | undefined) ??
    undefined;
  const meta = TAB_META[tab];
  let page;
  switch (tab) {
    case "berries": page = <BerriesMobilePage userId={userId} />; break;
    case "gym": page = <GymRerunMobilePage />; break;
    case "raids": page = <RaidsMobilePage />; break;
    case "shinywar": page = <ShinyWarMobilePage userId={userId} />; break;
    case "surf": page = <SurfManagerMobilePage userId={userId} />; break;
    case "rotations": page = <RotationsMobilePage />; break;
    case "mods": page = <ModsMobilePage />; break;
    default: page = <DashboardMobilePage userId={userId} username={username} onNavigate={setTab} />;
  }

  return <div className="mobile-shell mobile-shell-v2">
    <header className="mobile-topbar mobile-topbar-v2">
      <MobileMenuButton onClick={() => setDrawerOpen(true)} />
      <div className="mobile-topbar-title"><strong>{meta.title}</strong><span>ALYA Companion</span></div>
      <div className="mobile-topbar-role">{role.toUpperCase()}</div>
    </header>

    <MobileSidebar
      open={drawerOpen}
      tab={tab}
      username={username}
      role={role}
      avatarUrl={avatarUrl}
      onClose={() => setDrawerOpen(false)}
      onNavigate={setTab}
      onCustomize={() => setUtilityMode("customize")}
      onSettings={() => setUtilityMode("settings")}
      onPrepa={() => setUtilityMode("prepa")}
      onUserAdmin={() => setUtilityMode("users")}
      onSignOut={() => void auth.signOut()}
    />
    <MobileUtilityPanel
      mode={utilityMode}
      role={role}
      currentUserId={userId}
      onClose={() => setUtilityMode(null)}
      onNavigate={(nextTab) => { setTab(nextTab); setUtilityMode(null); }}
    />

    <main
      className={`mobile-content mobile-content-v2 mobile-tab-${tab}`}
      style={{
        "--mobile-tab-background": `url(${meta.background})`,
        "--mobile-tab-position": meta.position ?? "center center",
      } as CSSProperties}
    >
      <div className="mobile-tab-background" aria-hidden="true" />
      <div className="mobile-tab-vignette" aria-hidden="true" />
      <div className="mobile-page-layer">{page}</div>
    </main>
  </div>;
}
