import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Image as ImageIcon,
  Megaphone,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  clearAlyaDashboardEvent,
  deleteAlyaDashboardEventImage,
  getAlyaDashboardEvent,
  saveAlyaDashboardEvent,
  subscribeAlyaDashboardEvent,
  uploadAlyaDashboardEventImage,
} from "./auth";
import type { AlyaDashboardEvent } from "./auth";

function formatCountdown(endsAt: string, now = Date.now()) {
  const remaining = Math.max(0, new Date(endsAt).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}j ${hours}h ${minutes}min ${seconds}sec`;
}

function toDateTimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function resolveEventImage(event: AlyaDashboardEvent | null, preview: string | null, removeImage: boolean) {
  if (preview) return preview;
  if (removeImage) return null;
  return event?.background_url ?? null;
}

function EventBodyWithLinks({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/gi);

  return <>
    {parts.map((part, index) => {
      if (!/^https?:\/\//i.test(part)) return <span key={`text-${index}`}>{part}</span>;

      const trailing = part.match(/[.,!?;:]+$/)?.[0] ?? "";
      const url = trailing ? part.slice(0, -trailing.length) : part;
      if (!url) return <span key={`text-${index}`}>{part}</span>;

      return <span key={`link-${index}`}>
        <a
          className="dashboard-global-event-link"
          href={url}
          title="Ouvrir dans le navigateur"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void openUrl(url).catch((error) => console.error("Impossible d'ouvrir le lien event", error));
          }}
        >
          {url}
        </a>
        {trailing}
      </span>;
    })}
  </>;
}

function EventVisual({
  event,
  now,
  previewImage,
  previewTitle,
  previewBody,
  previewColor,
  previewEndsAt,
}: {
  event: AlyaDashboardEvent | null;
  now: number;
  previewImage?: string | null;
  previewTitle?: string;
  previewBody?: string;
  previewColor?: string;
  previewEndsAt?: string;
}) {
  const title = previewTitle ?? event?.title ?? "Événement ALYA";
  const body = previewBody ?? event?.body ?? "Ton annonce apparaîtra ici pour tous les joueurs.";
  const titleColor = previewColor ?? event?.title_color ?? "#ffffff";
  const endsAt = previewEndsAt ?? event?.ends_at ?? new Date(now + 86_400_000).toISOString();
  const image = previewImage === undefined ? event?.background_url ?? null : previewImage;

  return <article className="dashboard-global-event">
    {image && <img className="dashboard-global-event-bg" src={image} alt="" aria-hidden="true" />}
    <div className="dashboard-global-event-shade" aria-hidden="true" />
    <div className="dashboard-global-event-content">
      <span className="dashboard-global-event-kicker"><Megaphone size={14}/> Événement ALYA</span>
      <h2 style={{ color: titleColor } as CSSProperties}>{title}</h2>
      {body && <p><EventBodyWithLinks text={body} /></p>}
      <div className="dashboard-global-event-countdown">
        <span>Temps restant :</span>
        <strong>{formatCountdown(endsAt, now)}</strong>
      </div>
    </div>
  </article>;
}

export function DashboardEventWidget() {
  const [event, setEvent] = useState<AlyaDashboardEvent | null>(null);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      setEvent(await getAlyaDashboardEvent());
    } catch {
      // Le Dashboard reste utilisable si la migration event n'est pas encore appliquée.
      setEvent(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const fallbackRefresh = window.setInterval(() => void refresh(), 30_000);
    const onLocalRefresh = () => void refresh();
    window.addEventListener("alya-dashboard-event-refresh", onLocalRefresh);

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeAlyaDashboardEvent(() => void refresh());
    } catch {
      // Le polling prend le relais si Realtime n'est pas disponible.
    }

    return () => {
      window.clearInterval(clock);
      window.clearInterval(fallbackRefresh);
      window.removeEventListener("alya-dashboard-event-refresh", onLocalRefresh);
      unsubscribe();
    };
  }, [refresh]);

  if (!event?.active || new Date(event.ends_at).getTime() <= now) return null;
  return <EventVisual event={event} now={now} />;
}

export function DashboardEventAdminPanel({ onBack }: { onBack: () => void }) {
  const [event, setEvent] = useState<AlyaDashboardEvent | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleColor, setTitleColor] = useState("#ffffff");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const fillFromEvent = useCallback((next: AlyaDashboardEvent | null) => {
    setEvent(next);
    setTitle(next?.title ?? "");
    setBody(next?.body ?? "");
    setTitleColor(next?.title_color ?? "#ffffff");
    setEndsAtLocal(toDateTimeLocal(next?.ends_at));
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      fillFromEvent(await getAlyaDashboardEvent());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [fillFromEvent]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleImage = (change: ChangeEvent<HTMLInputElement>) => {
    const file = change.target.files?.[0] ?? null;
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
    }
    change.currentTarget.value = "";
  };

  const save = async () => {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle) {
      setError("Ajoute un titre à l'événement.");
      return;
    }
    if (!endsAtLocal) {
      setError("Sélectionne une date et une heure de fin.");
      return;
    }
    const endsAt = new Date(endsAtLocal);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
      setError("La fin de l'événement doit être dans le futur.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    let uploaded: { publicUrl: string; path: string } | null = null;
    try {
      if (imageFile) uploaded = await uploadAlyaDashboardEventImage(imageFile);
      const backgroundUrl = uploaded?.publicUrl ?? (removeImage ? null : event?.background_url ?? null);
      const backgroundPath = uploaded?.path ?? (removeImage ? null : event?.background_path ?? null);

      const saved = await saveAlyaDashboardEvent({
        title: cleanTitle,
        body: cleanBody,
        title_color: titleColor,
        background_url: backgroundUrl,
        background_path: backgroundPath,
        ends_at: endsAt.toISOString(),
      });

      const previousPath = event?.background_path ?? null;
      fillFromEvent(saved);
      window.dispatchEvent(new CustomEvent("alya-dashboard-event-refresh"));
      setNotice("Événement publié sur le Dashboard de tous les utilisateurs.");

      if (previousPath && previousPath !== saved.background_path) {
        void deleteAlyaDashboardEventImage(previousPath).catch(() => {});
      }
    } catch (err) {
      if (uploaded?.path) void deleteAlyaDashboardEventImage(uploaded.path).catch(() => {});
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!event?.active) return;
    if (!window.confirm("Retirer l'événement du Dashboard pour tous les utilisateurs ?")) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await clearAlyaDashboardEvent();
      const oldPath = event.background_path;
      fillFromEvent(null);
      window.dispatchEvent(new CustomEvent("alya-dashboard-event-refresh"));
      setNotice("Événement retiré du Dashboard.");
      if (oldPath) void deleteAlyaDashboardEventImage(oldPath).catch(() => {});
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const previewEndsAt = endsAtLocal && !Number.isNaN(new Date(endsAtLocal).getTime())
    ? new Date(endsAtLocal).toISOString()
    : new Date(now + 86_400_000).toISOString();
  const previewImage = resolveEventImage(event, imagePreview, removeImage);

  return <section className="staff-page dashboard-event-admin-page">
    <header className="page-header">
      <div>
        <button className="staff-back" onClick={onBack}><ArrowLeft size={15}/> Gestion utilisateurs</button>
        <p className="eyebrow">DEV · GOUROU</p>
        <h1>Événement Dashboard</h1>
        <p>Publie une annonce globale avec visuel et compte à rebours pour tous les utilisateurs.</p>
      </div>
      <button className="ghost" onClick={() => void refresh()} disabled={loading || saving}><RefreshCw size={17}/> Actualiser</button>
    </header>

    {error && <div className="auth-alert error"><span>{error.replace(/^Error:\s*/, "")}</span></div>}
    {notice && <div className="account-notice"><CheckCircle2 size={15}/>{notice}</div>}

    <div className="dashboard-event-admin-grid">
      <div className="dashboard-event-editor-card">
        <div className="dashboard-event-editor-head">
          <div><strong>Créer / modifier l'événement</strong><span>Un seul événement global est affiché à la fois.</span></div>
          {event?.active && <span className="dashboard-event-live-pill">EN COURS</span>}
        </div>

        <label className="dashboard-event-field">
          <span>Titre</span>
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Tournoi ALYA — Grand Prix" />
        </label>

        <label className="dashboard-event-field">
          <span>Texte de l'événement</span>
          <textarea value={body} maxLength={700} rows={6} onChange={(e) => setBody(e.target.value)} placeholder="Écris ici tout ce que les joueurs doivent savoir…" />
          <small>{body.length}/700</small>
        </label>

        <div className="dashboard-event-inline-fields">
          <label className="dashboard-event-color-field">
            <span>Couleur du titre</span>
            <span className="dashboard-event-color-control">
              <input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} />
              <strong>{titleColor.toUpperCase()}</strong>
            </span>
          </label>

          <label className="dashboard-event-date-field">
            <span>Fin de l'événement</span>
            <span className="dashboard-event-date-control">
              <input ref={dateInputRef} type="datetime-local" value={endsAtLocal} onChange={(e) => setEndsAtLocal(e.target.value)} />
              <button type="button" onClick={() => dateInputRef.current?.showPicker?.()} title="Ouvrir le calendrier"><CalendarDays size={17}/></button>
            </span>
          </label>
        </div>

        <div className="dashboard-event-image-row">
          <label className="dashboard-event-image-picker">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImage} />
            <ImageIcon size={17}/>
            <span>{imageFile ? imageFile.name : event?.background_url && !removeImage ? "Remplacer l'image de fond" : "Importer une image de fond"}</span>
          </label>
          {(imageFile || (event?.background_url && !removeImage)) && <button type="button" className="danger-ghost compact" onClick={() => { setImageFile(null); setImagePreview(null); setRemoveImage(true); }}><X size={15}/> Retirer l'image</button>}
        </div>
        <p className="dashboard-event-help">PNG, JPG, WEBP ou GIF · 8 Mo maximum. Le texte reste lisible grâce à un voile sombre automatique.</p>

        <div className="dashboard-event-actions">
          <button className="primary" disabled={saving || loading} onClick={() => void save()}><Save size={17}/>{saving ? "Publication…" : "Publier l'événement"}</button>
          {event?.active && <button className="danger-ghost" disabled={saving} onClick={() => void clear()}><Trash2 size={17}/> Retirer du Dashboard</button>}
        </div>
      </div>

      <div className="dashboard-event-preview-card">
        <div className="dashboard-event-preview-head"><span>Aperçu Dashboard</span><small>Le compteur se met à jour chaque seconde.</small></div>
        <EventVisual
          event={event}
          now={now}
          previewImage={previewImage}
          previewTitle={title.trim() || "Titre de l'événement"}
          previewBody={body.trim() || "Ton message apparaîtra ici."}
          previewColor={titleColor}
          previewEndsAt={previewEndsAt}
        />
      </div>
    </div>
  </section>;
}
