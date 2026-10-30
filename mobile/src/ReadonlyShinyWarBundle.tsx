import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { loadCloudShinyWar } from "./shared/auth";
import { loadCloudExtra, normalizeExtra, type ShinyWarExtraSheets } from "./shinyWarExtraSheets";
import { StaffSynthesisReply, SynthesisOverview, type SynthesisAccount } from "./ShinyWarSynthesis";
import "./shiny-war-prepa-all.css";

import { SHINY_WAR_ITEM_ROWS } from "./shinyWarItemDefinitions";
type ReadonlySheet = "synthesis" | "ditto" | "gtl" | "items" | "alphas" | "breeder";

const ITEM_ROWS = SHINY_WAR_ITEM_ROWS;

function normalizeAccounts(raw: unknown): SynthesisAccount[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, ai) => {
    const a = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const chars = Array.isArray(a.characters) ? a.characters : [];
    return {
      account: typeof a.account === "string" ? a.account : `Compte ${ai + 1}`,
      characters: Array.from({ length: 3 }, (_, ci) => {
        const c = chars[ci] && typeof chars[ci] === "object" ? chars[ci] as Record<string, unknown> : {};
        return {
          name: typeof c.name === "string" ? c.name : "",
          ditto: Math.max(0, Number(c.ditto) || 0),
        };
      }),
    };
  });
}

function Empty() {
  return <div className="prepa-all-empty">Aucune donnée enregistrée sur cette feuille.</div>;
}

export function ReadonlyShinyWarBundle({
  targetUserId,
  viewerUserId,
}: {
  targetUserId: string;
  viewerUserId: string;
}) {
  const [sheet, setSheet] = useState<ReadonlySheet>("synthesis");
  const [accounts, setAccounts] = useState<SynthesisAccount[]>([]);
  const [extra, setExtra] = useState<ShinyWarExtraSheets>(() => normalizeExtra({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError("");
    void Promise.all([loadCloudShinyWar(targetUserId), loadCloudExtra(targetUserId)])
      .then(([ditto, extraData]) => {
        if (disposed) return;
        setAccounts(normalizeAccounts(ditto));
        setExtra(extraData ?? normalizeExtra({}));
      })
      .catch((err) => {
        if (!disposed) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => { disposed = true; };
  }, [targetUserId]);

  if (loading) return <div className="prepa-all-loading"><RefreshCw className="prepa-all-spin" size={20}/> Chargement de toutes les feuilles…</div>;
  if (error) return <div className="prepa-all-error">{error}</div>;

  return <div className="prepa-all">
    <div className="prepa-all-tabs">
      <button className={sheet==="synthesis"?"active":""} onClick={()=>setSheet("synthesis")}>Synthèse</button>
      <button className={sheet==="ditto"?"active":""} onClick={()=>setSheet("ditto")}>Ditto</button>
      <button className={sheet==="gtl"?"active":""} onClick={()=>setSheet("gtl")}>GTL</button>
      <button className={sheet==="items"?"active":""} onClick={()=>setSheet("items")}>Items</button>
      <button className={sheet==="alphas"?"active":""} onClick={()=>setSheet("alphas")}>Alphas</button>
      <button className={sheet==="breeder"?"active":""} onClick={()=>setSheet("breeder")}>Breeder</button>
      <span>Lecture seule</span>
    </div>

    {sheet === "synthesis" && <div className="prepa-summary-sheet">
      <SynthesisOverview accounts={accounts} extra={extra}/>
      <StaffSynthesisReply targetUserId={targetUserId} authorUserId={viewerUserId}/>
    </div>}

    {sheet === "ditto" && <ReadonlyDitto accounts={accounts}/>}
    {sheet === "gtl" && <ReadonlyGtl extra={extra}/>}
    {sheet === "items" && <ReadonlyItems extra={extra}/>}
    {sheet === "alphas" && <ReadonlyAlphas extra={extra}/>}
    {sheet === "breeder" && <ReadonlyBreeder extra={extra}/>}
  </div>;
}

function ReadonlyDitto({ accounts }: { accounts: SynthesisAccount[] }) {
  const useful = accounts.filter((a)=>a.account.trim() || a.characters.some((c)=>c.name.trim() || c.ditto>0));
  if (!useful.length) return <Empty/>;
  const grand = useful.reduce((sum,a)=>sum+a.characters.reduce((s,c)=>s+c.ditto,0),0);
  return <div className="prepa-table-wrap"><table className="prepa-readonly-table"><thead><tr><th>Compte</th><th>Personnage</th><th>Ditto</th><th>Total</th></tr></thead><tbody>
    {useful.map((a,ai)=>a.characters.map((c,ci)=> {
      const accountTotal=a.characters.reduce((s,x)=>s+x.ditto,0);
      return <tr key={`${ai}-${ci}`}>{ci===0&&<td rowSpan={3}>{a.account||`Compte ${ai+1}`}</td>}<td>{c.name||"—"}</td><td>{c.ditto.toLocaleString("fr-FR")}</td>{ci===0&&<td rowSpan={3}><strong>{accountTotal.toLocaleString("fr-FR")}</strong></td>}</tr>;
    }))}
    <tr className="total"><td colSpan={3}>Total général</td><td><strong>{grand.toLocaleString("fr-FR")}</strong></td></tr>
  </tbody></table></div>;
}

function ReadonlyGtl({ extra }: { extra: ShinyWarExtraSheets }) {
  const rows=extra.gtlRows.filter((r)=>r.item.trim()||r.unitPrice>0||r.quantity>0);
  const total=rows.reduce((s,r)=>s+r.unitPrice*r.quantity,0);
  if(!rows.length)return <Empty/>;
  return <div className="prepa-table-wrap"><table className="prepa-readonly-table"><thead><tr><th>Item / Pokémon</th><th>Prix/u</th><th>Quantité</th><th>Total</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.item||"—"}</td><td>{r.unitPrice.toLocaleString("fr-FR")} ¥</td><td>{r.quantity}</td><td><strong>{(r.unitPrice*r.quantity).toLocaleString("fr-FR")} ¥</strong></td></tr>)}<tr className="total"><td colSpan={3}>À récupérer</td><td><strong>{total.toLocaleString("fr-FR")} ¥</strong></td></tr></tbody></table></div>;
}

