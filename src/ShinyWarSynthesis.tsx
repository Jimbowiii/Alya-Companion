import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageSquareText, Save } from "lucide-react";
import type { ShinyWarExtraSheets } from "./shinyWarExtraSheets";
import { loadShinyWarReview, saveShinyWarReview } from "./shinyWarReview";
import "./shiny-war-synthesis.css";

import { SHINY_WAR_ITEM_ROWS } from "./shinyWarItemDefinitions";
export type SynthesisAccount = {
  account: string;
  characters: Array<{ name: string; ditto: number }>;
};

const ITEM_ROWS = SHINY_WAR_ITEM_ROWS;

const ALPHA_ICON = "https://cdn.discordapp.com/emojis/1105317329618870342.webp?size=44";
const DITTO_TARGET = 660;

function formatYen(value: number) {
  return `${Math.max(0, Math.trunc(value)).toLocaleString("fr-FR")} ¥`;
}

function AlphaIcon({ crossed = false }: { crossed?: boolean }) {
  return <span className={`synthesis-alpha-icon ${crossed ? "crossed" : ""}`}>
    <img src={ALPHA_ICON} alt={crossed ? "Non Alpha" : "Alpha"} />
    {crossed && <i aria-hidden="true" />}
  </span>;
}

export function SynthesisOverview({
  accounts,
  extra,
}: {
  accounts: SynthesisAccount[];
  extra: ShinyWarExtraSheets;
}) {
  const dittoTotal = useMemo(
    () => accounts.reduce((sum, account) => sum + account.characters.reduce((subtotal, c) => subtotal + Math.max(0, c.ditto || 0), 0), 0),
    [accounts],
  );
  const dittoComplete = useMemo(
    () => accounts.reduce((sum, account) => sum + account.characters.filter((c) => c.ditto >= DITTO_TARGET).length, 0),
    [accounts],
  );
  const gtlTotal = useMemo(
    () => extra.gtlRows.reduce((sum, row) => sum + Math.max(0, row.unitPrice || 0) * Math.max(0, row.quantity || 0), 0),
    [extra.gtlRows],
  );
  const itemTotal = useMemo(
    () => extra.itemQuantities.reduce((sum, quantity) => sum + Math.max(0, quantity || 0), 0),
    [extra.itemQuantities],
  );
  const alphaTotal = useMemo(
    () => extra.alphaRows.reduce((sum, row) => sum + Math.max(0, row.quantity || 0), 0),
    [extra.alphaRows],
  );
  const breederTotal = useMemo(
    () => extra.breederRows.reduce((sum, row) => sum + Math.max(0, row.quantity || 0), 0),
    [extra.breederRows],
  );

  const usefulAccounts = accounts.filter((a) =>
    a.account.trim() || a.characters.some((c) => c.name.trim() || c.ditto > 0)
  );
  const usefulGtl = extra.gtlRows.filter((r) => r.item.trim() || r.unitPrice > 0 || r.quantity > 0);
  const usefulItems = extra.itemQuantities
    .map((quantity, index) => ({ quantity: Math.max(0, quantity || 0), index }))
    .filter((row) => row.quantity > 0);
  const usefulAlphas = extra.alphaRows.filter((r) => r.pokemonId || r.pokemonName.trim() || r.quantity > 0);
  const usefulBreeders = extra.breederRows.filter((r) => r.quantity > 0);

  return <div className="synthesis-overview">
    <div className="synthesis-top-stats">
      <article><span>Ditto</span><strong>{dittoTotal.toLocaleString("fr-FR")}</strong><small>{dittoComplete}/{accounts.length * 3} à 660</small></article>
      <article><span>GTL</span><strong>{formatYen(gtlTotal)}</strong><small>{usefulGtl.length} ligne{usefulGtl.length > 1 ? "s" : ""}</small></article>
      <article><span>Items</span><strong>{itemTotal.toLocaleString("fr-FR")}</strong><small>{usefulItems.length} référence{usefulItems.length > 1 ? "s" : ""}</small></article>
      <article><span>Alphas</span><strong>{alphaTotal.toLocaleString("fr-FR")}</strong><small>{usefulAlphas.length} ligne{usefulAlphas.length > 1 ? "s" : ""}</small></article>
      <article><span>Breeders</span><strong>{breederTotal.toLocaleString("fr-FR")}</strong><small>{usefulBreeders.length} ligne{usefulBreeders.length > 1 ? "s" : ""}</small></article>
    </div>

    <section className="synthesis-block">
      <header><span className="synthesis-symbol">◉</span><div><h3>Ditto</h3><small>Préparation de la feuille principale</small></div><strong>{dittoTotal.toLocaleString("fr-FR")}</strong></header>
      <div className="synthesis-lines">
        {usefulAccounts.length ? usefulAccounts.map((account, ai) => {
          const total = account.characters.reduce((sum, c) => sum + Math.max(0, c.ditto || 0), 0);
          return <div className="synthesis-line" key={`account-${ai}`}>
            <span>{account.account || `Compte ${ai + 1}`}</span>
            <span className="synthesis-subline">{account.characters.filter((c) => c.name.trim() || c.ditto > 0).map((c) => `${c.name || "Perso"} ${c.ditto}`).join(" · ") || "Aucun personnage renseigné"}</span>
            <b>{total.toLocaleString("fr-FR")}</b>
          </div>;
        }) : <div className="synthesis-empty">Aucune donnée Ditto renseignée.</div>}
      </div>
    </section>

    <section className="synthesis-block">
      <header><span className="synthesis-symbol">¥</span><div><h3>GTL</h3><small>Ventes à récupérer</small></div><strong>{formatYen(gtlTotal)}</strong></header>
      <div className="synthesis-lines">
        {usefulGtl.length ? usefulGtl.map((row) => <div className="synthesis-line" key={row.id}>
          <span>{row.item || "Item / Pokémon"}</span>
          <span className="synthesis-subline">{Math.max(0,row.quantity)} × {formatYen(row.unitPrice)}</span>
          <b>{formatYen(row.unitPrice * row.quantity)}</b>
        </div>) : <div className="synthesis-empty">Aucune vente GTL renseignée.</div>}
      </div>
    </section>

    <section className="synthesis-block">
      <header><span className="synthesis-symbol">◇</span><div><h3>Items</h3><small>Inventaire suivi</small></div><strong>{itemTotal.toLocaleString("fr-FR")}</strong></header>
      <div className="synthesis-icon-grid">
        {usefulItems.length ? usefulItems.map(({ index, quantity }) => <div className={`synthesis-icon-row ${ITEM_ROWS[index]?.fossil ? "fossil" : ""}`} key={ITEM_ROWS[index]?.key ?? index}>
          <span className="synthesis-item-icons">{ITEM_ROWS[index].iconSources.slice(0,1).map((url)=><img key={url} src={url} alt=""/>)}{(ITEM_ROWS[index].extraIcons ?? []).map((url)=><img className="extra" key={url} src={url} alt=""/>)}</span><span>{ITEM_ROWS[index].label}</span>
          <b>× {quantity.toLocaleString("fr-FR")}</b>
        </div>) : <div className="synthesis-empty">Aucun item renseigné.</div>}
      </div>
    </section>

    <section className="synthesis-block">
      <header><AlphaIcon/><div><h3>Alphas</h3><small>Pokémon Alpha possédés</small></div><strong>{alphaTotal.toLocaleString("fr-FR")}</strong></header>
      <div className="synthesis-lines">
        {usefulAlphas.length ? usefulAlphas.map((row) => <div className="synthesis-line" key={row.id}>
          <span className="synthesis-pokemon">{row.pokemonId ? <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${row.pokemonId}.png`} alt="" /> : <AlphaIcon/>}<span>{row.pokemonName || (row.pokemonId ? `Pokémon #${row.pokemonId}` : "Pokémon non choisi")}</span></span>
          <span className="synthesis-subline">Alpha</span>
          <b>× {Math.max(0,row.quantity).toLocaleString("fr-FR")}</b>
        </div>) : <div className="synthesis-empty">Aucun Alpha renseigné.</div>}
      </div>
    </section>

    <section className="synthesis-block">
      <header><span className="synthesis-symbol">◈</span><div><h3>Breeder</h3><small>Répartition par groupe d'œuf</small></div><strong>{breederTotal.toLocaleString("fr-FR")}</strong></header>
      <div className="synthesis-lines">
        {usefulBreeders.length ? usefulBreeders.map((row) => <div className="synthesis-line" key={row.id}>
          <span className="synthesis-pokemon"><AlphaIcon crossed={row.kind === "normal"}/><span>{row.kind === "alpha" ? "Alpha" : "Non Alpha"}</span></span>
          <span className="synthesis-subline">{row.eggGroup}</span>
          <b>× {Math.max(0,row.quantity).toLocaleString("fr-FR")}</b>
        </div>) : <div className="synthesis-empty">Aucun breeder renseigné.</div>}
      </div>
    </section>
  </div>;
}

export function ShinyWarSynthesisSheet({
  accounts,
  extra,
  userId,
}: {
  accounts: SynthesisAccount[];
  extra: ShinyWarExtraSheets;
  userId: string;
}) {
  const [reply, setReply] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    void loadShinyWarReview(userId)
      .then((review) => {
        if (disposed) return;
        setReply(review?.message ?? "");
        setUpdatedAt(review?.updatedAt ?? null);
      })
      .catch(() => {});
    return () => { disposed = true; };
  }, [userId]);

  return <div className="synthesis-sheet">
    <SynthesisOverview accounts={accounts} extra={extra} />
    <section className="synthesis-reply readonly">
      <header><MessageSquareText size={18}/><div><h3>Réponse Prépa Alya</h3><small>{updatedAt ? `Dernière mise à jour ${new Date(updatedAt).toLocaleString("fr-FR")}` : "Aucune réponse pour le moment"}</small></div></header>
      <div className={reply ? "synthesis-reply-message" : "synthesis-reply-empty"}>
        {reply || "Les responsables Alya pourront laisser ici un message sur ta préparation."}
      </div>
    </section>
  </div>;
}

