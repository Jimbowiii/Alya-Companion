import { createClient, type Session, type User } from "@supabase/supabase-js";
import { getCurrent, onOpenUrl, register } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Settings } from "./types";

const viteEnv = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});

export const SUPABASE_URL = (viteEnv.VITE_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (viteEnv.VITE_SUPABASE_ANON_KEY ?? "").trim();
export const AUTH_REDIRECT_URL = "alya-companion://auth/callback";
export const PASSWORD_RECOVERY_KEY = "alya-companion-password-recovery";
export const AUTH_STORAGE_KEY = "alya-companion-auth";
export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = authConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        storageKey: AUTH_STORAGE_KEY,
      },
    })
  : null;

export type CloudPreferences = Pick<
  Settings,
  "vanity_url" | "accent_color" | "hidden_tabs" | "tab_order" | "dashboard_modules"
>;

export type AlyaRole = "user" | "Admin" | "Gourou" | "DEV";

export type AlyaBadge = {
  id: string;
  name: string;
  icon: string;
  color: string;
  image_url: string | null;
  created_at: string;
};

export type AlyaDashboardEvent = {
  id: string;
  title: string;
  body: string;
  title_color: string;
  background_url: string | null;
  background_path: string | null;
  ends_at: string;
  active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AlyaProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: AlyaRole;
  preferences: Partial<CloudPreferences>;
  created_at: string;
  updated_at: string;
  badges: AlyaBadge[];
};

type AlyaProfileRow = Omit<AlyaProfile, "badges">;

function requireSupabase() {
  if (!supabase) throw new Error("Supabase n'est pas configuré dans .env.");
  return supabase;
}

function defaultUsername(user: User) {
  const metadata = user.user_metadata ?? {};
  const fromMetadata = [metadata.username, metadata.full_name, metadata.name]
    .find((value) => typeof value === "string" && value.trim().length > 0);
  if (typeof fromMetadata === "string") return fromMetadata.trim().slice(0, 32);
  return (user.email?.split("@")[0] || "Utilisateur Alya").slice(0, 32);
}


function firstNonEmptyString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function normalizeExternalAvatarUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

function isDiscordAvatarUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "cdn.discordapp.com"
      || host === "media.discordapp.net"
      || host === "images-ext-1.discordapp.net";
  } catch {
    return false;
  }
}

