import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, Pencil, PictureInPicture2, RefreshCw } from "lucide-react";
import { STREAM_CONFIG } from "./config/stream";
import "./stream.css";

type StreamPageProps = {
  onEditBackground: () => void;
};

function configuredHost() {
  try {
    return new URL(STREAM_CONFIG.url).host;
  } catch {
    return STREAM_CONFIG.url;
  }
}

export function StreamPage({ onEditBackground }: StreamPageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const syncInFlight = useRef(false);
  const syncQueued = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [miniBusy, setMiniBusy] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let frame = 0;
    let disposed = false;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed || !hostRef.current) return;
        const rect = hostRef.current.getBoundingClientRect();
        if (rect.width < 160 || rect.height < 160) return;

        if (syncInFlight.current) {
          syncQueued.current = true;
          return;
        }

        syncInFlight.current = true;
        void invoke<void>("show_stream_webview", {
          url: STREAM_CONFIG.url,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
          .then(() => setError(null))
          .catch((reason) => setError(String(reason)))
          .finally(() => {
            syncInFlight.current = false;
            if (syncQueued.current && !disposed) {
              syncQueued.current = false;
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
      void invoke<void>("hide_stream_webview").catch(() => undefined);
    };
  }, []);

  const reload = () => {
    setError(null);
    void invoke<void>("reload_stream_webview").catch((reason) => setError(String(reason)));
  };

  const openMini = async () => {
    if (miniBusy) return;
    setMiniBusy(true);
    try {
      await invoke<void>("open_stream_mini", {
        url: STREAM_CONFIG.url,
        title: STREAM_CONFIG.miniWindowTitle,
      });
      setError(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setMiniBusy(false);
    }
  };

  return (
    <section className="embedded-page stream-page">
      <header className="page-header embedded-header stream-header">
        <div>
          <p className="eyebrow">{STREAM_CONFIG.eyebrow}</p>
          <h1>{STREAM_CONFIG.title}</h1>
          <p>{STREAM_CONFIG.description}</p>
        </div>
        <div className="page-header-actions stream-actions">
          <button className="ghost stream-action" onClick={onEditBackground} title="Changer le fond">
            <Pencil size={17} />
            <span className="stream-action-label">Fond</span>
          </button>
          <button className="ghost stream-action" onClick={reload}>
            <RefreshCw size={17} /> Recharger
          </button>
          <button className="ghost stream-action" onClick={() => void openUrl(STREAM_CONFIG.url)}>
            <ExternalLink size={17} /> Navigateur
          </button>
          <button className="primary stream-action stream-mini-button" onClick={() => void openMini()} disabled={miniBusy}>
            <PictureInPicture2 size={17} /> {miniBusy ? "Ouverture…" : "Mini fenêtre"}
          </button>
        </div>
      </header>

      <div ref={hostRef} className="embedded-webview-host stream-webview-host" aria-label={`${STREAM_CONFIG.title} intégré`}>
        <div className="embedded-loading">
          <RefreshCw size={22} />
          <span>Chargement de {STREAM_CONFIG.title}…</span>
        </div>
        {error && (
          <div className="stream-error" role="alert">
            <strong>Impossible d’afficher le site configuré.</strong>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="stream-config-note">
        Site configuré : <strong>{configuredHost()}</strong> · URL modifiable dans <code>src/config/stream.ts</code>
      </div>
    </section>
  );
}
