import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Cherry,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShipWheel,
  TimerReset,
  Package,
  Sparkles,
  Swords,
  Table2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import alyaIcon from "./shared/assets/alya-icon.png";
import { MOBILE_SIDEBAR_PREFS_EVENT, readMobileSidebarPrefs } from "./MobileUtilityPanel";

export type MobileTab = "dashboard" | "berries" | "gym" | "raids" | "shinywar" | "surf" | "rotations" | "mods";

type Item = { id: MobileTab; label: string; icon: LucideIcon };
type Group = { id: string; label: string; items: Item[] };

const GROUPS: Group[] = [
  { id: "home", label: "Accueil", items: [{ id: "dashboard", label: "Dashboard", icon: Home }] },
  { id: "money", label: "Make Big Money", items: [
    { id: "berries", label: "Baies", icon: Cherry },
    { id: "gym", label: "Gym Rerun", icon: Sparkles },
  ]},
  { id: "utilities", label: "Utilities", items: [
    { id: "surf", label: "Surf Manager", icon: ShipWheel },
    { id: "raids", label: "Raids", icon: Swords },
    { id: "rotations", label: "Rotations", icon: TimerReset },
    { id: "mods", label: "Mods", icon: Package },
  ]},
  { id: "shinywars", label: "Shiny-Wars", items: [{ id: "shinywar", label: "Shiny-War", icon: Table2 }] },
];

const OPEN_STORAGE = "alya-mobile-sidebar-groups-v1";

function readOpenGroups() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPEN_STORAGE) ?? "{}") as Record<string, boolean>;
    return { home: true, money: true, utilities: true, shinywars: true, ...parsed };
  } catch {
    return { home: true, money: true, utilities: true, shinywars: true };
  }
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return <button className="mobile-hamburger" onClick={onClick} aria-label="Ouvrir le menu"><Menu size={22}/></button>;
}

export function MobileSidebar({
  open,
  tab,
  username,
  role,
  avatarUrl,
  onClose,
  onNavigate,
  onCustomize,
  onSettings,
  onPrepa,
  onUserAdmin,
  onSignOut,
}: {
  open: boolean;
  tab: MobileTab;
  username: string;
  role: string;
  avatarUrl?: string;
  onClose: () => void;
  onNavigate: (tab: MobileTab) => void;
  onCustomize: () => void;
  onSettings: () => void;
  onPrepa: () => void;
  onUserAdmin: () => void;
  onSignOut: () => void;
}) {
  const [opened, setOpened] = useState<Record<string, boolean>>(readOpenGroups);
  const [prefs, setPrefs] = useState(readMobileSidebarPrefs);

  useEffect(() => {
    const refresh = () => setPrefs(readMobileSidebarPrefs());
    window.addEventListener(MOBILE_SIDEBAR_PREFS_EVENT, refresh);
    return () => window.removeEventListener(MOBILE_SIDEBAR_PREFS_EVENT, refresh);
  }, []);

  const orderedGroups = useMemo(() => {
    const byId = new Map(GROUPS.map((group) => [group.id, group]));
    return prefs.order.map((id) => byId.get(id)).filter((group): group is Group => Boolean(group) && !prefs.hidden.includes(group!.id));
  }, [prefs]);

  const activeGroup = useMemo(
    () => GROUPS.find((group) => group.items.some((item) => item.id === tab))?.id,
    [tab],
  );

  useEffect(() => {
    if (!activeGroup) return;
    setOpened((current) => current[activeGroup] ? current : { ...current, [activeGroup]: true });
  }, [activeGroup]);

  useEffect(() => {
    document.body.classList.toggle("mobile-drawer-open", open);
    return () => document.body.classList.remove("mobile-drawer-open");
  }, [open]);

  const toggle = (id: string) => {
    setOpened((current) => {
      const next = { ...current, [id]: !current[id] };
      try { localStorage.setItem(OPEN_STORAGE, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const roleKey = role.toLowerCase();
  const canPrepa = ["dev", "gourou", "admin"].includes(roleKey);
  const canManageUsers = ["dev", "gourou"].includes(roleKey);

  return <>
    <button className={`mobile-drawer-backdrop ${open ? "is-open" : ""}`} onClick={onClose} aria-label="Fermer le menu"/>
    <aside className={`mobile-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="mobile-drawer-head">
        <div className="mobile-drawer-brand">
          <img src={alyaIcon} alt=""/>
          <div><strong>ALYA Companion</strong><span>{username} · {role.toUpperCase()}</span></div>
        </div>
        <button className="mobile-drawer-close" onClick={onClose} aria-label="Fermer"><X size={20}/></button>
      </div>

      <div className="mobile-drawer-scroll">
        {orderedGroups.map((group) => {
          const isOpen = opened[group.id] ?? true;
          const hasActive = group.items.some((item) => item.id === tab);
          return <section className={`mobile-drawer-group ${hasActive ? "has-active" : ""}`} key={group.id}>
            <button className="mobile-drawer-group-head" onClick={() => toggle(group.id)} aria-expanded={isOpen}>
              <span>{group.label}</span><ChevronDown size={16} className={isOpen ? "is-open" : ""}/>
            </button>
            <div className={`mobile-drawer-group-body ${isOpen ? "is-open" : ""}`}><div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return <button key={item.id} className={`mobile-drawer-item ${tab === item.id ? "is-active" : ""}`} onClick={() => { onNavigate(item.id); onClose(); }}>
                  <Icon size={18}/><span>{item.label}</span>
                </button>;
              })}
            </div></div>
          </section>;
        })}
      </div>

      <div className="mobile-drawer-footer mobile-profile-footer">
        <div className="mobile-profile-card">
          <div className="mobile-profile-head">
            <img className="mobile-profile-avatar" src={avatarUrl || alyaIcon} alt=""/>
            <div className="mobile-profile-identity"><strong>{username}</strong><span className={`mobile-role-chip role-${roleKey}`}>{role.toUpperCase()}</span></div>
          </div>

          <div className="mobile-profile-actions">
            <button type="button" title="Personnaliser ALYA" aria-label="Personnaliser ALYA" onClick={() => { onCustomize(); onClose(); }}><Wrench size={18}/></button>
            <button type="button" title="Settings" aria-label="Settings" onClick={() => { onSettings(); onClose(); }}><Settings size={18}/></button>
            {canPrepa && <button type="button" title="Prépa Alya" aria-label="Prépa Alya" onClick={() => { onPrepa(); onClose(); }}><ClipboardList size={18}/></button>}
            {canManageUsers && <button type="button" title="Gestion utilisateurs" aria-label="Gestion utilisateurs" onClick={() => { onUserAdmin(); onClose(); }}><Shield size={18}/></button>}
          </div>

          <div className="mobile-profile-status">ALYA Cloud connecté</div>
          <div className="mobile-profile-note">PokeMMO mobile · Surf Manager disponible</div>
          <div className="mobile-profile-version">ALYA Companion 1.0.0-rc.11 MOBILE</div>
        </div>
        <button className="mobile-profile-signout" onClick={onSignOut}><LogOut size={17}/><span>Se déconnecter</span></button>
      </div>
    </aside>
  </>;
}