function discordAvatarUrlFromParts(userId: string | null, avatarHash: string | null) {
  if (!userId || !avatarHash) return null;
  const extension = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=128`;
}

function oauthAvatarUrl(user: User) {
  const metadata = user.user_metadata ?? {};
  const direct = normalizeExternalAvatarUrl(firstNonEmptyString([
    metadata.avatar_url,
    metadata.picture,
    metadata.image,
  ]));
  if (direct) return direct;

  const identities = Array.isArray((user as User & { identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }> }).identities)
    ? (user as User & { identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }> }).identities ?? []
    : [];

  for (const identity of identities) {
    const identityData = identity?.identity_data ?? {};
    const directIdentityUrl = normalizeExternalAvatarUrl(firstNonEmptyString([
      identityData.avatar_url,
      identityData.picture,
      identityData.image,
    ]));
    if (directIdentityUrl) return directIdentityUrl;

    if (identity?.provider === "discord") {
      const discordUserId = firstNonEmptyString([
        identityData.provider_id,
        identityData.sub,
        metadata.provider_id,
        metadata.sub,
      ]);
      const discordAvatarHash = firstNonEmptyString([
        identityData.avatar,
        metadata.avatar,
      ]);
      const built = discordAvatarUrlFromParts(discordUserId, discordAvatarHash);
      if (built) return built;
    }
  }

  return null;
}


export function cloudPreferencesFromSettings(settings: Settings): CloudPreferences {
  return {
    vanity_url: settings.vanity_url,
    accent_color: settings.accent_color,
    hidden_tabs: settings.hidden_tabs ?? [],
    tab_order: settings.tab_order ?? [],
    dashboard_modules: settings.dashboard_modules ?? [],
  };
}

export async function clearLocalAuthSession() {
  const client = requireSupabase();
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // On force quand même le nettoyage local : cette fonction sert notamment
    // à récupérer une session persistée dont le compte a été supprimé côté serveur.
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(PASSWORD_RECOVERY_KEY);
}

export async function getSession(): Promise<Session | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getValidatedSession(): Promise<Session | null> {
  const client = requireSupabase();
  const session = await getSession();
  if (!session) return null;

  // getSession() relit le cache local. getUser() contacte Auth et vérifie que
  // l'utilisateur existe toujours réellement côté Supabase.
  const { data, error } = await client.auth.getUser();
  if (!error && data.user && data.user.id === session.user.id) return session;

  const status = (error as { status?: number } | null)?.status;
  const invalidServerSession = !data.user && (status === 401 || status === 403 || !error);
  if (invalidServerSession) {
    await clearLocalAuthSession();
    return null;
  }

  if (error) throw error;
  await clearLocalAuthSession();
  return null;
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  localStorage.removeItem(PASSWORD_RECOVERY_KEY);
  return data;
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  const client = requireSupabase();
  const cleanUsername = username.trim().slice(0, 32);
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      // La confirmation email doit rester indépendante de l'appareil.
      // Sans emailRedirectTo, Supabase redirige vers la Site URL après validation.
      // Le deep-link Alya reste réservé à Discord et à la récupération de mot de passe.
      data: { username: cleanUsername },
    },
  });
  if (error) throw error;
  localStorage.removeItem(PASSWORD_RECOVERY_KEY);
  return data;
}

export async function sendPasswordReset(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: AUTH_REDIRECT_URL,
  });
  if (error) throw error;
  localStorage.setItem(PASSWORD_RECOVERY_KEY, "1");
}

export async function updatePassword(password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
  localStorage.removeItem(PASSWORD_RECOVERY_KEY);
}

export async function signInWithDiscord() {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
      scopes: "identify email",
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Supabase n'a pas retourné d'URL Discord.");

  localStorage.removeItem(PASSWORD_RECOVERY_KEY);

  // Sur Windows, le callback arrive dans une deuxième instance Tauri puis est
  // retransmis à l'instance principale. On écoute l'événement officiel ET on
  // surveille getCurrent() en secours, car getCurrent est mis à jour par le
  // plugin deep-link même si l'événement frontend est perdu.
  let baseline = new Set<string>();
  try {
    baseline = new Set((await getCurrent()) ?? []);
  } catch {
    // Le fallback événementiel peut tout de même fonctionner.
  }

  const callbackPromise = waitForFreshAuthCallback(baseline);
  await openUrl(data.url);

  const callbackUrl = await callbackPromise;
  const processed = await processAuthDeepLinkOnce(callbackUrl);
  if (!processed) throw new Error("Le retour Discord reçu n'est pas un callback Alya valide.");
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function processAuthDeepLink(rawUrl: string) {
  if (!rawUrl.startsWith("alya-companion://auth/callback")) return false;
  const client = requireSupabase();
  const url = new URL(rawUrl);

  const queryError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const hashError = hash.get("error_description") ?? hash.get("error");
  if (queryError || hashError) throw new Error(decodeURIComponent(queryError || hashError || "Erreur d'authentification"));

  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (localStorage.getItem(PASSWORD_RECOVERY_KEY) === "1") {
      window.dispatchEvent(new CustomEvent("alya-password-recovery"));
    }
    return true;
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return true;
  }

  return false;
}

const processedAuthDeepLinks = new Set<string>();
const inFlightAuthDeepLinks = new Map<string, Promise<boolean>>();

async function processAuthDeepLinkOnce(rawUrl: string): Promise<boolean> {
  if (processedAuthDeepLinks.has(rawUrl)) return true;

  const existing = inFlightAuthDeepLinks.get(rawUrl);
  if (existing) return existing;

  const task = processAuthDeepLink(rawUrl)
    .then((processed) => {
      if (processed) processedAuthDeepLinks.add(rawUrl);
      return processed;
    })
    .finally(() => {
      inFlightAuthDeepLinks.delete(rawUrl);
    });

  inFlightAuthDeepLinks.set(rawUrl, task);
  return task;
}

function isAlyaAuthCallback(url: string) {
  return url.startsWith(AUTH_REDIRECT_URL);
}

async function waitForFreshAuthCallback(baseline: Set<string>, timeoutMs = 120_000): Promise<string> {
  let unlisten: (() => void) | undefined;
  let pollId: number | undefined;
  let timeoutId: number | undefined;
  let settled = false;

  let resolveCallback!: (url: string) => void;
  let rejectCallback!: (error: Error) => void;
  const result = new Promise<string>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const finish = (url: string) => {
    if (settled) return;
    settled = true;
    resolveCallback(url);
  };

  const inspect = (urls: string[] | null | undefined) => {
    for (const raw of urls ?? []) {
      const url = String(raw);
      if (isAlyaAuthCallback(url) && !baseline.has(url)) {
        finish(url);
        return;
      }
    }
  };

  try {
    unlisten = await onOpenUrl((urls) => inspect(urls));
  } catch {
    // Le polling getCurrent() ci-dessous reste disponible en secours.
  }

  pollId = window.setInterval(() => {
    void getCurrent().then(inspect).catch(() => undefined);
  }, 250);

  timeoutId = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    rejectCallback(new Error("Alya n'a pas reçu le retour Discord. Réessaie la connexion."));
  }, timeoutMs);

  try {
    return await result;
  } finally {
    if (pollId !== undefined) window.clearInterval(pollId);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    unlisten?.();
  }
}

export async function listenForAuthDeepLinks(onProcessed?: () => void, onError?: (error: unknown) => void) {
  // En développement Windows, réenregistrer le schéma vers l'exécutable courant.
  try {
    await register("alya-companion");
  } catch (error) {
    onError?.(error);
  }

  const handle = async (url: string) => {
    try {
      const processed = await processAuthDeepLinkOnce(url);
      if (processed) onProcessed?.();
    } catch (error) {
      onError?.(error);
    }
  };

  let unlisten: () => void = () => {};
  try {
    unlisten = await onOpenUrl((urls) => {
      for (const url of urls ?? []) void handle(String(url));
    });
  } catch (error) {
    onError?.(error);
  }

  try {
    const current = await getCurrent();
    for (const url of current ?? []) await handle(String(url));
  } catch (error) {
    onError?.(error);
  }

  return unlisten;
}

async function attachBadgesToProfiles(rows: AlyaProfileRow[]): Promise<AlyaProfile[]> {
  if (rows.length === 0) return [];
  const client = requireSupabase();
  const userIds = rows.map((row) => row.id);

  const [{ data: badges, error: badgesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    client.from("alya_badges").select("id, name, icon, color, image_url, created_at").order("created_at", { ascending: true }),
    client.from("profile_badges").select("user_id, badge_id, display_order, assigned_at").in("user_id", userIds),
  ]);

  // Les badges sont un enrichissement visuel : une migration pas encore appliquée
  // ne doit jamais empêcher Alya Cloud de fonctionner.
  if (badgesError || assignmentsError) {
    return rows.map((row) => ({ ...row, badges: [] }));
  }

  const badgeMap = new Map<string, AlyaBadge>();
  for (const badge of badges ?? []) badgeMap.set(String(badge.id), badge as AlyaBadge);

  const sortedAssignments = [...(assignments ?? [])].sort((left, right) => {
    const leftUser = String(left.user_id);
    const rightUser = String(right.user_id);
    if (leftUser !== rightUser) return leftUser.localeCompare(rightUser);

    const leftOrder = Number(left.display_order ?? 0);
    const rightOrder = Number(right.display_order ?? 0);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return String(left.assigned_at ?? "").localeCompare(String(right.assigned_at ?? ""));
  });

  const byUser = new Map<string, AlyaBadge[]>();
  for (const assignment of sortedAssignments) {
    const badge = badgeMap.get(String(assignment.badge_id));
    if (!badge) continue;
    const userId = String(assignment.user_id);
    const current = byUser.get(userId) ?? [];
    current.push(badge);
    byUser.set(userId, current);
  }

  return rows.map((row) => ({ ...row, badges: byUser.get(row.id) ?? [] }));
}

async function attachBadgesToProfile(row: AlyaProfileRow): Promise<AlyaProfile> {
  const [profile] = await attachBadgesToProfiles([row]);
  return profile ?? { ...row, badges: [] };
}

export async function listAlyaBadges(): Promise<AlyaBadge[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("alya_badges")
    .select("id, name, icon, color, image_url, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Badges Alya indisponibles : ${error.message}. Applique supabase/alya_badges.sql.`);
  return (data ?? []) as AlyaBadge[];
}

