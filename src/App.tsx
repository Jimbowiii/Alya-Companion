import { Tv as StreamTvIcon } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState } from "react";
import type {
  ChangeEvent,
  CSSProperties } from "react";
import type { LucideIcon,
  Tv,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  CircleAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudDownload,
  FolderOpen,
  Gauge,
  GripVertical,
  Gem,
  Image as ImageIcon,
  MessagesSquare,
  BookOpen,
  Newspaper,
  Megaphone,
  Minus,
  RefreshCw,
  RotateCcw,
  Save,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Shield,
  ShipWheel,
  Sparkles,
  Sprout,
  TimerReset,
  Trophy,
  Swords,
  Table2,
  UserRound,
  Users,
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
import { AuthGate } from "./AuthGate";
import { AccountModal } from "./AccountModal";
import { GymRerunPage } from "./GymRerunPage";
import { RaidsPage } from "./RaidsPage";
import { ModsPage } from "./ModsPage";
import { StreamPage } from "./StreamPage";
import { DashboardEventAdminPanel, DashboardEventWidget } from "./DashboardEvent";
import { BerriesPage } from "./BerriesPage";
import { BerriesTimerWatcher } from "./BerriesTimerWatcher";
import { useAlyaAuth } from "./useAlyaAuth";
import { cloudPreferencesFromSettings, createAlyaBadge, deleteAlyaBadge, listAlyaBadges, listAlyaProfiles, loadCloudShinyWar, saveCloudPreferences, saveCloudShinyWar, setAlyaUserBadge, setAlyaUserBadgeOrder, setAlyaUserRole, uploadAlyaBadgeImage } from "./auth";
import type { AlyaBadge, AlyaProfile, AlyaRole } from "./auth";
import alyaIcon from "./assets/alya-icon.png";
import dashboardBackground from "./assets/dashboard-background.webm";
import alyarchetypeBackground from "./assets/alyarchetype-background.png";
import externalTabsBackground from "./assets/external-tabs-background.png";
import rotationsBackground from "./assets/rotations-background.png";
import shinyWarBackground from "./assets/shiny-war-background.png";
import sidebarBackground from "./assets/sidebar-background.png";
import surfManagerBackground from "./assets/surf-manager-background.png";
import berriesBackground from "./assets/berries-background.png";
import raidsBackground from "./assets/raids-background.png";
import modsBackground from "./assets/mods-background.png";
import surfTogekissShiny from "./assets/surf-previews/togekiss-shiny.png";
import surfKyogreShiny from "./assets/surf-previews/kyogre-shiny.png";
import surfPrimalKyogreShiny from "./assets/surf-previews/primal-kyogre-shiny.png";
import surfDemanta from "./assets/surf-previews/demanta.png";
import surfLugiaShiny from "./assets/surf-previews/lugia-shiny.png";
import surfLugiaNormal from "./assets/surf-previews/lugia-normal.png";
import surfLatiasShiny from "./assets/surf-previews/latias-shiny.png";

import SidebarGroupedNav from "./SidebarGroupedNav";
import SidebarCategoryCustomizer from "./SidebarCategoryCustomizer";
const EMPTY_SETTINGS: Settings = {
  pokemmo_dir: "",
  rom_path: "",
  vanity_url: "https://www.crimsoncoremmo.co.uk/vanity-booth",
  accent_color: "#9b7bdf",
  hidden_tabs: [],
  tab_order: ["dashboard", "theme", "surf", "vanity", "shinyboard", "shinywar", "gymrerun", "raids", "berries", "mods", "stream", "rotations", "pokepedia", "pokebip", "forum"],
  dashboard_modules: ["theme", "surf", "rotations"],
};

const NAV_ITEMS = [
  ["dashboard", "Dashboard", Gauge],
  ["theme", "AlyArchetype", Sparkles],
  ["surf", "Surf Manager", ShipWheel],
  ["vanity", "Vanity", ImageIcon],
  ["shinyboard", "Shinyboard", Gem],
  ["shinywar", "Shiny-War", Table2],
  ["gymrerun", "Gym Rerun", Trophy],
  ["raids", "Raids", Swords],
  ["berries", "Baies", Sprout],
  ["mods", "Mods", CloudDownload],
  ["stream", "Stream", StreamTvIcon],
  ["rotations", "Rotations", TimerReset],
  ["pokepedia", "Poképédia", BookOpen],
  ["pokebip", "Pokébip", Newspaper],
  ["forum", "Forum", MessagesSquare],
] as const;

type SidebarTab = (typeof NAV_ITEMS)[number][0];
type DashboardModuleId = Exclude<SidebarTab, "dashboard">;
type DashboardModuleItem = readonly [DashboardModuleId, string, LucideIcon];
type Tab = SidebarTab | "settings" | "prepa" | "user-admin";
type CustomizableBackgroundTab = Exclude<SidebarTab, "dashboard">;
type PageBackgroundAssetId =
  | "alyarchetype"
  | "surf-manager"
  | "shiny-war"
  | "rotations"
  | "external-tabs"
  | "sidebar"
  | "dashboard-video"
  | "berries"
  | "raids"
  | "mods";

type PageBackgroundAsset = {
  id: PageBackgroundAssetId;
  label: string;
  src: string;
  kind: "image" | "video";
};

const PAGE_BACKGROUND_STORAGE_KEY = "alya-companion-page-backgrounds-v1";

const PAGE_BACKGROUND_ASSETS: readonly PageBackgroundAsset[] = [
  { id: "alyarchetype", label: "AlyArchetype", src: alyarchetypeBackground, kind: "image" },
  { id: "surf-manager", label: "Surf Manager", src: surfManagerBackground, kind: "image" },
  { id: "shiny-war", label: "Shiny-War", src: shinyWarBackground, kind: "image" },
  { id: "rotations", label: "Rotations", src: rotationsBackground, kind: "image" },
  { id: "external-tabs", label: "Outils externes", src: externalTabsBackground, kind: "image" },
  { id: "sidebar", label: "Sidebar", src: sidebarBackground, kind: "image" },
  { id: "dashboard-video", label: "Dashboard animé", src: dashboardBackground, kind: "video" },
  { id: "berries", label: "Baies · coucher de soleil", src: berriesBackground, kind: "image" },
  { id: "raids", label: "Raids · arène céleste", src: raidsBackground, kind: "image" },
  { id: "mods", label: "Mods · panorama fantasy", src: modsBackground, kind: "image" },
] as const;

const DEFAULT_PAGE_BACKGROUNDS: Record<CustomizableBackgroundTab, PageBackgroundAssetId> = {
  theme: "alyarchetype",
  surf: "surf-manager",
  vanity: "external-tabs",
  shinyboard: "external-tabs",
  shinywar: "shiny-war",
  gymrerun: "rotations",
  raids: "raids",
  berries: "berries",
  mods: "mods",
  stream: "external-tabs",
  rotations: "rotations",
  pokepedia: "external-tabs",
  pokebip: "external-tabs",
  forum: "external-tabs",
};

const PAGE_BACKGROUND_OVERLAYS: Record<CustomizableBackgroundTab, string> = {
  theme: "linear-gradient(rgba(8, 10, 22, .36), rgba(8, 10, 22, .58))",
  surf: "linear-gradient(rgba(4, 12, 24, .34), rgba(4, 9, 18, .54))",
  vanity: "linear-gradient(rgba(5, 6, 10, .34), rgba(5, 6, 10, .56))",
  shinyboard: "linear-gradient(rgba(5, 6, 10, .34), rgba(5, 6, 10, .56))",
  shinywar: "linear-gradient(rgba(7, 8, 18, .28), rgba(7, 8, 18, .44))",
  gymrerun: "linear-gradient(rgba(7, 9, 16, .30), rgba(7, 9, 16, .52))",
  raids: "linear-gradient(rgba(5, 8, 16, .26), rgba(5, 8, 16, .50))",
  berries: "linear-gradient(rgba(5, 10, 9, .30), rgba(5, 8, 10, .55))",
  mods: "linear-gradient(rgba(5, 7, 12, .30), rgba(5, 7, 12, .56))",
  stream: "linear-gradient(rgba(5, 6, 10, .30), rgba(5, 6, 10, .54))",
  rotations: "linear-gradient(rgba(8, 12, 24, .28), rgba(8, 12, 24, .48))",
  pokepedia: "linear-gradient(rgba(5, 6, 10, .30), rgba(5, 6, 10, .52))",
  pokebip: "linear-gradient(rgba(5, 6, 10, .30), rgba(5, 6, 10, .52))",
  forum: "linear-gradient(rgba(5, 6, 10, .34), rgba(5, 6, 10, .56))",
};

function isCustomizableBackgroundTab(tab: Tab): tab is CustomizableBackgroundTab {
  return tab === "theme"
    || tab === "surf"
    || tab === "vanity"
    || tab === "shinyboard"
    || tab === "shinywar"
    || tab === "gymrerun"
    || tab === "raids"
    || tab === "berries"
    || tab === "stream"
    || tab === "mods"
    || tab === "rotations"
    || tab === "pokepedia"
    || tab === "pokebip"
    || tab === "forum";
}

function readPageBackgroundPreferences(): Partial<Record<CustomizableBackgroundTab, PageBackgroundAssetId>> {
  try {
    const raw = localStorage.getItem(PAGE_BACKGROUND_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const validAssetIds = new Set(PAGE_BACKGROUND_ASSETS.map((asset) => asset.id));
    const result: Partial<Record<CustomizableBackgroundTab, PageBackgroundAssetId>> = {};
    for (const tab of Object.keys(DEFAULT_PAGE_BACKGROUNDS) as CustomizableBackgroundTab[]) {
      const value = parsed[tab];
      if (typeof value === "string" && validAssetIds.has(value as PageBackgroundAssetId)) {
        result[tab] = value as PageBackgroundAssetId;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function pageBackgroundAssetById(id: PageBackgroundAssetId): PageBackgroundAsset {
  return PAGE_BACKGROUND_ASSETS.find((asset) => asset.id === id) ?? PAGE_BACKGROUND_ASSETS[0];
}

// Dashboard personalization follows NAV_ITEMS automatically.
// Add a future tab to NAV_ITEMS and it will immediately become available here.
// The explicit item type makes TypeScript understand that Dashboard itself is excluded.
const DASHBOARD_MODULES = NAV_ITEMS.filter(
  ([id]) => id !== "dashboard",
) as unknown as readonly DashboardModuleItem[];

const EXTERNAL_TABS: Partial<Record<Tab, EmbeddedWebviewKind>> = {
  vanity: "vanity",
  shinyboard: "shinyboard",
  pokepedia: "pokepedia",
  pokebip: "pokebip",
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


type ShinyWarCharacter = {
  name: string;
  ditto: number;
};

type ShinyWarAccount = {
  account: string;
  characters: ShinyWarCharacter[];
};

const SHINY_WAR_STORAGE_KEY = "alya-companion-shiny-war-v1";
const SHINY_WAR_ACCOUNT_COUNT = 10;
const SHINY_WAR_CHARACTERS_PER_ACCOUNT = 3;
const SHINY_WAR_DITTO_TARGET = 660;

function createEmptyShinyWarAccount(): ShinyWarAccount {
  return {
    account: "",
    characters: Array.from({ length: SHINY_WAR_CHARACTERS_PER_ACCOUNT }, () => ({
      name: "",
      ditto: 0,
    })),
  };
}

function createEmptyShinyWarData(count = SHINY_WAR_ACCOUNT_COUNT): ShinyWarAccount[] {
  return Array.from({ length: count }, () => createEmptyShinyWarAccount());
}

function isEmptyShinyWarAccount(account: ShinyWarAccount): boolean {
  return account.account.trim() === "" && account.characters.every((character) => character.name.trim() === "" && character.ditto === 0);
}

function normalizeShinyWarData(raw: unknown): ShinyWarAccount[] {
  const fallback = createEmptyShinyWarData();
  if (!Array.isArray(raw)) return fallback;

  const accountCount = Math.max(SHINY_WAR_ACCOUNT_COUNT, raw.length);
  const normalized = Array.from({ length: accountCount }, (_, accountIndex) => {
    const emptyAccount = createEmptyShinyWarAccount();
    const rawAccount = raw[accountIndex];
    if (!rawAccount || typeof rawAccount !== "object") return emptyAccount;

    const accountRecord = rawAccount as { account?: unknown; characters?: unknown };
    const rawCharacters = Array.isArray(accountRecord.characters) ? accountRecord.characters : [];
    return {
      account: typeof accountRecord.account === "string" ? accountRecord.account : "",
      characters: emptyAccount.characters.map((emptyCharacter, characterIndex) => {
        const rawCharacter = rawCharacters[characterIndex];
        if (!rawCharacter || typeof rawCharacter !== "object") return emptyCharacter;
        const characterRecord = rawCharacter as { name?: unknown; ditto?: unknown };
        const rawDitto = Number(characterRecord.ditto);
        return {
          name: typeof characterRecord.name === "string" ? characterRecord.name : "",
          ditto: Number.isFinite(rawDitto) ? Math.max(0, Math.trunc(rawDitto)) : 0,
        };
      }),
    };
  });

  while (normalized.length > SHINY_WAR_ACCOUNT_COUNT && isEmptyShinyWarAccount(normalized[normalized.length - 1])) {
    normalized.pop();
  }
  return normalized;
}

function loadShinyWarData(): ShinyWarAccount[] {
  try {
    const saved = localStorage.getItem(SHINY_WAR_STORAGE_KEY);
    return saved ? normalizeShinyWarData(JSON.parse(saved)) : createEmptyShinyWarData();
  } catch {
    return createEmptyShinyWarData();
  }
}

function ShinyWarPage({ userId, onEditBackground }: { userId: string; onEditBackground: () => void }) {
  const [accounts, setAccounts] = useState<ShinyWarAccount[]>(loadShinyWarData);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudState, setCloudState] = useState<"syncing" | "synced" | "error">("syncing");

  useEffect(() => {
    let cancelled = false;
    setCloudReady(false);
    setCloudState("syncing");
    void loadCloudShinyWar(userId)
      .then(async (cloud) => {
        if (cancelled) return;
        if (cloud) {
          setAccounts(normalizeShinyWarData(cloud));
        } else {
          await saveCloudShinyWar(userId, accounts);
        }
        if (!cancelled) {
          setCloudReady(true);
          setCloudState("synced");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCloudReady(true);
          setCloudState("error");
        }
      });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(SHINY_WAR_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // La feuille reste utilisable même si le stockage local est indisponible.
    }
    if (!cloudReady) return;
    setCloudState("syncing");
    const timer = window.setTimeout(() => {
      void saveCloudShinyWar(userId, accounts)
        .then(() => setCloudState("synced"))
        .catch(() => setCloudState("error"));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [accounts, cloudReady, userId]);

  const grandTotal = useMemo(
    () => accounts.reduce((sum, account) => sum + account.characters.reduce((accountSum, character) => accountSum + character.ditto, 0), 0),
    [accounts],
  );

  const completedCharacters = useMemo(
    () => accounts.reduce((sum, account) => sum + account.characters.filter((character) => character.ditto >= SHINY_WAR_DITTO_TARGET).length, 0),
    [accounts],
  );

  const updateAccountName = (accountIndex: number, value: string) => {
    setAccounts((current) => current.map((account, index) => index === accountIndex ? { ...account, account: value } : account));
  };

  const updateCharacterName = (accountIndex: number, characterIndex: number, value: string) => {
    setAccounts((current) => current.map((account, index) => index === accountIndex ? {
      ...account,
      characters: account.characters.map((character, childIndex) => childIndex === characterIndex ? { ...character, name: value } : character),
    } : account));
  };

  const updateDitto = (accountIndex: number, characterIndex: number, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const ditto = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

    setAccounts((current) => current.map((account, index) => index === accountIndex ? {
      ...account,
      characters: account.characters.map((character, childIndex) => childIndex === characterIndex ? { ...character, ditto } : character),
    } : account));
  };

  const addAccount = () => {
    setAccounts((current) => [...current, createEmptyShinyWarAccount()]);
  };

  const removeAccount = () => {
    if (accounts.length <= 1) return;

    const lastAccount = accounts[accounts.length - 1];
    if (!isEmptyShinyWarAccount(lastAccount)) {
      const confirmed = window.confirm(`Supprimer le compte ${accounts.length} et ses 3 personnages ? Les données de ce compte seront perdues.`);
      if (!confirmed) return;
    }

    setAccounts((current) => current.length <= 1 ? current : current.slice(0, -1));
  };

  return <section className="shiny-war-page">
    <header className="page-header shiny-war-header">
      <div>
        <p className="eyebrow">Shiny-War</p>
        <h1>Suivi Ditto</h1>
        <p>{accounts.length} comptes, 3 personnages par compte et calcul automatique des totaux.</p>
      </div>
      <div className="page-header-actions shiny-war-header-actions">
        <PageBackgroundButton tabLabel="Shiny-War" onClick={onEditBackground} />
        <div className="shiny-war-summary">
          <div><span>Total actuel</span><strong>{grandTotal.toLocaleString("fr-FR")}</strong></div>
          <div><span>Objectif global</span><strong>{(accounts.length * SHINY_WAR_CHARACTERS_PER_ACCOUNT * SHINY_WAR_DITTO_TARGET).toLocaleString("fr-FR")}</strong></div>
          <div><span>Personnages à 660</span><strong>{completedCharacters}/{accounts.length * SHINY_WAR_CHARACTERS_PER_ACCOUNT}</strong></div>
        </div>
      </div>
    </header>

    <div className="shiny-war-workbook">
      <div className="shiny-war-sheet-tabs">
        <button className="active"><Table2 size={15}/> Feuille 1 · Ditto</button>
        <div className="shiny-war-account-actions">
          <button className="shiny-war-remove-account" onClick={removeAccount} disabled={accounts.length <= 1} title="Supprimer le dernier compte (3 personnages)"><Minus size={15}/> Supprimer</button>
          <button className="shiny-war-add-account" onClick={addAccount} title="Ajouter un compte (3 personnages)"><Plus size={15}/> Ajouter un compte</button>
        </div>
      </div>
      <div className="shiny-war-table-wrap">
        <table className="shiny-war-table">
          <thead>
            <tr>
              <th className="shiny-war-head-account">Compte</th>
              <th className="shiny-war-head-character">Personnage</th>
              <th className="shiny-war-head-ditto">Ditto</th>
              <th className="shiny-war-head-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, accountIndex) => {
              const accountTotal = account.characters.reduce((sum, character) => sum + character.ditto, 0);
              const accountComplete = account.characters.every((character) => character.ditto >= SHINY_WAR_DITTO_TARGET);
              const totalClass = accountComplete ? "target" : accountTotal === 0 ? "zero" : "progress";

              return account.characters.map((character, characterIndex) => {
                const dittoClass = character.ditto >= SHINY_WAR_DITTO_TARGET ? "target" : character.ditto === 0 ? "zero" : "progress";

                return <tr key={`${accountIndex}-${characterIndex}`} className={characterIndex === 2 ? "account-end" : ""}>
                  {characterIndex === 0 && <td rowSpan={3} className="shiny-war-account-cell">
                    <span className="shiny-war-row-number">{String(accountIndex + 1).padStart(2, "0")}</span>
                    <input
                      value={account.account}
                      placeholder={`Compte ${accountIndex + 1}`}
                      onChange={(event) => updateAccountName(accountIndex, event.target.value)}
                    />
                  </td>}
                  <td className="shiny-war-character-cell">
                    <input
                      value={character.name}
                      placeholder={`Personnage ${characterIndex + 1}`}
                      onChange={(event) => updateCharacterName(accountIndex, characterIndex, event.target.value)}
                    />
                  </td>
                  <td className={`shiny-war-ditto-cell ${dittoClass}`}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={character.ditto}
                      onChange={(event) => updateDitto(accountIndex, characterIndex, event.target.value)}
                    />
                  </td>
                  {characterIndex === 0 && <td rowSpan={3} className={`shiny-war-total-cell ${totalClass}`}>
                    <strong>{accountTotal.toLocaleString("fr-FR")}</strong>
                    <span>{accountComplete ? "3 / 3 à 660" : `${account.characters.filter((item) => item.ditto >= SHINY_WAR_DITTO_TARGET).length} / 3 à 660`}</span>
                  </td>}
                </tr>;
              });
            })}
            <tr className="shiny-war-grand-total-row">
              <td colSpan={3}><strong>Total général</strong><span>Somme des {accounts.length * SHINY_WAR_CHARACTERS_PER_ACCOUNT} lignes Ditto</span></td>
              <td><strong>{grandTotal.toLocaleString("fr-FR")}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={`shiny-war-save-note ${cloudState}`}><CheckCircle2 size={15}/> {cloudState === "syncing" ? "Synchronisation Alya…" : cloudState === "error" ? "Sauvegardé localement · cloud indisponible" : "Sauvegardé localement + synchronisé sur Alya Cloud"}</div>
    </div>
  </section>;
}


function RoleBadge({ role }: { role: AlyaRole }) {
  const label = role === "Gourou" ? "GOUROU" : role;
  return <span className={`role-badge role-${role.toLowerCase()}`}>{label}</span>;
}

const ALYA_ROLE_SORT_ORDER: Record<AlyaRole, number> = {
  DEV: 0,
  Gourou: 1,
  Admin: 2,
  user: 3,
};

function sortProfilesByRole(profiles: AlyaProfile[]) {
  return [...profiles].sort((left, right) => {
    const roleDifference = ALYA_ROLE_SORT_ORDER[left.role] - ALYA_ROLE_SORT_ORDER[right.role];
    if (roleDifference !== 0) return roleDifference;
    return left.username.localeCompare(right.username, "fr-FR", { sensitivity: "base" });
  });
}

function PlayerBadge({ badge, compact = false }: { badge: AlyaBadge; compact?: boolean }) {
  const style = { "--player-badge-color": badge.color } as CSSProperties;
  if (badge.image_url && compact) {
    return <span className="player-badge-image-only alya-badge-tooltip" data-tooltip={badge.name} aria-label={badge.name}>
      <img src={badge.image_url} alt="" loading="lazy" />
    </span>;
  }

  return <span className={`player-badge ${compact ? "compact" : ""} ${badge.image_url ? "with-image" : ""}`} style={style}>
    {badge.image_url
      ? <span className="player-badge-image-wrap"><img className="player-badge-image" src={badge.image_url} alt="" loading="lazy" /></span>
      : <span className="player-badge-icon">{badge.icon}</span>}
    <span className="player-badge-name">{badge.name}</span>
  </span>;
}

function SidebarBadges({ badges }: { badges: AlyaBadge[] }) {
  if (badges.length === 0) return null;
  const visible = badges.slice(0, 2);
  const hidden = badges.length - visible.length;
  return <span className="sidebar-profile-badges">
    {visible.map((badge) => <PlayerBadge key={badge.id} badge={badge} compact />)}
    {hidden > 0 && <span className="player-badge-more" title={badges.slice(2).map((badge) => badge.name).join(", ")}>+{hidden}</span>}
  </span>;
}

function ReadonlyShinyWarSheet({ accounts }: { accounts: ShinyWarAccount[] }) {
  const grandTotal = accounts.reduce((sum, account) => sum + account.characters.reduce((accountSum, character) => accountSum + character.ditto, 0), 0);
  const completedCharacters = accounts.reduce((sum, account) => sum + account.characters.filter((character) => character.ditto >= SHINY_WAR_DITTO_TARGET).length, 0);

  return <div className="shiny-war-workbook shiny-war-readonly">
    <div className="shiny-war-sheet-tabs">
      <button className="active"><Table2 size={15}/> Ditto</button>
      <span className="readonly-pill">Lecture seule</span>
    </div>
    <div className="shiny-war-readonly-summary">
      <span>{accounts.length} comptes</span>
      <span>{completedCharacters}/{accounts.length * SHINY_WAR_CHARACTERS_PER_ACCOUNT} personnages à 660</span>
      <strong>Total : {grandTotal.toLocaleString("fr-FR")}</strong>
    </div>
    <div className="shiny-war-table-wrap">
      <table className="shiny-war-table">
        <thead><tr>
          <th className="shiny-war-head-account">Compte</th>
          <th className="shiny-war-head-character">Personnage</th>
          <th className="shiny-war-head-ditto">Ditto</th>
          <th className="shiny-war-head-total">Total</th>
        </tr></thead>
        <tbody>
          {accounts.map((account, accountIndex) => {
            const accountTotal = account.characters.reduce((sum, character) => sum + character.ditto, 0);
            const accountComplete = account.characters.every((character) => character.ditto >= SHINY_WAR_DITTO_TARGET);
            const totalClass = accountComplete ? "target" : accountTotal === 0 ? "zero" : "progress";
            return account.characters.map((character, characterIndex) => {
              const dittoClass = character.ditto >= SHINY_WAR_DITTO_TARGET ? "target" : character.ditto === 0 ? "zero" : "progress";
              return <tr key={`readonly-${accountIndex}-${characterIndex}`} className={characterIndex === 2 ? "account-end" : ""}>
                {characterIndex === 0 && <td rowSpan={3} className="shiny-war-account-cell">
                  <span className="shiny-war-row-number">{String(accountIndex + 1).padStart(2, "0")}</span>
                  <div className="readonly-cell-value readonly-account-value">{account.account || `Compte ${accountIndex + 1}`}</div>
                </td>}
                <td className="shiny-war-character-cell"><div className="readonly-cell-value">{character.name || "—"}</div></td>
                <td className={`shiny-war-ditto-cell ${dittoClass}`}><div className="readonly-cell-value readonly-number">{character.ditto}</div></td>
                {characterIndex === 0 && <td rowSpan={3} className={`shiny-war-total-cell ${totalClass}`}>
                  <strong>{accountTotal.toLocaleString("fr-FR")}</strong>
                  <span>{accountComplete ? "3 / 3 à 660" : `${account.characters.filter((item) => item.ditto >= SHINY_WAR_DITTO_TARGET).length} / 3 à 660`}</span>
                </td>}
              </tr>;
            });
          })}
          <tr className="shiny-war-grand-total-row">
            <td colSpan={3}><strong>Total général</strong><span>Consultation de la feuille Alya Cloud</span></td>
            <td><strong>{grandTotal.toLocaleString("fr-FR")}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>;
}

function AvatarImage({ src, updatedAt, alt, fallbackSize }: { src: string | null; updatedAt: string; alt?: string; fallbackSize: number }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, updatedAt]);

  if (!src || failed) return <UserRound size={fallbackSize}/>;

  const resolved = `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(updatedAt)}`;
  return <img src={resolved} alt={alt ?? ""} onError={() => setFailed(true)} />;
}

function ProfileAvatar({ profile }: { profile: AlyaProfile }) {
  return <span className="staff-user-avatar"><AvatarImage src={profile.avatar_url} updatedAt={profile.updated_at} fallbackSize={20} /></span>;
}

function PrepaAlyaPage() {
  const [profiles, setProfiles] = useState<AlyaProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AlyaProfile | null>(null);
  const [sheet, setSheet] = useState<ShinyWarAccount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true); setError(null);
    try { setProfiles(await listAlyaProfiles()); }
    catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const openSheet = async (profile: AlyaProfile) => {
    setSelected(profile); setSheet(null); setSheetLoading(true); setError(null);
    try {
      const cloud = await loadCloudShinyWar(profile.id);
      setSheet(cloud ? normalizeShinyWarData(cloud) : null);
    } catch (err) { setError(String(err)); }
    finally { setSheetLoading(false); }
  };
  const filtered = sortProfilesByRole(profiles.filter((profile) => profile.username.toLocaleLowerCase("fr-FR").includes(search.trim().toLocaleLowerCase("fr-FR"))));

  if (selected) return <section className="staff-page">
    <header className="page-header staff-detail-header">
      <div>
        <button className="staff-back" onClick={() => { setSelected(null); setSheet(null); }}><ArrowLeft size={16}/> Retour aux utilisateurs</button>
        <p className="eyebrow">Prépa Alya · lecture seule</p>
        <div className="staff-title-row"><ProfileAvatar profile={selected}/><div><h1>{selected.username}</h1><RoleBadge role={selected.role}/></div></div>
      </div>
    </header>
    {error && <div className="auth-alert error"><span>{error.replace(/^Error:\s*/, "")}</span></div>}
    {sheetLoading ? <div className="staff-empty"><RefreshCw className="staff-spin" size={25}/><span>Chargement de la feuille…</span></div>
      : sheet ? <ReadonlyShinyWarSheet accounts={sheet}/>
      : <div className="staff-empty"><Table2 size={30}/><strong>Aucune feuille Shiny-War cloud</strong><span>Cet utilisateur n'a pas encore synchronisé de feuille.</span></div>}
  </section>;

  return <section className="staff-page">
    <header className="page-header">
      <div><p className="eyebrow">Équipe Alya</p><h1>Prépa Alya</h1><p>Consulte les feuilles Shiny-War des utilisateurs en lecture seule.</p></div>
      <button className="ghost" onClick={() => void refresh()} disabled={loading}><RefreshCw size={17}/> Actualiser</button>
    </header>
    <div className="staff-toolbar">
      <div className="staff-search"><Users size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un utilisateur…"/></div>
      <span className="staff-count">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</span>
    </div>
    {error && <div className="auth-alert error"><span>{error.replace(/^Error:\s*/, "")}</span></div>}
    {loading ? <div className="staff-empty"><RefreshCw className="staff-spin" size={25}/><span>Chargement des utilisateurs…</span></div> : <div className="staff-user-list">
      {filtered.map((profile) => <button className="staff-user-row" key={profile.id} onClick={() => void openSheet(profile)}>
        <ProfileAvatar profile={profile}/>
        <span className="staff-user-main"><strong>{profile.username}</strong><small>Compte Alya</small></span>
        <RoleBadge role={profile.role}/>
        <span className="staff-open-label">Voir la feuille →</span>
      </button>)}
      {filtered.length === 0 && <div className="staff-empty"><Users size={28}/><strong>Aucun utilisateur</strong><span>Aucun profil ne correspond à cette recherche.</span></div>}
    </div>}
  </section>;
}

function DevUserAdminPage({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: AlyaRole }) {
  const [profiles, setProfiles] = useState<AlyaProfile[]>([]);
  const [badges, setBadges] = useState<AlyaBadge[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [busyBadge, setBusyBadge] = useState<string | null>(null);
  const [badgeName, setBadgeName] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("✦");
  const [badgeColor, setBadgeColor] = useState("#9b7bdf");
  const [badgeImageFile, setBadgeImageFile] = useState<File | null>(null);
  const [badgeImagePreview, setBadgeImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<"users" | "event">("users");

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const [nextProfiles, nextBadges] = await Promise.all([listAlyaProfiles(), listAlyaBadges()]);
      setProfiles(nextProfiles);
      setBadges(nextBadges);
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!badgeImageFile) {
      setBadgeImagePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(badgeImageFile);
    setBadgeImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [badgeImageFile]);

  const canEditRole = (profile: AlyaProfile) => {
    if (profile.id === currentUserId) return false;
    if (currentUserRole === "DEV") return true;
    if (currentUserRole === "Gourou") return profile.role === "Admin" || profile.role === "user";
    return false;
  };

  const assignableRoles: AlyaRole[] = currentUserRole === "DEV"
    ? ["user", "Admin", "Gourou", "DEV"]
    : ["user", "Admin"];

  const changeRole = async (profile: AlyaProfile, role: AlyaRole) => {
    if (!canEditRole(profile) || profile.role === role) return;
    if (currentUserRole === "Gourou" && (role === "DEV" || role === "Gourou")) return;
    setBusyUser(profile.id); setError(null); setNotice(null);
    try {
      await setAlyaUserRole(profile.id, role);
      setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, role, updated_at: new Date().toISOString() } : item));
      setNotice(`${profile.username} est maintenant ${role === "Gourou" ? "GOUROU" : role}.`);
    } catch (err) { setError(String(err)); }
    finally { setBusyUser(null); }
  };

  const createBadge = async () => {
    const name = badgeName.trim();
    if (!name) return;
    setBusyBadge("create"); setError(null); setNotice(null);
    try {
      const uploadedImageUrl = badgeImageFile ? await uploadAlyaBadgeImage(badgeImageFile, name) : null;
      const created = await createAlyaBadge({ name, icon: badgeIcon.trim() || "✦", color: badgeColor, image_url: uploadedImageUrl });
      setBadges((current) => [...current, created]);
      setBadgeName("");
      setBadgeIcon("✦");
      setBadgeColor("#9b7bdf");
      setBadgeImageFile(null);
      setBadgeImagePreview(null);
      setNotice(uploadedImageUrl
        ? `Badge image « ${created.name} » créé. Sur le profil, seule l'image sera affichée et le nom apparaîtra au survol.`
        : `Badge « ${created.name} » créé.`);
    } catch (err) { setError(String(err)); }
    finally { setBusyBadge(null); }
  };

  const removeBadge = async (badge: AlyaBadge) => {
    if (!window.confirm(`Supprimer le badge « ${badge.name} » pour tous les joueurs ?`)) return;
    setBusyBadge(`delete:${badge.id}`); setError(null); setNotice(null);
    try {
      await deleteAlyaBadge(badge.id);
      setBadges((current) => current.filter((item) => item.id !== badge.id));
      setProfiles((current) => current.map((profile) => ({ ...profile, badges: profile.badges.filter((item) => item.id !== badge.id) })));
      window.dispatchEvent(new CustomEvent("alya-profile-refresh"));
      setNotice(`Badge « ${badge.name} » supprimé.`);
    } catch (err) { setError(String(err)); }
    finally { setBusyBadge(null); }
  };

  const toggleBadge = async (profile: AlyaProfile, badge: AlyaBadge) => {
    const assigned = profile.badges.some((item) => item.id === badge.id);
    const key = `${profile.id}:${badge.id}`;
    setBusyBadge(key); setError(null); setNotice(null);
    try {
      await setAlyaUserBadge(profile.id, badge.id, !assigned);
      setProfiles((current) => current.map((item) => {
        if (item.id !== profile.id) return item;
        const nextBadges = assigned
          ? item.badges.filter((currentBadge) => currentBadge.id !== badge.id)
          : [...item.badges, badge];
        return { ...item, badges: nextBadges, updated_at: new Date().toISOString() };
      }));
      if (profile.id === currentUserId) window.dispatchEvent(new CustomEvent("alya-profile-refresh"));
      setNotice(assigned ? `Badge « ${badge.name} » retiré à ${profile.username}.` : `Badge « ${badge.name} » attribué à ${profile.username}.`);
    } catch (err) { setError(String(err)); }
    finally { setBusyBadge(null); }
  };


  const moveAssignedBadge = async (profile: AlyaProfile, badgeId: string, direction: -1 | 1) => {
    const currentIndex = profile.badges.findIndex((badge) => badge.id === badgeId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= profile.badges.length) return;

    const nextBadges = [...profile.badges];
    const [moved] = nextBadges.splice(currentIndex, 1);
    nextBadges.splice(nextIndex, 0, moved);

    const key = `order:${profile.id}`;
    setBusyBadge(key); setError(null); setNotice(null);
    try {
      await setAlyaUserBadgeOrder(profile.id, nextBadges.map((badge) => badge.id));
      setProfiles((current) => current.map((item) => item.id === profile.id
        ? { ...item, badges: nextBadges, updated_at: new Date().toISOString() }
        : item));
      if (profile.id === currentUserId) window.dispatchEvent(new CustomEvent("alya-profile-refresh"));
      setNotice(`Ordre des badges de ${profile.username} enregistré.`);
    } catch (err) { setError(String(err)); }
    finally { setBusyBadge(null); }
  };

  const handleBadgeImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setBadgeImageFile(file);
    event.currentTarget.value = "";
  };

  const filtered = sortProfilesByRole(profiles.filter((profile) => profile.username.toLocaleLowerCase("fr-FR").includes(search.trim().toLocaleLowerCase("fr-FR"))));

  if (adminView === "event") {
    return <DashboardEventAdminPanel onBack={() => setAdminView("users")} />;
  }

  return <section className="staff-page dev-users-page">
    <header className="page-header">
      <div><p className="eyebrow">DEV · GOUROU</p><h1>Gestion utilisateurs</h1><p>Gère les rôles, les badges et les annonces globales ALYA selon ton niveau d'accès.</p></div>
      <div className="page-header-actions">
        <button className="ghost staff-event-tab-button" onClick={() => setAdminView("event")}><Megaphone size={17}/> Événement Dashboard</button>
        <button className="ghost" onClick={() => void refresh()} disabled={loading}><RefreshCw size={17}/> Actualiser</button>
      </div>
    </header>

    <div className="dev-badge-manager">
      <div className="dev-badge-manager-head">
        <div><strong>Badges joueurs</strong><span>Crée des badges visuels puis attribue-les aux joueurs ci-dessous.</span></div>
        <span className="staff-count">{badges.length} badge{badges.length > 1 ? "s" : ""}</span>
      </div>
      <div className="dev-badge-create">
        <input value={badgeName} maxLength={24} onChange={(event) => setBadgeName(event.target.value)} placeholder="Nom du badge" />
        <input className="dev-badge-icon-input" value={badgeIcon} maxLength={4} onChange={(event) => setBadgeIcon(event.target.value)} title="Emoji ou symbole" aria-label="Emoji du badge" />
        <label className="dev-badge-color"><input type="color" value={badgeColor} onChange={(event) => setBadgeColor(event.target.value)} /><span>{badgeColor.toUpperCase()}</span></label>
        <label className={`dev-badge-image-picker ${badgeImagePreview ? "has-image" : ""}`} title="Si tu ajoutes une image, le profil affichera uniquement cette image et le nom sera visible au survol.">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleBadgeImageChange} />
          {badgeImagePreview
            ? <span className="dev-badge-image-picker-preview"><img src={badgeImagePreview} alt="Prévisualisation du badge" /></span>
            : <span className="dev-badge-image-picker-placeholder"><ImageIcon size={14} />Image</span>}
          <span className="dev-badge-image-picker-label">{badgeImageFile ? badgeImageFile.name : "Image badge (optionnelle)"}</span>
          {badgeImageFile && <button type="button" className="dev-badge-image-clear" onClick={(event) => { event.preventDefault(); setBadgeImageFile(null); setBadgeImagePreview(null); }} title="Retirer l'image">×</button>}
        </label>
        <button className="primary compact" disabled={!badgeName.trim() || busyBadge === "create"} onClick={() => void createBadge()}><Plus size={15}/>{busyBadge === "create" ? "Création…" : "Créer"}</button>
      </div>
      <div className="dev-badge-create-note">Si une image est fournie, ce badge s'affichera sur le profil uniquement sous forme d'image. Son nom apparaîtra au survol de la souris.</div>
      <div className="dev-badge-catalog">
        {badges.map((badge) => <div className="dev-badge-catalog-item" key={badge.id}>
          <PlayerBadge badge={badge}/>
          <button className="dev-badge-delete" disabled={busyBadge === `delete:${badge.id}`} onClick={() => void removeBadge(badge)} title={`Supprimer ${badge.name}`} aria-label={`Supprimer ${badge.name}`}><X size={13}/></button>
        </div>)}
        {badges.length === 0 && <span className="dev-badge-empty">Aucun badge créé pour le moment.</span>}
      </div>
    </div>

    <div className="staff-toolbar">
      <div className="staff-search"><Users size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un utilisateur…"/></div>
      <span className="staff-count">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</span>
    </div>
    {error && <div className="auth-alert error"><span>{error.replace(/^Error:\s*/, "")}</span></div>}
    {notice && <div className="account-notice"><CheckCircle2 size={15}/>{notice}</div>}
    {loading ? <div className="staff-empty"><RefreshCw className="staff-spin" size={25}/><span>Chargement des utilisateurs…</span></div> : <div className="staff-user-list">
      {filtered.map((profile) => {
        const self = profile.id === currentUserId;
        return <div className="staff-user-row dev-user-row" key={profile.id}>
          <ProfileAvatar profile={profile}/>
          <span className="staff-user-main"><strong>{profile.username}</strong><small>{self ? `Ton compte ${currentUserRole === "Gourou" ? "GOUROU" : currentUserRole}` : "Compte ALYA"}</small></span>
          <RoleBadge role={profile.role}/>
          <label className="role-select-wrap">
            <span>Rôle</span>
            <select
              value={profile.role}
              disabled={!canEditRole(profile) || busyUser === profile.id}
              onChange={(event) => void changeRole(profile, event.target.value as AlyaRole)}
            >
              {!assignableRoles.includes(profile.role) && <option value={profile.role}>{profile.role === "Gourou" ? "GOUROU" : profile.role}</option>}
              {assignableRoles.map((role) => <option key={role} value={role}>{role === "Gourou" ? "GOUROU" : role}</option>)}
            </select>
          </label>
          <details className="dev-badge-dropdown">
            <summary>
              <span>Badges</span>
              <strong>{profile.badges.length}/{badges.length}</strong>
              <ChevronDown size={14}/>
            </summary>
            <div className="dev-badge-dropdown-panel">
              <div className="dev-badge-dropdown-head">
                <span>Badges de {profile.username}</span>
                <small>Clique pour attribuer ou retirer · utilise les flèches pour l'ordre d'affichage.</small>
              </div>
              <div className="dev-badge-assignment-list">
                {[...profile.badges, ...badges.filter((badge) => !profile.badges.some((assignedBadge) => assignedBadge.id === badge.id))].map((badge) => {
                  const assignedIndex = profile.badges.findIndex((item) => item.id === badge.id);
                  const assigned = assignedIndex >= 0;
                  const busy = busyBadge === `${profile.id}:${badge.id}` || busyBadge === `order:${profile.id}`;
                  const style = { "--player-badge-color": badge.color } as CSSProperties;
                  return <span className={`badge-assignment-entry ${assigned ? "assigned" : ""}`} key={badge.id}>
                    <button style={style} className={`badge-assignment-toggle ${assigned ? "active" : ""} ${badge.image_url ? "has-image" : ""}`} disabled={busy} onClick={() => void toggleBadge(profile, badge)} title={assigned ? `Retirer ${badge.name}` : `Attribuer ${badge.name}`}>
                      {badge.image_url
                        ? <span className="badge-assignment-image"><img src={badge.image_url} alt="" loading="lazy" /></span>
                        : <span>{badge.icon}</span>}
                      {badge.name}
                    </button>
                    {assigned && profile.badges.length > 1 && <span className="badge-order-controls" aria-label={`Ordre de ${badge.name}`}>
                      <button type="button" disabled={busy || assignedIndex === 0} onClick={() => void moveAssignedBadge(profile, badge.id, -1)} title={`Déplacer ${badge.name} vers la gauche`}><ChevronLeft size={12}/></button>
                      <button type="button" disabled={busy || assignedIndex === profile.badges.length - 1} onClick={() => void moveAssignedBadge(profile, badge.id, 1)} title={`Déplacer ${badge.name} vers la droite`}><ChevronRight size={12}/></button>
                    </span>}
                  </span>;
                })}
                {badges.length === 0 && <span className="dev-badge-empty">Crée d'abord un badge.</span>}
              </div>
            </div>
          </details>
        </div>;
      })}
    </div>}
    <p className="dev-role-note">Hiérarchie : DEV &gt; GOUROU &gt; ADMIN &gt; user. Ton propre rôle n'est jamais modifiable ici. Un GOUROU peut gérer les badges et les comptes ADMIN/user, mais ne peut ni créer/promouvoir un DEV ou un GOUROU, ni modifier un compte DEV/GOUROU.</p>
  </section>;
}

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={`pill ${ok ? "pill-ok" : "pill-warn"}`}>{children}</span>;
}

