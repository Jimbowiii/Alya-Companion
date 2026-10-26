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

export type AlyaRole = "user" | "Admin" | "DEV";

export type AlyaProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: AlyaRole;
  preferences: Partial<CloudPreferences>;
  created_at: string;
  updated_at: string;
};

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

export async function ensureProfile(user: User): Promise<AlyaProfile> {
  const client = requireSupabase();
  const { data: existing, error: selectError } = await client
    .from("profiles")
    .select("id, username, avatar_url, role, preferences, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as AlyaProfile;

  const profile = {
    id: user.id,
    username: defaultUsername(user),
    avatar_url: null,
    preferences: {},
  };

  const { data, error } = await client
    .from("profiles")
    .insert(profile)
    .select("id, username, avatar_url, role, preferences, created_at, updated_at")
    .single();

  if (!error && data) return data as AlyaProfile;

  // Le trigger auth crée normalement déjà le profil. En cas de course entre
  // le trigger et le premier chargement client, relire la ligne existante.
  if (error?.code === "23505") {
    const { data: racedProfile, error: racedError } = await client
      .from("profiles")
      .select("id, username, avatar_url, role, preferences, created_at, updated_at")
      .eq("id", user.id)
      .single();
    if (racedError) throw racedError;
    return racedProfile as AlyaProfile;
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
  return data as AlyaProfile;
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
  return (data ?? []) as AlyaProfile[];
}

export async function setAlyaUserRole(userId: string, role: AlyaRole) {
  const client = requireSupabase();
  const { error } = await client.rpc("set_alya_user_role", {
    target_user_id: userId,
    new_role: role,
  });
  if (error) throw error;
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