export function StaffSynthesisReply({
  targetUserId,
  authorUserId,
}: {
  targetUserId: string;
  authorUserId: string;
}) {
  const [message, setMessage] = useState("");
  const [original, setOriginal] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [state, setState] = useState<"loading"|"ready"|"saving"|"saved"|"error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    setState("loading");
    void loadShinyWarReview(targetUserId).then((review) => {
      if (disposed) return;
      const value = review?.message ?? "";
      setMessage(value);
      setOriginal(value);
      setUpdatedAt(review?.updatedAt ?? null);
      setState("ready");
    }).catch((err) => {
      if (disposed) return;
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    });
    return () => { disposed = true; };
  }, [targetUserId]);

  const save = async () => {
    setState("saving");
    setError("");
    try {
      await saveShinyWarReview(targetUserId, authorUserId, message);
      setOriginal(message.trim());
      setMessage(message.trim());
      setUpdatedAt(new Date().toISOString());
      setState("saved");
      window.setTimeout(() => setState("ready"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  };

  return <section className="synthesis-reply editable">
    <header><MessageSquareText size={18}/><div><h3>Répondre à la synthèse</h3><small>{updatedAt ? `Dernière réponse ${new Date(updatedAt).toLocaleString("fr-FR")}` : "Visible par le joueur sur sa feuille Synthèse"}</small></div></header>
    <textarea
      value={message}
      onChange={(event) => setMessage(event.target.value)}
      maxLength={4000}
      placeholder="Écris ici ton retour sur la préparation du joueur…"
    />
    <div className="synthesis-reply-actions">
      <small>{message.length}/4000</small>
      {error && <span className="synthesis-reply-error">{error}</span>}
      <button type="button" onClick={() => void save()} disabled={state === "saving" || message.trim() === original.trim()}>
        {state === "saving" ? <span className="synthesis-mini-spin"/> : state === "saved" ? <CheckCircle2 size={15}/> : <Save size={15}/>}
        {state === "saving" ? "Enregistrement…" : state === "saved" ? "Enregistré" : "Enregistrer la réponse"}
      </button>
    </div>
  </section>;
}