function ReadonlyItems({ extra }: { extra: ShinyWarExtraSheets }) {
  const total=extra.itemQuantities.reduce((s,q)=>s+Math.max(0,q||0),0);
  return <div className="prepa-items-grid">{ITEM_ROWS.map((row,index)=><article className={row.fossil ? "fossil" : ""} key={row.key}><span className="prepa-item-icons">{row.iconSources.slice(0,1).map((url)=><img key={url} src={url} alt=""/>)}{(row.extraIcons ?? []).map((url)=><img className="extra" key={url} src={url} alt=""/>)}</span><span>{row.label}</span><strong>{Math.max(0,extra.itemQuantities[index]||0).toLocaleString("fr-FR")}</strong></article>)}<article className="grand"><span>Total</span><strong>{total.toLocaleString("fr-FR")}</strong></article></div>;
}

function ReadonlyAlphas({ extra }: { extra: ShinyWarExtraSheets }) {
  const rows=extra.alphaRows.filter((r)=>r.pokemonId||r.pokemonName.trim()||r.quantity>0);
  const total=rows.reduce((s,r)=>s+Math.max(0,r.quantity||0),0);
  if(!rows.length)return <Empty/>;
  return <div className="prepa-card-grid">{rows.map(r=><article key={r.id} className="prepa-pokemon-card">{r.pokemonId?<img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${r.pokemonId}.png`} alt=""/>:<span className="prepa-alpha-dot">α</span>}<div><strong>{r.pokemonName||`Pokémon #${r.pokemonId||"?"}`}</strong><small>Alpha</small></div><b>× {Math.max(0,r.quantity||0)}</b></article>)}<div className="prepa-grid-total">Total Alphas <strong>{total.toLocaleString("fr-FR")}</strong></div></div>;
}

function ReadonlyBreeder({ extra }: { extra: ShinyWarExtraSheets }) {
  const rows=extra.breederRows.filter((r)=>r.quantity>0);
  const total=rows.reduce((s,r)=>s+Math.max(0,r.quantity||0),0);
  if(!rows.length)return <Empty/>;
  return <div className="prepa-card-grid">{rows.map(r=><article key={r.id} className="prepa-pokemon-card"><span className={`prepa-alpha-dot ${r.kind==="normal"?"crossed":""}`}>α</span><div><strong>{r.eggGroup}</strong><small>{r.kind==="alpha"?"Alpha":"Non Alpha"}</small></div><b>× {Math.max(0,r.quantity||0)}</b></article>)}<div className="prepa-grid-total">Total Breeders <strong>{total.toLocaleString("fr-FR")}</strong></div></div>;
}