function App() {
  const auth = useAlyaAuth();
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
  const [pageBackgrounds, setPageBackgrounds] = useState<Partial<Record<CustomizableBackgroundTab, PageBackgroundAssetId>>>(() => readPageBackgroundPreferences());
  const [backgroundPickerTab, setBackgroundPickerTab] = useState<CustomizableBackgroundTab | null>(null);
  const [gymRerunBackgroundVideo, setGymRerunBackgroundVideo] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const cloudPreferencesAppliedRef = useRef<string | null>(null);
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
    if (!kind || customizeOpen || backgroundPickerTab) {
      void api.hideEmbeddedWebviews().catch(() => undefined);
      return;
    }

    let frame = 0;
    let disposed = false;
    let embeddedSyncInFlight = false;
    let embeddedSyncQueued = false;
    const host = embeddedHostRef.current;
    if (!host) return;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed || !embeddedHostRef.current) return;
        const rect = embeddedHostRef.current.getBoundingClientRect();
        if (rect.width < 160 || rect.height < 160) return;
        if (embeddedSyncInFlight) {
          embeddedSyncQueued = true;
          return;
        }
        embeddedSyncInFlight = true;
        void api.showEmbeddedWebview(kind, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
          .catch((error) => notify("error", `${kind} : ${String(error)}`))
          .finally(() => {
            embeddedSyncInFlight = false;
            if (embeddedSyncQueued && !disposed) {
              embeddedSyncQueued = false;
              sync();
            }
          });
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
  }, [tab, customizeOpen, backgroundPickerTab, settings.vanity_url]);

  useEffect(() => {
    if (!auth.session) cloudPreferencesAppliedRef.current = null;
  }, [auth.session]);

  useEffect(() => {
    if (!auth.session || !auth.profile || !state) return;
    const userId = auth.session.user.id;
    if (cloudPreferencesAppliedRef.current === userId) return;
    cloudPreferencesAppliedRef.current = userId;

    const cloud = auth.profile.preferences ?? {};
    const hasCloudPreferences = Object.keys(cloud).length > 0;
    if (hasCloudPreferences) {
      const merged: Settings = {
        ...settings,
        ...cloud,
        pokemmo_dir: settings.pokemmo_dir,
        rom_path: settings.rom_path,
      };
      setSettings(merged);
      void api.saveSettings(merged).then((next) => setState(next)).catch(() => undefined);
    } else {
      void saveCloudPreferences(userId, cloudPreferencesFromSettings(settings)).catch(() => undefined);
    }
  }, [auth.session?.user.id, auth.profile?.updated_at, state !== null]);

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
    const normalized = { ...EMPTY_SETTINGS, ...next.settings };
    setSettings(normalized);
    setState(next);
    if (auth.session) {
      void saveCloudPreferences(auth.session.user.id, cloudPreferencesFromSettings(normalized)).catch(() => undefined);
    }
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
      // Tauri va quitter ALYA Companion automatiquement.
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

  const openBackgroundPicker = (targetTab: CustomizableBackgroundTab) => {
    setCustomizeOpen(false);
    void api.hideEmbeddedWebviews().catch(() => undefined);
    setBackgroundPickerTab(targetTab);
  };

  const selectPageBackground = (targetTab: CustomizableBackgroundTab, assetId: PageBackgroundAssetId) => {
    setPageBackgrounds((current) => {
      const next = { ...current, [targetTab]: assetId };
      try { localStorage.setItem(PAGE_BACKGROUND_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setBackgroundPickerTab(null);
  };

  const resetPageBackground = (targetTab: CustomizableBackgroundTab) => {
    setPageBackgrounds((current) => {
      const next = { ...current };
      delete next[targetTab];
      try { localStorage.setItem(PAGE_BACKGROUND_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setBackgroundPickerTab(null);
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

  const toggleDashboardModule = async (id: DashboardModuleId) => {
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

  useEffect(() => {
    const role = auth.profile?.role;
    if (tab === "prepa" && role !== "Admin" && role !== "Gourou" && role !== "DEV") setTab("dashboard");
    if (tab === "user-admin" && role !== "Gourou" && role !== "DEV") setTab("dashboard");
  }, [tab, auth.profile?.role]);

  const theme = state?.theme_status;
  const activePatch = state?.surf_state.active_patch_name ?? "ROM d'origine / inconnu";
  const hiddenTabs = settings.hidden_tabs ?? [];
  const tabOrder = useMemo(() => normalizedTabOrder(settings.tab_order), [settings.tab_order]);
  const nav = useMemo(() => tabOrder.map((id) => NAV_ITEMS.find(([itemId]) => itemId === id)!).filter(([id]) => id === "dashboard" || !hiddenTabs.includes(id)), [tabOrder, hiddenTabs]);
  const dashboardModules = (settings.dashboard_modules ?? ["theme", "surf", "rotations"]).filter(
    (id): id is DashboardModuleId => id !== "dashboard" && NAV_ITEMS.some(([itemId]) => itemId === id),
  );
  const appStyle = { "--accent": settings.accent_color || "#9b7bdf" } as CSSProperties;
  const alyaRole: AlyaRole = auth.profile?.role ?? "user";
  const canAccessPrepa = alyaRole === "Admin" || alyaRole === "Gourou" || alyaRole === "DEV";
  const canManageRoles = alyaRole === "Gourou" || alyaRole === "DEV";
  const activeBackgroundTab = isCustomizableBackgroundTab(tab) ? tab : null;
  const activeBackgroundAssetId = activeBackgroundTab
    ? pageBackgrounds[activeBackgroundTab] ?? DEFAULT_PAGE_BACKGROUNDS[activeBackgroundTab]
    : null;
  const activeBackgroundAsset = activeBackgroundAssetId ? pageBackgroundAssetById(activeBackgroundAssetId) : null;
  const activeBackgroundOverlay = activeBackgroundTab ? PAGE_BACKGROUND_OVERLAYS[activeBackgroundTab] : null;
  const gymRerunUsesDynamicVideo = tab === "gymrerun" && Boolean(gymRerunBackgroundVideo);
  const contentBackgroundStyle = gymRerunUsesDynamicVideo
    ? { backgroundImage: "none" }
    : activeBackgroundAsset && activeBackgroundOverlay
      ? activeBackgroundAsset.kind === "image"
        ? { backgroundImage: `${activeBackgroundOverlay}, url("${activeBackgroundAsset.src}")` }
        : { backgroundImage: "none" }
      : undefined;

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

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} style={appStyle}>
      <BerriesTimerWatcher />
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <img className="brand-mark" src={alyaIcon} alt="Logo ALYA Companion" />
            <div className="brand-copy"><strong>ALYA Companion</strong></div>
          </div>
        </div>
        <div className="sidebar-scroll">
          <SidebarGroupedNav
            items={nav}
            activeTab={tab}
            collapsed={sidebarCollapsed}
            onSelect={(id) => setTab(id as SidebarTab)}
          />
        </div>
        <div className="sidebar-foot">
          {auth.profile && <button className="sidebar-profile" onClick={() => { auth.clearError(); setAccountOpen(true); }} title="Compte ALYA Companion">
            <span className="sidebar-profile-avatar"><AvatarImage src={auth.profile.avatar_url} updatedAt={auth.profile.updated_at} fallbackSize={17} /></span>
            <span className="sidebar-profile-copy"><strong>{auth.profile.username}</strong><span className="sidebar-profile-meta"><RoleBadge role={auth.profile.role}/><SidebarBadges badges={auth.profile.badges}/></span></span>
          </button>}
          <div className="sidebar-tool-row">
            <button className={`customize-trigger ${customizeOpen ? "active" : ""}`} onClick={() => setCustomizeOpen((value) => !value)} title="Personnaliser ALYA Companion" aria-label="Personnaliser ALYA Companion">
              <Wrench size={18} />
            </button>
            <button
              className={`sidebar-settings-trigger ${tab === "settings" ? "active" : ""}`}
              onClick={() => { setCustomizeOpen(false); setTab("settings"); }}
              title="Settings"
              aria-label="Ouvrir Settings"
            >
              <SettingsIcon size={18} />
            </button>
            {canAccessPrepa && <button
              className={`sidebar-prepa-trigger ${tab === "prepa" ? "active" : ""}`}
              onClick={() => { setCustomizeOpen(false); setTab("prepa"); }}
              title="Prépa Alya"
              aria-label="Ouvrir Prépa Alya"
            >
              <ClipboardList size={18} />
            </button>}
            {canManageRoles && <button
              className={`sidebar-dev-trigger ${tab === "user-admin" ? "active" : ""}`}
              onClick={() => { setCustomizeOpen(false); setTab("user-admin"); }}
              title="Gestion utilisateurs DEV / GOUROU"
              aria-label="Ouvrir la gestion utilisateurs DEV / GOUROU"
            >
              <Shield size={18} />
            </button>}
          </div>
          <StatusPill ok={Boolean(state?.pokemmo_detected)}>
            {state?.pokemmo_detected ? "PokeMMO détecté" : "PokeMMO non configuré"}
          </StatusPill>
          {state?.pokemmo_running && <span className="running-warning">PokeMMO est ouvert — modifications bloquées</span>}
          <span className="app-version">ALYA Companion {companionUpdate?.current_version ?? "1.0.0-rc.4"}{companionUpdate?.development_build ? " DEV" : ""}</span>
        </div>
      </aside>
      <div className="sidebar-divider">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((value) => !value)}
          title={sidebarCollapsed ? "Rouvrir la sidebar" : "Replier la sidebar"}
          aria-label={sidebarCollapsed ? "Rouvrir la sidebar" : "Replier la sidebar"}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <main
        className={`content ${tab === "dashboard" ? "dashboard-content" : ""} ${tab === "shinywar" ? "shinywar-content" : ""} ${tab === "surf" ? "surf-content" : ""} ${tab === "theme" ? "theme-content" : ""} ${tab === "rotations" ? "rotations-content" : ""} ${tab === "gymrerun" ? "gym-rerun-content" : ""} ${tab === "raids" ? "raid-content" : ""} ${tab === "berries" ? "berries-content" : ""} ${tab === "mods" ? "mods-content" : ""} ${tab === "settings" ? "settings-content" : ""} ${tab === "prepa" || tab === "user-admin" ? "staff-content" : ""} ${EXTERNAL_TABS[tab] ? "external-content" : ""}`}
        style={contentBackgroundStyle}
      >
        {tab === "dashboard" && <video className="dashboard-media" src={dashboardBackground} autoPlay loop muted playsInline aria-hidden="true" />}
        {gymRerunUsesDynamicVideo && gymRerunBackgroundVideo && <div className="gym-rerun-dynamic-background" aria-hidden="true">
          <video key={gymRerunBackgroundVideo} src={gymRerunBackgroundVideo} autoPlay loop muted playsInline />
          <div className="gym-rerun-dynamic-shade" style={{ background: PAGE_BACKGROUND_OVERLAYS.gymrerun }} />
        </div>}
        {!gymRerunUsesDynamicVideo && activeBackgroundAsset?.kind === "video" && activeBackgroundOverlay && <>
          <video className="page-background-video" src={activeBackgroundAsset.src} autoPlay loop muted playsInline aria-hidden="true" />
          <div className="page-background-video-shade" style={{ background: activeBackgroundOverlay }} aria-hidden="true" />
        </>}
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
                <div><CloudDownload size={19}/><span><strong>ALYA Companion {companionUpdate.latest_version}</strong> est disponible.</span></div>
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
            <DashboardEventWidget />
            <div className="hero-card">
              <div><span className="kicker">ALYA Companion</span><h2>Un seul endroit pour tes outils PokeMMO.</h2><p>Thème AlyArchetype, Surf Manager, Vanity, Shiny-War, rotations légendaires, Shinyboard, Poképédia, Pokébip et forum dans une seule application.</p></div>
              <div className="hero-orb"><img src={alyaIcon} alt="" /></div>
            </div>
            <div className="grid three dashboard-modules-grid">
              {dashboardModules.includes("theme") && <article className="card">
                <div className="card-title"><Sparkles size={18} /><span>AlyArchetype</span></div>
                <strong className="big-value">{theme?.local_version ?? "Non détecté"}</strong>
                <p>{theme?.latest_version ? `Dernière release : ${theme.latest_version}` : "Source : Jimbowiii/AlyArchetype · AlyArchetype.zip"}</p>
                {theme && <StatusPill ok={Boolean(theme.local_version) && !theme.update_available}>{!theme.local_version ? "Installation disponible" : theme.update_available ? "Mise à jour disponible" : "À jour"}</StatusPill>}
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
                <p>Prévisualise les cosmétiques directement dans ALYA Companion.</p>
                <button className="text-button" onClick={() => setTab("vanity")}>Ouvrir Vanity →</button>
              </article>}
              {dashboardModules.includes("shinyboard") && <article className="card">
                <div className="card-title"><Gem size={18} /><span>Shinyboard</span></div>
                <strong className="big-value">Dashboard</strong>
                <p>Accède à ton suivi Shinyboard directement depuis l'application.</p>
                <button className="text-button" onClick={() => setTab("shinyboard")}>Ouvrir Shinyboard →</button>
              </article>}
              {dashboardModules.includes("shinywar") && <article className="card">
                <div className="card-title"><Table2 size={18} /><span>Shiny-War</span></div>
                <strong className="big-value">Feuille Ditto</strong>
                <p>Suivi des comptes, personnages et Ditto avec totaux automatiques.</p>
                <button className="text-button" onClick={() => setTab("shinywar")}>Ouvrir Shiny-War →</button>
              </article>}
              {dashboardModules.includes("forum") && <article className="card">
                <div className="card-title"><MessagesSquare size={18} /><span>Forum</span></div>
                <strong className="big-value">PokeMMO</strong>
                <p>Consulte le forum officiel sans quitter ALYA Companion.</p>
                <button className="text-button" onClick={() => setTab("forum")}>Ouvrir le forum →</button>
              </article>}
              {dashboardModules
                .filter((id) => !["theme", "surf", "rotations", "vanity", "shinyboard", "shinywar", "forum"].includes(id))
                .map((id) => {
                  const item = NAV_ITEMS.find(([itemId]) => itemId === id);
                  if (!item) return null;
                  const [, label, Icon] = item;
                  return <article className="card" key={`dashboard-${id}`}>
                    <div className="card-title"><Icon size={18} /><span>{label}</span></div>
                    <strong className="big-value">{label}</strong>
                    <p>Module ALYA Companion.</p>
                    <button className="text-button" onClick={() => setTab(id)}>Ouvrir {label} →</button>
                  </article>;
                })}
              {dashboardModules.length === 0 && <div className="dashboard-empty-modules"><Pencil size={20}/><span>Aucun module sélectionné. Utilise le crayon pour personnaliser le Dashboard.</span></div>}
            </div>
          </section>
        )}

        {tab === "theme" && <ThemePage theme={theme} busy={busy} configured={Boolean(settings.pokemmo_dir)} onEditBackground={() => openBackgroundPicker("theme")} onRefresh={() => run("theme-refresh", async () => {
          const refreshed = await api.refreshTheme();
          setState((current) => current ? { ...current, theme_status: refreshed } : current);
        }, "Release AlyArchetype vérifiée.", false)} onUpdate={() => run("theme-update", api.updateTheme, "AlyArchetype mis à jour.").then(() => refreshCompanionUpdate().catch(() => undefined))} onRestore={() => run("theme-restore", api.restoreTheme, "Backup AlyArchetype restauré.")} />}

        {tab === "surf" && (
          <section className="surf-page">
            <header className="page-header"><div><p className="eyebrow">ROM Patching</p><h1>Surf Manager</h1><p>Chaque patch repart du backup de la ROM originale afin d'éviter d'empiler les modifications.</p></div><div className="page-header-actions"><PageBackgroundButton tabLabel="Surf Manager" onClick={() => openBackgroundPicker("surf")} /></div></header>
            {state?.pokemmo_running && <div className="warning-box"><XCircle size={19} /><div><strong>PokeMMO est ouvert.</strong><span>Ferme le jeu avant d'appliquer ou restaurer une ROM.</span></div></div>}
            <div className="card current-surf"><span>Surf actif</span><strong>{activePatch}</strong><small>{state?.surf_state.rom_sha256 ? `SHA-256 : ${state.surf_state.rom_sha256.slice(0, 20)}…` : "Hash non disponible"}</small></div>
            <div className="patch-grid">
              {patches.length === 0 ? <div className="empty-state"><ShipWheel size={32} /><h3>Patches intégrés introuvables</h3><p>Réinstalle ALYA Companion : le catalogue Surf fait désormais partie de l'application.</p></div> : patches.map((patch) => (
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

        {tab === "vanity" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Cosmetics" title="Vanity Preview" description="Le Vanity Booth est chargé directement dans ALYA Companion." source="Crimson Core MMO — Vanity Booth" onEditBackground={() => openBackgroundPicker("vanity")} onReload={() => run("vanity-reload", () => api.reloadEmbeddedWebview("vanity"), undefined, false)} />}
        {tab === "shinyboard" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Shiny hunting" title="Shinyboard" description="Dashboard Shinyboard intégré directement à ALYA Companion." source="shinyboard.net/dashboard" onEditBackground={() => openBackgroundPicker("shinyboard")} onReload={() => run("shinyboard-reload", () => api.reloadEmbeddedWebview("shinyboard"), undefined, false)} />}
        {tab === "pokepedia" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Encyclopédie Pokémon" title="Poképédia" description="L’encyclopédie Pokémon francophone directement dans ALYA Companion." source="pokepedia.fr" onEditBackground={() => openBackgroundPicker("pokepedia")} onReload={() => run("pokepedia-reload", () => api.reloadEmbeddedWebview("pokepedia"), undefined, false)} />}
        {tab === "pokebip" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Actualité & Pokédex" title="Pokébip" description="Actualités, Pokédex, dossiers et outils Pokébip directement dans ALYA Companion." source="pokebip.com" onEditBackground={() => openBackgroundPicker("pokebip")} onReload={() => run("pokebip-reload", () => api.reloadEmbeddedWebview("pokebip"), undefined, false)} />}
        {tab === "forum" && <ExternalWebviewPage hostRef={embeddedHostRef} eyebrow="Community" title="Forum PokeMMO" description="Le forum officiel PokeMMO intégré dans ALYA Companion." source="forums.pokemmo.com" onEditBackground={() => openBackgroundPicker("forum")} onReload={() => run("forum-reload", () => api.reloadEmbeddedWebview("forum"), undefined, false)} />}
        {tab === "shinywar" && <ShinyWarPage userId={auth.session.user.id} onEditBackground={() => openBackgroundPicker("shinywar")} />}
        {tab === "gymrerun" && <GymRerunPage onEditBackground={() => openBackgroundPicker("gymrerun")} onBackgroundVideoChange={setGymRerunBackgroundVideo} />}
        {tab === "raids" && <RaidsPage onEditBackground={() => openBackgroundPicker("raids")} />}
        {tab === "berries" && <BerriesPage onEditBackground={() => openBackgroundPicker("berries")} />}
        {tab === "mods" && <ModsPage pokemmoDir={settings.pokemmo_dir} pokemmoRunning={Boolean(state?.pokemmo_running)} onEditBackground={() => openBackgroundPicker("mods")} />}
        {tab === "stream" && <StreamPage onEditBackground={() => openBackgroundPicker("stream")} />}
        {tab === "rotations" && <RotationsPage onEditBackground={() => openBackgroundPicker("rotations")} />}
        {tab === "prepa" && canAccessPrepa && <PrepaAlyaPage />}
        {tab === "user-admin" && canManageRoles && <DevUserAdminPage currentUserId={auth.session.user.id} currentUserRole={alyaRole} />}

        {tab === "settings" && (
          <section className="settings-page">
            <header className="page-header"><div><p className="eyebrow">Configuration</p><h1>Settings</h1><p>Configure les chemins locaux et les services utilisés par ALYA Companion.</p></div></header>
            <div className="settings-card">
              <h2>PokeMMO & ROM</h2>
              <PathField label="Dossier PokeMMO" value={settings.pokemmo_dir} placeholder="C:\\Games\\PokeMMO" onChange={(v) => setSettings((s) => ({ ...s, pokemmo_dir: v }))} onBrowse={() => void pickDirectory("pokemmo_dir")} />
              <PathField label="ROM Pokémon Blanc/Noir" value={settings.rom_path} placeholder="C:\\...\\Pokemon White.nds" onChange={(v) => setSettings((s) => ({ ...s, rom_path: v }))} onBrowse={() => void pickFile("rom_path")} />
              <p className="settings-note">Les patches Surf et xdelta3 sont intégrés à ALYA Companion : l'utilisateur n'a aucune dépendance externe à installer.</p>
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
                <div><h2>ALYA Companion</h2><p className="settings-note">Les prochaines versions peuvent être installées depuis l'application, sans sources, npm ni PowerShell.</p></div>
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
              ) : companionUpdate?.latest_version ? <StatusPill ok={true}>ALYA Companion est à jour</StatusPill> : null}
            </div>
            <div className="settings-card"><h2>Vanity</h2><TextField label="URL du booth" value={settings.vanity_url} onChange={(v) => setSettings((s) => ({ ...s, vanity_url: v }))} /></div>
            <div className="action-row"><button className="primary" disabled={Boolean(busy)} onClick={() => void saveSettings()}><Save size={17} /> {busy === "settings" ? "Enregistrement…" : "Enregistrer"}</button></div>
          </section>
        )}
      </main>

      {accountOpen && auth.profile && <AccountModal
        email={auth.session.user.email ?? ""}
        profile={auth.profile}
        error={auth.error}
        onClose={() => setAccountOpen(false)}
        onUpdateUsername={auth.updateUsername}
        onUpdateAvatar={auth.updateAvatar}
        onSignOut={async () => { setAccountOpen(false); await auth.signOut(); }}
      />}

      {backgroundPickerTab && (
        <PageBackgroundPicker
          tab={backgroundPickerTab}
          currentAssetId={pageBackgrounds[backgroundPickerTab] ?? DEFAULT_PAGE_BACKGROUNDS[backgroundPickerTab]}
          onSelect={(assetId) => selectPageBackground(backgroundPickerTab, assetId)}
          onReset={() => resetPageBackground(backgroundPickerTab)}
          onClose={() => setBackgroundPickerTab(null)}
        />
      )}

      {customizeOpen && (
        <div className="customizer-panel" role="dialog" aria-label="Personnaliser ALYA Companion">
          <div className="customizer-head"><div><span className="eyebrow">Interface</span><h2>Personnaliser</h2></div><button className="icon-button" onClick={() => setCustomizeOpen(false)} title="Fermer"><X size={17}/></button></div>
          <div className="customizer-section">
            <SidebarCategoryCustomizer />
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

function PageBackgroundButton({ tabLabel, onClick }: { tabLabel: string; onClick: () => void }) {
  return <button
    type="button"
    className="icon-button page-background-trigger"
    onClick={onClick}
    title={`Changer le fond de ${tabLabel}`}
    aria-label={`Changer le fond de ${tabLabel}`}
  >
    <Pencil size={16} />
  </button>;
}

function PageBackgroundPicker({
  tab,
  currentAssetId,
  onSelect,
  onReset,
  onClose,
}: {
  tab: CustomizableBackgroundTab;
  currentAssetId: PageBackgroundAssetId;
  onSelect: (assetId: PageBackgroundAssetId) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const tabLabel = NAV_ITEMS.find(([id]) => id === tab)?.[1] ?? tab;
  const defaultAssetId = DEFAULT_PAGE_BACKGROUNDS[tab];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="page-background-picker-backdrop" onMouseDown={onClose}>
    <section className="page-background-picker" role="dialog" aria-modal="true" aria-label={`Choisir le fond de ${tabLabel}`} onMouseDown={(event) => event.stopPropagation()}>
      <div className="page-background-picker-head">
        <div><p className="eyebrow">Apparence</p><h2>Fond · {tabLabel}</h2><p>Choisis un fond parmi les assets intégrés à ALYA Companion.</p></div>
        <button type="button" className="icon-button" onClick={onClose} title="Fermer" aria-label="Fermer"><X size={17}/></button>
      </div>
      <div className="page-background-grid">
        {PAGE_BACKGROUND_ASSETS.map((asset) => {
          const selected = currentAssetId === asset.id;
          return <button
            type="button"
            key={asset.id}
            className={`page-background-card ${selected ? "selected" : ""}`}
            onClick={() => onSelect(asset.id)}
            aria-pressed={selected}
          >
            <span className="page-background-preview">
              {asset.kind === "video"
                ? <video src={asset.src} autoPlay loop muted playsInline aria-hidden="true" />
                : <img src={asset.src} alt="" />}
              <span className="page-background-preview-shade" />
              {selected && <span className="page-background-selected"><CheckCircle2 size={16}/> Actuel</span>}
            </span>
            <span className="page-background-card-copy">
              <strong>{asset.label}</strong>
              <small>{asset.id === defaultAssetId ? "Fond par défaut de cet onglet" : asset.kind === "video" ? "Fond animé" : "Fond image"}</small>
            </span>
          </button>;
        })}
      </div>
      <div className="page-background-picker-foot">
        <span>Le choix est enregistré localement pour cet onglet.</span>
        <button type="button" className="ghost" onClick={onReset}>Réinitialiser le fond</button>
      </div>
    </section>
  </div>;
}

function ExternalWebviewPage({ hostRef, eyebrow, title, description, source, onReload, onEditBackground }: { hostRef: React.RefObject<HTMLDivElement | null>; eyebrow: string; title: string; description: string; source: string; onReload: () => void; onEditBackground: () => void }) {
  return <section className="embedded-page">
    <header className="page-header embedded-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      <div className="page-header-actions">
        <PageBackgroundButton tabLabel={title} onClick={onEditBackground} />
        <button className="ghost" onClick={onReload}><RefreshCw size={17}/> Recharger</button>
      </div>
    </header>
    <div ref={hostRef} className="embedded-webview-host" aria-label={`${title} intégré`}>
      <div className="embedded-loading"><RefreshCw size={22}/><span>Chargement de {title}…</span></div>
    </div>
    <div className="embedded-source">Source : <strong>{source}</strong> · le contenu reste chargé depuis le site d'origine.</div>
  </section>;
}

function RotationsPage({ onEditBackground }: { onEditBackground: () => void }) {
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
      <div className="page-header-actions">
        <PageBackgroundButton tabLabel="Rotations" onClick={onEditBackground} />
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
      </div>
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

function ThemePage({ theme, busy, configured, onRefresh, onUpdate, onRestore, onEditBackground }: { theme: ThemeStatus | null | undefined; busy: string | null; configured: boolean; onRefresh: () => void; onUpdate: () => void; onRestore: () => void; onEditBackground: () => void }) {
  const localVersion = theme?.local_version ?? null;
  const latestVersion = theme?.latest_version ?? null;
  const sameVersion = Boolean(localVersion && latestVersion && localVersion === latestVersion);
  const actionLabel = !localVersion
    ? latestVersion ? `Installer ${latestVersion}` : "Installer"
    : sameVersion
      ? `Réinstaller ${latestVersion}`
      : latestVersion ? `Mettre à jour vers ${latestVersion}` : "Mettre à jour";
  const busyLabel = !localVersion ? "Installation…" : sameVersion ? "Réinstallation…" : "Mise à jour…";

  return <section className="theme-page">
    <header className="page-header"><div><p className="eyebrow">GitHub Releases</p><h1>AlyArchetype</h1><p>Même logique que ton updater actuel : version.txt + info.xml, release Jimbowiii/AlyArchetype, asset AlyArchetype.zip et backup unique dans data/mods.</p></div><div className="page-header-actions"><PageBackgroundButton tabLabel="AlyArchetype" onClick={onEditBackground} /><button className="ghost" disabled={!configured || Boolean(busy)} onClick={onRefresh}><RefreshCw size={17}/> Vérifier</button></div></header>
    {!configured ? <div className="empty-state"><CloudDownload size={32}/><h3>Configuration requise</h3><p>Renseigne uniquement le dossier principal de PokeMMO dans Settings.</p></div> : <>
      <div className="version-row">
        <div className="version-card"><span>Installée</span><strong>{localVersion ?? "Non installé"}</strong></div>
        <div className="version-arrow">→</div>
        <div className="version-card accent"><span>Dernière release</span><strong>{latestVersion ?? "—"}</strong></div>
      </div>
      <div className="card changelog"><div className="card-title"><CloudDownload size={18}/><span>{theme?.release_name ?? "Release notes"}</span></div><pre>{theme?.changelog ?? "Clique sur Vérifier pour charger la dernière release."}</pre>{theme?.published_at && <small>Publiée : {new Date(theme.published_at).toLocaleString("fr-FR")}</small>}</div>
      <div className="action-row"><button className="primary" disabled={!latestVersion || Boolean(busy)} onClick={onUpdate}><CloudDownload size={17}/> {busy === "theme-update" ? busyLabel : actionLabel}</button><button className="ghost" disabled={Boolean(busy) || !theme?.backup_available} onClick={onRestore}><RotateCcw size={17}/> Restaurer AlyArchetype.backup.zip</button></div>
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
