import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Cloud, LogOut, Upload, UserRound, X } from "lucide-react";
import type { AlyaProfile } from "./auth";


function AccountAvatarImage({ src, updatedAt }: { src: string | null; updatedAt: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src, updatedAt]);

  if (!src || failed) return <UserRound size={34}/>;

  const resolved = `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(updatedAt)}`;
  return <img src={resolved} alt="Avatar" onError={() => setFailed(true)} />;
}

type AccountModalProps = {
  email: string;
  profile: AlyaProfile;
  error?: string | null;
  onClose: () => void;
  onUpdateUsername: (username: string) => Promise<unknown>;
  onUpdateAvatar: (file: File) => Promise<unknown>;
  onSignOut: () => Promise<unknown>;
};

export function AccountModal({ email, profile, error, onClose, onUpdateUsername, onUpdateAvatar, onSignOut }: AccountModalProps) {
  const [username, setUsername] = useState(profile.username);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setUsername(profile.username), [profile.username]);

  const saveUsername = async () => {
    setBusy("username"); setNotice(null);
    try {
      await onUpdateUsername(username);
      setNotice("Pseudo enregistré.");
    } finally { setBusy(null); }
  };

  const chooseAvatar = async (file: File | undefined) => {
    if (!file) return;
    setBusy("avatar"); setNotice(null);
    try {
      await onUpdateAvatar(file);
      setNotice("Avatar synchronisé.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-modal" role="dialog" aria-modal="true" aria-label="Compte ALYA Companion">
      <header className="account-modal-head">
        <div><p className="eyebrow">Alya Account</p><h2>Mon compte</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={17}/></button>
      </header>

      <div className="account-profile-row">
        <button className="account-avatar-button" onClick={() => fileRef.current?.click()} title="Changer l'avatar">
          {<AccountAvatarImage src={profile.avatar_url} updatedAt={profile.updated_at} />} 
          <span><Upload size={13}/></span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => void chooseAvatar(event.target.files?.[0])}/>
        <div><strong>{profile.username}</strong><span>{email}</span><span className={`role-badge role-${profile.role.toLowerCase()}`}>{profile.role}</span><small><Cloud size={13}/> Synchronisation active</small></div>
      </div>

      {error && <div className="auth-alert error"><span>{error.replace(/^Error:\s*/, "")}</span></div>}
      {notice && <div className="account-notice"><CheckCircle2 size={15}/>{notice}</div>}

      <label className="account-field"><span>Pseudo Alya</span><input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={32}/></label>
      <button className="primary" disabled={Boolean(busy) || !username.trim()} onClick={() => void saveUsername()}>{busy === "username" ? "Enregistrement…" : "Enregistrer le pseudo"}</button>

      <div className="account-sync-info">
        <strong>Synchronisé dans le cloud</strong>
        <span>Shiny-War, couleur d'accent, onglets, ordre des onglets, modules Dashboard et URL Vanity.</span>
        <small>Les chemins PokeMMO et ROM restent uniquement sur ce PC.</small>
      </div>

      <button className="danger-ghost account-signout" disabled={Boolean(busy)} onClick={() => { setBusy("logout"); void onSignOut().finally(() => setBusy(null)); }}><LogOut size={17}/> {busy === "logout" ? "Déconnexion…" : "Se déconnecter"}</button>
    </section>
  </div>;
}
