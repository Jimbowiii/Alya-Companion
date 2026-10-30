import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  SlidersHorizontal,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { listAlyaProfiles, loadCloudShinyWar, setAlyaUserRole } from "./shared/auth";
import type { MobileTab } from "./MobileSidebar";
import {
  createBadge,
  deleteBadge,
  disableDashboardEventAdmin,
  loadBadgeAdminData,
  loadDashboardEventAdmin,
  saveDashboardEventAdmin,
  setBadgeAssignment,
  type MobileBadge,
  type MobileDashboardEvent,
} from "./mobileAdminData";

import { ReadonlyShinyWarBundle } from "./ReadonlyShinyWarBundle";
export type MobileUtilityMode = "customize" | "settings" | "prepa" | "users";

export const MOBILE_SIDEBAR_PREFS_KEY = "alya-mobile-sidebar-prefs-v2";
export const MOBILE_SIDEBAR_PREFS_EVENT = "alya-mobile-sidebar-prefs-changed";

export type MobileSidebarPrefs = { order: string[]; hidden: string[] };
const DEFAULT_ORDER = ["home", "money", "utilities", "shinywars"];

export function readMobileSidebarPrefs(): MobileSidebarPrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(MOBILE_SIDEBAR_PREFS_KEY) ?? "{}") as Partial<MobileSidebarPrefs>;
    const order = Array.isArray(parsed.order) ? parsed.order.filter((x): x is string => typeof x === "string") : [];
    const normalized = [...order.filter((id, i) => DEFAULT_ORDER.includes(id) && order.indexOf(id) === i)];
    for (const id of DEFAULT_ORDER) if (!normalized.includes(id)) normalized.push(id);
    const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((x): x is string => typeof x === "string" && x !== "home") : [];
    return { order: normalized, hidden };
  } catch { return { order: [...DEFAULT_ORDER], hidden: [] }; }
}

export function saveMobileSidebarPrefs(prefs: MobileSidebarPrefs) {
  localStorage.setItem(MOBILE_SIDEBAR_PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(MOBILE_SIDEBAR_PREFS_EVENT));
}

type CloudProfile = { id: string; username: string; avatar_url?: string | null; role: string };
type ShinyCharacter = { name: string; ditto: number };
type ShinyAccount = { account: string; characters: ShinyCharacter[] };

const roleRank = (role: string) => {
  const value = role.toLowerCase();
  if (value === "dev") return 0;
  if (value === "gourou") return 1;
  if (value === "admin") return 2;
  return 3;
};

function normalizeProfiles(rows: unknown) {
  return ((Array.isArray(rows) ? rows : []) as CloudProfile[]).slice().sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.username.localeCompare(b.username));
}

function normalizeShiny(raw: unknown): ShinyAccount[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const characters = Array.isArray(row.characters) ? row.characters : [];
    return {
      account: typeof row.account === "string" ? row.account : `Compte ${index + 1}`,
      characters: characters.slice(0, 3).map((char, child) => {
        const value = char && typeof char === "object" ? char as Record<string, unknown> : {};
        return { name: typeof value.name === "string" ? value.name : `Personnage ${child + 1}`, ditto: Math.max(0, Number(value.ditto) || 0) };
      }),
    };
  });
}

function RoleChip({ role }: { role: string }) {
  return <span className={`mobile-role-chip role-${role.toLowerCase()}`}>{role.toUpperCase()}</span>;
}

function ProfileAvatar({ profile }: { profile: CloudProfile }) {
  return <div className="mobile-cloud-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : profile.username.slice(0, 1).toUpperCase()}</div>;
}

