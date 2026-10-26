import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  authConfigured,
  PASSWORD_RECOVERY_KEY,
  ensureProfile,
  getValidatedSession,
  listenForAuthDeepLinks,
  signInWithDiscord,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  sendPasswordReset,
  supabase,
  updatePassword,
  updateProfile,
  uploadAvatar,
  type AlyaProfile,
} from "./auth";

export function useAlyaAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AlyaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async (nextSession = session) => {
    if (!nextSession) {
      setProfile(null);
      return null;
    }
    const nextProfile = await ensureProfile(nextSession.user);
    setProfile(nextProfile);
    return nextProfile;
  }, [session]);

  useEffect(() => {
    if (!authConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let disposed = false;
    let unlistenDeepLinks: (() => void) | undefined;

    const applyValidatedSession = async () => {
      const validatedSession = await getValidatedSession();
      if (disposed) return;

      if (!validatedSession) {
        setSession(null);
        setProfile(null);
        return;
      }

      if (localStorage.getItem(PASSWORD_RECOVERY_KEY) === "1") setRecoveryMode(true);
      const nextProfile = await ensureProfile(validatedSession.user);
      if (disposed) return;
      setProfile(nextProfile);
      setSession(validatedSession);
    };

    const bootstrap = async () => {
      try {
        await applyValidatedSession();
      } catch (bootstrapError) {
        if (!disposed) setError(String(bootstrapError));
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    const handleRecovery = () => setRecoveryMode(true);
    window.addEventListener("alya-password-recovery", handleRecovery);

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (disposed) return;
      setError(null);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (!nextSession) {
        setSession(null);
        setProfile(null);
        return;
      }

      // Le callback Supabase peut arriver pendant une transition OAuth. On
      // recharge explicitement la session validée + le profil hors du callback.
      window.setTimeout(() => {
        void applyValidatedSession().catch((profileError) => {
          if (disposed) return;
          setSession(null);
          setProfile(null);
          setError(String(profileError));
        });
      }, 0);
    });

    // Installer l'écoute deep-link immédiatement, indépendamment du bootstrap.
    // En React StrictMode, si l'effet est démonté avant la fin de l'await,
    // l'unlisten est exécuté dès qu'il devient disponible pour éviter les
    // listeners fantômes/dupliqués.
    void listenForAuthDeepLinks(
      () => {
        if (disposed) return;
        void applyValidatedSession().catch((deepLinkError) => {
          if (!disposed) setError(String(deepLinkError));
        });
      },
      (deepLinkError) => {
        if (!disposed) setError(String(deepLinkError));
      },
    ).then((unlisten) => {
      if (disposed) unlisten();
      else unlistenDeepLinks = unlisten;
    }).catch((deepLinkError) => {
      if (!disposed) setError(String(deepLinkError));
    });

    void bootstrap();

    return () => {
      disposed = true;
      authListener.subscription.unsubscribe();
      window.removeEventListener("alya-password-recovery", handleRecovery);
      unlistenDeepLinks?.();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const handleFocus = () => {
      void refreshProfile(session).catch((profileError) => setError(String(profileError)));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [session, refreshProfile]);

  const runAuth = useCallback(async <T,>(action: () => Promise<T>) => {
    setError(null);
    try {
      return await action();
    } catch (actionError) {
      setError(String(actionError));
      throw actionError;
    }
  }, []);

  return {
    configured: authConfigured,
    loading,
    session,
    profile,
    error,
    recoveryMode,
    clearError: () => setError(null),
    signIn: (email: string, password: string) => runAuth(() => signInWithEmail(email, password)),
    signUp: (email: string, password: string, username: string) => runAuth(() => signUpWithEmail(email, password, username)),
    signInDiscord: () => runAuth(() => signInWithDiscord()),
    resetPassword: (email: string) => runAuth(() => sendPasswordReset(email)),
    setNewPassword: async (password: string) => {
      await runAuth(() => updatePassword(password));
      setRecoveryMode(false);
    },
    signOut: () => runAuth(() => signOut()),
    refreshProfile,
    updateUsername: async (username: string) => {
      if (!session) throw new Error("Aucune session Alya active.");
      const next = await runAuth(() => updateProfile(session.user.id, { username }));
      setProfile(next);
      return next;
    },
    updateAvatar: async (file: File) => {
      if (!session) throw new Error("Aucune session Alya active.");
      const next = await runAuth(() => uploadAvatar(session.user.id, file));
      setProfile(next);
      return next;
    },
  };
}
