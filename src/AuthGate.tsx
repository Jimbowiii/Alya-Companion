import { useState } from "react";
import { CheckCircle2, CircleAlert, Cloud, LockKeyhole, Mail, UserRound } from "lucide-react";
import alyaIcon from "./assets/alya-icon.png";

type AuthGateProps = {
  configured: boolean;
  loading: boolean;
  error: string | null;
  recoveryMode: boolean;
  onClearError: () => void;
  onSignIn: (email: string, password: string) => Promise<unknown>;
  onSignUp: (email: string, password: string, username: string) => Promise<unknown>;
  onDiscord: () => Promise<unknown>;
  onReset: (email: string) => Promise<unknown>;
  onSetNewPassword: (password: string) => Promise<unknown>;
};

type Mode = "signin" | "signup" | "reset";

export function AuthGate(props: AuthGateProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    props.onClearError();
    setNotice(null);
    setMode(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    props.onClearError();
    try {
      if (props.recoveryMode) {
        if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        await props.onSetNewPassword(password);
        setNotice("Mot de passe modifié. Tu peux continuer dans ALYA Companion.");
        return;
      }

      if (mode === "signin") {
        await props.onSignIn(email, password);
      } else if (mode === "signup") {
        if (!username.trim()) throw new Error("Choisis un pseudo ALYA Companion.");
        if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        const result = await props.onSignUp(email, password, username) as { session?: unknown } | undefined;
        if (!result?.session) setNotice("Compte créé. Confirme ton email depuis ton téléphone ou ton PC, puis reviens ici et connecte-toi.");
      } else {
        await props.onReset(email);
        setNotice("Email de récupération envoyé. Pour la récupération du mot de passe, ouvre le lien sur le PC où ALYA Companion est installé.");
      }
    } catch {
      // L'erreur détaillée est affichée depuis le hook d'authentification.
    } finally {
      setBusy(false);
    }
  };

  if (!props.configured) {
    return <main className="auth-shell">
      <section className="auth-card auth-config-card">
        <img className="auth-logo" src={alyaIcon} alt="ALYA Companion" />
        <p className="eyebrow">Alya Account</p>
        <h1>Configuration Supabase requise</h1>
        <p>Le système de comptes est installé, mais il faut renseigner ton projet Supabase avant de pouvoir se connecter.</p>
        <div className="auth-config-list">
          <code>VITE_SUPABASE_URL</code>
          <code>VITE_SUPABASE_ANON_KEY</code>
        </div>
        <p className="auth-muted">Le ZIP contient <strong>.env.example</strong> et <strong>supabase/alya_companion.sql</strong> prêts à utiliser.</p>
      </section>
    </main>;
  }

  if (props.loading) {
    return <main className="auth-shell"><section className="auth-card auth-loading-card"><img className="auth-logo" src={alyaIcon} alt=""/><Cloud size={24}/><h1>Connexion à Alya…</h1></section></main>;
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="auth-brand-row">
        <img className="auth-logo" src={alyaIcon} alt="ALYA Companion" />
        <div><p className="eyebrow">ALYA Companion</p><h1>{props.recoveryMode ? "Nouveau mot de passe" : mode === "signup" ? "Créer ton compte" : mode === "reset" ? "Récupérer ton compte" : "Bienvenue"}</h1></div>
      </div>

      <p className="auth-lead">
        {props.recoveryMode
          ? "Choisis un nouveau mot de passe pour ton compte ALYA Companion."
          : mode === "signup"
            ? "Crée ton identité Alya et synchronise tes données entre tes PC."
            : mode === "reset"
              ? "Entre ton email et Alya t'enverra un lien de récupération."
              : "Connecte-toi pour ouvrir ALYA Companion et retrouver ta synchronisation cloud."}
      </p>

      {props.error && <div className="auth-alert error"><CircleAlert size={17}/><span>{props.error.replace(/^Error:\s*/, "")}</span></div>}
      {notice && <div className="auth-alert ok"><CheckCircle2 size={17}/><span>{notice}</span></div>}

      <form className="auth-form" onSubmit={submit}>
        {!props.recoveryMode && mode === "signup" && <label>
          <span>Pseudo Alya</span>
          <div className="auth-input-wrap"><UserRound size={17}/><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={32} placeholder="Ton pseudo" required /></div>
        </label>}

        {!props.recoveryMode && <label>
          <span>Email</span>
          <div className="auth-input-wrap"><Mail size={17}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="toi@email.com" required /></div>
        </label>}

        {(props.recoveryMode || mode === "signin" || mode === "signup") && <label>
          <span>{props.recoveryMode ? "Nouveau mot de passe" : "Mot de passe"}</span>
          <div className="auth-input-wrap"><LockKeyhole size={17}/><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={props.recoveryMode ? "new-password" : mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" required minLength={8} /></div>
        </label>}

        <button className="primary auth-submit" disabled={busy} type="submit">
          {busy ? "Connexion…" : props.recoveryMode ? "Enregistrer le nouveau mot de passe" : mode === "signup" ? "Créer mon compte" : mode === "reset" ? "Envoyer le lien" : "Se connecter"}
        </button>
      </form>

      {!props.recoveryMode && mode !== "reset" && <>
        <div className="auth-separator"><span>ou</span></div>
        <button className="auth-discord" disabled={busy} onClick={() => { setBusy(true); props.onDiscord().catch(() => undefined).finally(() => setBusy(false)); }}>Continuer avec Discord</button>
      </>}

      {!props.recoveryMode && <div className="auth-links">
        {mode === "signin" && <><button onClick={() => switchMode("signup")}>Créer un compte</button><button onClick={() => switchMode("reset")}>Mot de passe oublié</button></>}
        {mode === "signup" && <button onClick={() => switchMode("signin")}>J'ai déjà un compte</button>}
        {mode === "reset" && <button onClick={() => switchMode("signin")}>Retour à la connexion</button>}
      </div>}
    </section>
  </main>;
}