export function MobileUtilityPanel({ mode, role, currentUserId, onClose, onNavigate }: {
  mode: MobileUtilityMode | null;
  role: string;
  currentUserId: string;
  onClose: () => void;
  onNavigate: (tab: MobileTab) => void;
}) {
  if (!mode) return null;
  return <div className="mobile-utility-overlay" role="dialog" aria-modal="true">
    <button className="mobile-utility-backdrop" onClick={onClose} aria-label="Fermer" />
    <section className="mobile-utility-panel">
      <header><div><small>ALYA MOBILE</small><h2>{mode === "customize" ? "Personnaliser" : mode === "settings" ? "Settings" : mode === "prepa" ? "Prépa Alya" : "DEV · GOUROU"}</h2></div><button onClick={onClose} aria-label="Fermer"><X size={20}/></button></header>
      <div className="mobile-utility-content">
        {mode === "customize" && <CustomizeMobile />}
        {mode === "settings" && <SettingsMobile onNavigate={(tab) => { onNavigate(tab); onClose(); }} />}
        {mode === "prepa" && <PrepaMobile currentUserId={currentUserId} />}
        {mode === "users" && <UsersMobile role={role} currentUserId={currentUserId} />}
      </div>
    </section>
  </div>;
}

function CustomizeMobile() {
  const [prefs, setPrefs] = useState<MobileSidebarPrefs>(readMobileSidebarPrefs);
  const labels: Record<string, string> = { home: "Accueil", money: "Make Big Money", utilities: "Utilities", shinywars: "Shiny-Wars" };
  const commit = (next: MobileSidebarPrefs) => { setPrefs(next); saveMobileSidebarPrefs(next); };
  const move = (id: string, delta: number) => { const index = prefs.order.indexOf(id); const target = index + delta; if (index < 0 || target < 0 || target >= prefs.order.length) return; const order = [...prefs.order]; [order[index], order[target]] = [order[target], order[index]]; commit({ ...prefs, order }); };
  const toggle = (id: string) => { if (id === "home") return; const hidden = prefs.hidden.includes(id) ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id]; commit({ ...prefs, hidden }); };
  return <div className="mobile-settings-stack"><div className="mobile-utility-info"><SlidersHorizontal size={17}/><div><strong>Catégories du volet</strong><span>Ordre et visibilité sauvegardés sur cet appareil.</span></div></div>{prefs.order.map((id, index) => <div className="mobile-pref-row" key={id}><label><input type="checkbox" checked={!prefs.hidden.includes(id)} disabled={id === "home"} onChange={() => toggle(id)} /><span>{labels[id] ?? id}</span></label><div><button disabled={index === 0} onClick={() => move(id, -1)}><ChevronUp size={16}/></button><button disabled={index === prefs.order.length - 1} onClick={() => move(id, 1)}><ChevronDown size={16}/></button></div></div>)}<button className="mobile-wide-action" onClick={() => commit({ order: [...DEFAULT_ORDER], hidden: [] })}><RotateCcw size={16}/> Réinitialiser</button></div>;
}

function SettingsMobile({ onNavigate }: { onNavigate: (tab: MobileTab) => void }) {
  const [notificationState, setNotificationState] = useState<"checking" | "granted" | "denied">("checking");
  useEffect(() => { void isPermissionGranted().then((ok) => setNotificationState(ok ? "granted" : "denied")).catch(() => setNotificationState("denied")); }, []);
  const askNotifications = async () => { const result = await requestPermission(); setNotificationState(result === "granted" ? "granted" : "denied"); };
  return <div className="mobile-settings-stack"><div className="mobile-settings-card"><div><Bell size={18}/><strong>Notifications</strong></div><p>{notificationState === "granted" ? "Autorisées : les alertes Baies peuvent être programmées." : "Autorise les notifications pour recevoir les checkpoints Baies."}</p>{notificationState !== "granted" && <button className="mobile-wide-action" onClick={() => void askNotifications()}>Autoriser</button>}</div><div className="mobile-settings-card"><div><Settings2 size={18}/><strong>ROM & Surf Manager</strong></div><p>La ROM Android et son backup sont gérés directement dans Surf Manager.</p><button className="mobile-wide-action" onClick={() => onNavigate("surf")}>Ouvrir Surf Manager</button></div></div>;
}