export async function createAlyaBadge(values: { name: string; icon: string; color: string; image_url?: string | null }): Promise<AlyaBadge> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_alya_badge", {
    p_name: values.name.trim(),
    p_icon: values.icon.trim() || "✦",
    p_color: values.color,
    p_image_url: values.image_url?.trim() || null,
  });
  if (error) throw error;
  const badge = Array.isArray(data) ? data[0] : data;
  if (!badge) throw new Error("Supabase n'a pas retourné le badge créé.");
  return badge as AlyaBadge;
}


export async function uploadAlyaBadgeImage(file: File, badgeName?: string) {
  const client = requireSupabase();
  if (!file.type.startsWith("image/")) throw new Error("Sélectionne une image pour le badge.");
  if (file.size > 2 * 1024 * 1024) throw new Error("L'image du badge doit faire moins de 2 Mo.");

  const extension = (file.name.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
  const safeName = (badgeName ?? file.name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "badge";
  const path = `${Date.now()}-${safeName}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("alya-badges").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) throw new Error(`Upload du badge impossible : ${uploadError.message}`);

  const { data } = client.storage.from("alya-badges").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAlyaBadge(badgeId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("delete_alya_badge", { p_badge_id: badgeId });
  if (error) throw error;
}

export async function setAlyaUserBadge(userId: string, badgeId: string, assigned: boolean) {
  const client = requireSupabase();
  const { error } = await client.rpc("set_alya_user_badge", {
    p_user_id: userId,
    p_badge_id: badgeId,
    p_assigned: assigned,
  });
  if (error) throw error;
}

export async function setAlyaUserBadgeOrder(userId: string, badgeIds: string[]) {
  const client = requireSupabase();
  const { error } = await client.rpc("set_alya_user_badge_order", {
    p_user_id: userId,
    p_badge_ids: badgeIds,
  });
  if (error) throw error;
}

export async function ensureProfile(user: User): Promise<AlyaProfile> {
  const client = requireSupabase();
  const { data: existing, error: selectError } = await client
    .from("profiles")
    .select("id, username, avatar_url, role, preferences, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) {
    const current = existing as AlyaProfileRow;
    const nextOAuthAvatar = oauthAvatarUrl(user);
    const shouldRefreshAvatar = Boolean(nextOAuthAvatar) && (!current.avatar_url || isDiscordAvatarUrl(current.avatar_url));

    if (shouldRefreshAvatar && current.avatar_url !== nextOAuthAvatar) {
      try {
        return await updateProfile(user.id, { avatar_url: nextOAuthAvatar });
      } catch {
        return attachBadgesToProfile(current);
      }
    }

    return attachBadgesToProfile(current);
  }

  const profile = {
    id: user.id,
    username: defaultUsername(user),
    avatar_url: oauthAvatarUrl(user),
    preferences: {},
  };

  const { data, error } = await client
    .from("profiles")
    .insert(profile)
    .select("id, username, avatar_url, role, preferences, created_at, updated_at")
    .single();

  if (!error && data) return attachBadgesToProfile(data as AlyaProfileRow);

  // Le trigger auth crée normalement déjà le profil. En cas de course entre
  // le trigger et le premier chargement client, relire la ligne existante.
  if (error?.code === "23505") {
    const { data: racedProfile, error: racedError } = await client
      .from("profiles")
      .select("id, username, avatar_url, role, preferences, created_at, updated_at")
      .eq("id", user.id)
      .single();
    if (racedError) throw racedError;
    return attachBadgesToProfile(racedProfile as AlyaProfileRow);
  }

  if (error) throw error;
  throw new Error("Impossible de créer le profil Alya.");
}

export async function updateProfile(userId: string, values: { username?: string; avatar_url?: string | null }) {
  const client = requireSupabase();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof values.username === "string") patch.username = values.username.trim().slice(0, 32);
  if ("avatar_url" in values) patch.avatar_url = values.avatar_url ?? null;

  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id, username, avatar_url, role, preferences, created_at, updated_at")
    .single();
  if (error) throw error;
  return attachBadgesToProfile(data as AlyaProfileRow);
}

export async function uploadAvatar(userId: string, file: File) {
  const client = requireSupabase();
  if (!file.type.startsWith("image/")) throw new Error("Sélectionne une image pour l'avatar.");
  if (file.size > 5 * 1024 * 1024) throw new Error("L'avatar doit faire moins de 5 Mo.");

  const extension = (file.name.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
  const path = `${userId}/avatar.${extension}`;
  const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) throw uploadError;

  const { data } = client.storage.from("avatars").getPublicUrl(path);
  return updateProfile(userId, { avatar_url: data.publicUrl });
}

export async function saveCloudPreferences(userId: string, preferences: CloudPreferences) {
  const client = requireSupabase();
  const { error } = await client
    .from("profiles")
    .update({ preferences, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function listAlyaProfiles(): Promise<AlyaProfile[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, username, avatar_url, role, preferences, created_at, updated_at")
    .order("username", { ascending: true });
  if (error) throw error;
  return attachBadgesToProfiles((data ?? []) as AlyaProfileRow[]);
}

export async function setAlyaUserRole(userId: string, role: AlyaRole) {
  const client = requireSupabase();
  const { error } = await client.rpc("set_alya_user_role", {
    target_user_id: userId,
    new_role: role,
  });
  if (error) throw error;
}

export async function getAlyaDashboardEvent(): Promise<AlyaDashboardEvent | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("alya_dashboard_events")
    .select("id, title, body, title_color, background_url, background_path, ends_at, active, updated_by, created_at, updated_at")
    .eq("id", "global")
    .maybeSingle();
  if (error) {
    if (["42P01", "PGRST205"].includes((error as { code?: string }).code ?? "")) return null;
    throw error;
  }
  return data ? data as AlyaDashboardEvent : null;
}

export async function saveAlyaDashboardEvent(values: {
  title: string;
  body: string;
  title_color: string;
  background_url: string | null;
  background_path: string | null;
  ends_at: string;
}): Promise<AlyaDashboardEvent> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("set_alya_dashboard_event", {
    p_title: values.title,
    p_body: values.body,
    p_title_color: values.title_color,
    p_background_url: values.background_url,
    p_background_path: values.background_path,
    p_ends_at: values.ends_at,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Supabase n'a pas retourné l'événement publié.");
  return row as AlyaDashboardEvent;
}

export async function clearAlyaDashboardEvent() {
  const client = requireSupabase();
  const { error } = await client.rpc("clear_alya_dashboard_event");
  if (error) throw error;
}

export async function uploadAlyaDashboardEventImage(file: File) {
  const client = requireSupabase();
  if (!file.type.startsWith("image/")) throw new Error("Sélectionne une image pour le fond de l'événement.");
  if (file.size > 8 * 1024 * 1024) throw new Error("L'image de fond doit faire moins de 8 Mo.");

  const extension = (file.name.split(".").pop() || file.type.split("/").pop() || "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "png";
  const path = `dashboard/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("alya-events").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) throw new Error(`Upload de l'image événement impossible : ${uploadError.message}`);

  const { data } = client.storage.from("alya-events").getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function deleteAlyaDashboardEventImage(path: string) {
  const client = requireSupabase();
  const cleanPath = path.trim();
  if (!cleanPath) return;
  const { error } = await client.storage.from("alya-events").remove([cleanPath]);
  if (error) throw error;
}

export function subscribeAlyaDashboardEvent(onChange: () => void) {
  const client = requireSupabase();
  const channel = client
    .channel("alya-dashboard-event")
    .on("postgres_changes", { event: "*", schema: "public", table: "alya_dashboard_events" }, () => onChange())
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function loadCloudShinyWar(userId: string): Promise<unknown[] | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("shiny_war_documents")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.data) ? data.data : null;
}

export async function saveCloudShinyWar(userId: string, data: unknown[]) {
  const client = requireSupabase();
  const { error } = await client
    .from("shiny_war_documents")
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}