function PrepaMobile({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<CloudProfile[]>([]);
  const [selected, setSelected] = useState<CloudProfile | null>(null);
  const [sheet, setSheet] = useState<ShinyAccount[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => { setState("loading"); setError(null); try { setProfiles(normalizeProfiles(await listAlyaProfiles())); setState("ready"); } catch (e) { setError(e instanceof Error ? e.message : String(e)); setState("error"); } };
  useEffect(() => { void refresh(); }, []);

  const openSheet = async (profile: CloudProfile) => {
    setSelected(profile); setSheet(null); setSheetLoading(true); setError(null);
    try { const cloud = await loadCloudShinyWar(profile.id); setSheet(cloud ? normalizeShiny(cloud) : []); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSheetLoading(false); }
  };

  if (selected) return <div className="mobile-prepa-detail">
    <button className="mobile-back-action" onClick={() => { setSelected(null); setSheet(null); }}><ArrowLeft size={16}/> Retour aux joueurs</button>
    <div className="mobile-prepa-player"><ProfileAvatar profile={selected}/><div><strong>{selected.username}</strong><span>Feuille Shiny-War · lecture seule</span></div><RoleChip role={selected.role}/></div>
    {error && <div className="mobile-inline-error">{error}</div>}
    {sheetLoading ? <div className="mobile-panel-empty"><RefreshCw className="mobile-spin" size={21}/> Chargement de la feuille…</div> : sheet && sheet.length ? <ReadonlyShinyWarBundle targetUserId={selected.id} viewerUserId={currentUserId}/> : <div className="mobile-panel-empty"><Table2 size={24}/><strong>Aucune feuille Shiny-War cloud</strong><span>Cet utilisateur n'a pas encore synchronisé sa feuille.</span></div>}
  </div>;

  const filtered = profiles.filter((profile) => profile.username.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="mobile-settings-stack">
    <div className="mobile-staff-toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un utilisateur…"/><button onClick={() => void refresh()} aria-label="Actualiser"><RefreshCw size={16}/></button></div>
    {error && <div className="mobile-inline-error">{error}</div>}
    {state === "loading" ? <div className="mobile-panel-empty">Chargement des comptes ALYA…</div> : state === "error" ? <div className="mobile-panel-empty error">Impossible de charger les comptes ALYA.</div> : <div className="mobile-profile-list mobile-prepa-list">{filtered.map((profile) => <button className="mobile-profile-open-row" key={profile.id} onClick={() => void openSheet(profile)}><ProfileAvatar profile={profile}/><div><strong>{profile.username}</strong><span>Voir la feuille →</span></div><RoleChip role={profile.role}/></button>)}</div>}
  </div>;
}

function ReadonlyShinyWarMobile({ accounts }: { accounts: ShinyAccount[] }) {
  const total = accounts.flatMap((account) => account.characters).reduce((sum, character) => sum + character.ditto, 0);
  return <div className="mobile-readonly-shiny"><div className="mobile-readonly-total"><span>Total général</span><strong>{total.toLocaleString("fr-FR")} Ditto</strong></div>{accounts.map((account, index) => <article key={`${account.account}-${index}`}><header><span>COMPTE {String(index + 1).padStart(2, "0")}</span><strong>{account.account || `Compte ${index + 1}`}</strong></header>{account.characters.map((character, child) => <div className="mobile-readonly-character" key={child}><span>{character.name || `Personnage ${child + 1}`}</span><strong className={character.ditto >= 660 ? "complete" : ""}>{character.ditto} / 660</strong></div>)}</article>)}</div>;
}

function UsersMobile({ role, currentUserId }: { role: string; currentUserId: string }) {
  const [section, setSection] = useState<"roles" | "badges" | "event">("roles");
  const normalizedRole = role.toLowerCase();
  const canManage = normalizedRole === "dev" || normalizedRole === "gourou";
  if (!canManage) return <div className="mobile-panel-empty error"><Shield size={20}/> Accès DEV / GOUROU requis.</div>;
  return <div className="mobile-admin-mobile"><div className="mobile-admin-tabs"><button className={section === "roles" ? "active" : ""} onClick={() => setSection("roles")}>Rôles</button><button className={section === "badges" ? "active" : ""} onClick={() => setSection("badges")}>Badges</button><button className={section === "event" ? "active" : ""} onClick={() => setSection("event")}>Événement</button></div>{section === "roles" && <RolesMobile role={role} currentUserId={currentUserId}/>} {section === "badges" && <BadgesMobile/>} {section === "event" && <EventMobile/>}</div>;
}

function RolesMobile({ role, currentUserId }: { role: string; currentUserId: string }) {
  const [profiles, setProfiles] = useState<CloudProfile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const normalizedRole = role.toLowerCase();
  const refresh = async () => setProfiles(normalizeProfiles(await listAlyaProfiles()));
  useEffect(() => { void refresh().catch(() => setError("Impossible de charger les utilisateurs.")); }, []);
  const allowedFor = (profile: CloudProfile) => { if (profile.id === currentUserId && normalizedRole === "dev") return [] as string[]; if (normalizedRole === "dev") return ["DEV", "GOUROU", "Admin", "user"]; if (["dev", "gourou"].includes(profile.role.toLowerCase())) return [] as string[]; return ["Admin", "user"]; };
  const changeRole = async (profile: CloudProfile, nextRole: string) => { if (!nextRole || nextRole.toLowerCase() === profile.role.toLowerCase()) return; setBusy(profile.id); setError(null); try { await setAlyaUserRole(profile.id, nextRole as never); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Modification refusée."); } finally { setBusy(null); } };
  return <div className="mobile-settings-stack">{error && <div className="mobile-inline-error">{error}</div>}<div className="mobile-profile-list mobile-user-admin-list">{profiles.map((profile) => { const allowed = allowedFor(profile); return <article key={profile.id}><ProfileAvatar profile={profile}/><div><strong>{profile.username}</strong><span><RoleChip role={profile.role}/></span></div>{allowed.length ? <select value={profile.role} disabled={busy === profile.id} onChange={(e) => void changeRole(profile, e.target.value)}>{allowed.map((candidate) => <option value={candidate} key={candidate}>{candidate}</option>)}</select> : <span className="mobile-locked-role">Protégé</span>}</article>; })}</div></div>;
}

function BadgesMobile() {
  const [profiles, setProfiles] = useState<CloudProfile[]>([]);
  const [badges, setBadges] = useState<MobileBadge[]>([]);
  const [assignments, setAssignments] = useState<Array<{ userId: string; badgeId: string }>>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#987BDF");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => { const [rows, data] = await Promise.all([listAlyaProfiles(), loadBadgeAdminData()]); setProfiles(normalizeProfiles(rows)); setBadges(data.badges); setAssignments(data.assignments.map(({ userId, badgeId }) => ({ userId, badgeId }))); };
  useEffect(() => { void refresh().catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les badges.")); }, []);

  const chooseImage = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file); };
  const create = async () => { if (!name.trim()) return; setBusy(true); setError(null); try { await createBadge({ name: name.trim(), color, image }); setName(""); setImage(null); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Création impossible."); } finally { setBusy(false); } };
  const toggleBadge = async (userId: string, badgeId: string) => { const enabled = assignments.some((item) => item.userId === userId && item.badgeId === badgeId); setBusy(true); try { await setBadgeAssignment(userId, badgeId, !enabled); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Attribution impossible."); } finally { setBusy(false); } };

  return <div className="mobile-settings-stack">
    {error && <div className="mobile-inline-error">{error}</div>}
    <div className="mobile-badge-create"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du badge"/><input className="mobile-color-input" type="color" value={color} onChange={(e) => setColor(e.target.value)}/><input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => chooseImage(e.target.files?.[0])}/><button onClick={() => fileRef.current?.click()}><ImagePlus size={16}/></button><button className="primary" disabled={busy || !name.trim()} onClick={() => void create()}><Plus size={16}/> Créer</button></div>
    <div className="mobile-badge-catalog">{badges.map((badge) => <div key={badge.id}><span className="mobile-badge-preview" style={{ borderColor: badge.color }}>{badge.image ? <img src={badge.image} alt=""/> : <span style={{ background: badge.color }}/>}<strong>{badge.name}</strong></span><button disabled={busy} onClick={() => void deleteBadge(badge.id).then(refresh).catch((e) => setError(e instanceof Error ? e.message : "Suppression impossible."))}><Trash2 size={14}/></button></div>)}</div>
    <div className="mobile-badge-users">{profiles.map((profile) => { const selected = assignments.filter((item) => item.userId === profile.id).map((item) => item.badgeId); return <article key={profile.id} className={expanded === profile.id ? "open" : ""}><button className="mobile-badge-user-head" onClick={() => setExpanded(expanded === profile.id ? null : profile.id)}><ProfileAvatar profile={profile}/><div><strong>{profile.username}</strong><span>Badges {selected.length}/{badges.length}</span></div><ChevronDown size={16}/></button>{expanded === profile.id && <div className="mobile-badge-picker">{badges.map((badge) => { const checked = selected.includes(badge.id); return <button className={checked ? "selected" : ""} disabled={busy} onClick={() => void toggleBadge(profile.id, badge.id)} key={badge.id}>{badge.image ? <img src={badge.image} alt=""/> : <span className="dot" style={{ background: badge.color }}/>}<span>{badge.name}</span>{checked && <Check size={14}/>}</button>; })}</div>}</article>; })}</div>
  </div>;
}

function EventMobile() {
  const [event, setEvent] = useState<MobileDashboardEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const refresh = async () => { try { setEvent(await loadDashboardEventAdmin()); } catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger l'événement."); } };
  useEffect(() => { void refresh(); }, []);
  if (!event) return <div className="mobile-panel-empty">Chargement de l’événement…</div>;
  const set = <K extends keyof MobileDashboardEvent>(key: K, value: MobileDashboardEvent[K]) => setEvent((current) => current ? { ...current, [key]: value } : current);
  const choose = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => set("image", typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file); };
  const save = async () => { setBusy(true); setError(null); try { await saveDashboardEventAdmin({ id: event.id, title: event.title, body: event.body, titleColor: event.titleColor, image: event.image, endsAt: event.endsAt, active: true }); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Publication impossible."); } finally { setBusy(false); } };
  const disable = async () => { setBusy(true); try { await disableDashboardEventAdmin(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Arrêt impossible."); } finally { setBusy(false); } };
  return <div className="mobile-event-editor">{error && <div className="mobile-inline-error">{error}</div>}<label><span>Titre</span><input value={event.title} onChange={(e) => set("title", e.target.value)} placeholder="Titre de l'événement"/></label><label><span>Texte</span><textarea rows={5} value={event.body} onChange={(e) => set("body", e.target.value)} placeholder="Description, lien Discord…"/></label><div className="mobile-event-row"><label><span>Couleur du titre</span><input type="color" value={event.titleColor} onChange={(e) => set("titleColor", e.target.value)}/></label><label><span><CalendarClock size={13}/> Fin</span><input type="datetime-local" value={event.endsAt ? event.endsAt.slice(0,16) : ""} onChange={(e) => set("endsAt", e.target.value ? new Date(e.target.value).toISOString() : "")}/></label></div><div className="mobile-event-image" style={event.image ? { backgroundImage: `url(${event.image})` } : undefined}><input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => choose(e.target.files?.[0])}/><button onClick={() => fileRef.current?.click()}><ImagePlus size={16}/> {event.image ? "Changer l'image" : "Image de fond"}</button></div><div className="mobile-event-actions"><button className="mobile-wide-action" disabled={busy || !event.title.trim()} onClick={() => void save()}><Save size={16}/> Publier / mettre à jour</button>{event.active && <button className="danger" disabled={busy} onClick={() => void disable()}>Désactiver</button>}</div></div>;
}
