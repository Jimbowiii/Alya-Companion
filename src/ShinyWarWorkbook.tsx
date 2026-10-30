import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Minus, Plus, Table2, ShoppingCart, PackageOpen, ImageIcon } from "lucide-react";
import { loadCloudShinyWar, saveCloudShinyWar } from "./auth";
import { createGtlRow, loadCloudExtra, loadLocalExtra, saveCloudExtra, saveLocalExtra, type GtlRow, type ShinyWarExtraSheets } from "./shinyWarExtraSheets";
import "./shiny-war-extra.css";
import { AlphaSheet } from "./AlphaSheet";
import { BreederSheet } from "./BreederSheet";
import { ShinyWarSynthesisSheet } from "./ShinyWarSynthesis";

import { SHINY_WAR_ITEM_ROWS } from "./shinyWarItemDefinitions";
type ShinyWarCharacter = { name: string; ditto: number };
type ShinyWarAccount = { account: string; characters: ShinyWarCharacter[] };
type Sheet = "ditto" | "gtl" | "items" | "alphas" | "breeder" | "synthesis";

const STORAGE_KEY = "alya-companion-shiny-war-v1";
const ACCOUNT_COUNT = 10;
const CHARACTERS_PER_ACCOUNT = 3;
const DITTO_TARGET = 660;

const ITEM_ICON_SOURCES: string[][] = SHINY_WAR_ITEM_ROWS.map((row) => row.iconSources);
const ITEM_LABELS = SHINY_WAR_ITEM_ROWS.map((row) => row.label);
// Valeurs unitaires prêtes à être changées plus tard sans rendre la colonne modifiable.
const ITEM_UNIT_VALUES = SHINY_WAR_ITEM_ROWS.map((row) => row.unitValue);
function ShinyWarItemIcon({ sources, index }: { sources: string[]; index: number }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];
  if (!source) {
    return <span className="shiny-item-icon-fallback" aria-label={`Item ${index + 1}`}>?</span>;
  }
  return (
    <img
      src={source}
      alt={`Item ${index + 1}`}
      referrerPolicy="no-referrer"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}


function ShinyWarItemIcons({ sources, index }: { sources: string[]; index: number }) {
  const extras = SHINY_WAR_ITEM_ROWS[index]?.extraIcons ?? [];
  return <span className="shiny-item-icon-stack">
    <ShinyWarItemIcon sources={sources} index={index}/>
    {extras.map((url, extraIndex) => <img className="shiny-item-extra-icon" key={`${url}-${extraIndex}`} src={url} alt="" referrerPolicy="no-referrer"/>)}
  </span>;
}

function emptyAccount(): ShinyWarAccount {
  return { account: "", characters: Array.from({ length: CHARACTERS_PER_ACCOUNT }, () => ({ name: "", ditto: 0 })) };
}
function normalizeDitto(raw: unknown): ShinyWarAccount[] {
  if (!Array.isArray(raw)) return Array.from({ length: ACCOUNT_COUNT }, emptyAccount);
  const count = Math.max(ACCOUNT_COUNT, raw.length);
  return Array.from({ length: count }, (_, ai) => {
    const a = raw[ai] && typeof raw[ai] === "object" ? raw[ai] as any : {};
    const chars = Array.isArray(a.characters) ? a.characters : [];
    return {
      account: typeof a.account === "string" ? a.account : "",
      characters: Array.from({ length: CHARACTERS_PER_ACCOUNT }, (_, ci) => {
        const c = chars[ci] && typeof chars[ci] === "object" ? chars[ci] as any : {};
        const n = Number(c.ditto);
        return { name: typeof c.name === "string" ? c.name : "", ditto: Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0 };
      }),
    };
  });
}
function loadLocalDitto() {
  try { return normalizeDitto(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); }
  catch { return normalizeDitto([]); }
}
function isEmptyAccount(a: ShinyWarAccount) { return !a.account.trim() && a.characters.every(c => !c.name.trim() && c.ditto === 0); }
function formatYen(value: number) { return `${Math.max(0, Math.trunc(value)).toLocaleString("fr-FR")} ¥`; }

export function ShinyWarWorkbook({ userId, onEditBackground }: { userId: string; onEditBackground?: () => void }) {
  const [sheet, setSheet] = useState<Sheet>("ditto");
  const [accounts, setAccounts] = useState<ShinyWarAccount[]>(loadLocalDitto);
  const [extra, setExtra] = useState<ShinyWarExtraSheets>(loadLocalExtra);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudState, setCloudState] = useState<"syncing" | "synced" | "error">("syncing");

  useEffect(() => {
    let cancelled = false;
    setCloudReady(false); setCloudState("syncing");
    void Promise.all([loadCloudShinyWar(userId), loadCloudExtra(userId)])
      .then(async ([cloudDitto, cloudExtra]) => {
        if (cancelled) return;
        if (cloudDitto) setAccounts(normalizeDitto(cloudDitto)); else await saveCloudShinyWar(userId, accounts);
        if (cloudExtra) setExtra(cloudExtra); else await saveCloudExtra(userId, extra);
        if (!cancelled) { setCloudReady(true); setCloudState("synced"); }
      })
      .catch(() => { if (!cancelled) { setCloudReady(true); setCloudState("error"); } });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); } catch {}
    if (!cloudReady) return;
    setCloudState("syncing");
    const t = window.setTimeout(() => void saveCloudShinyWar(userId, accounts).then(() => setCloudState("synced")).catch(() => setCloudState("error")), 550);
    return () => window.clearTimeout(t);
  }, [accounts, cloudReady, userId]);

  useEffect(() => {
    saveLocalExtra(extra);
    if (!cloudReady) return;
    setCloudState("syncing");
    const t = window.setTimeout(() => void saveCloudExtra(userId, extra).then(() => setCloudState("synced")).catch(() => setCloudState("error")), 550);
    return () => window.clearTimeout(t);
  }, [extra, cloudReady, userId]);

  const dittoTotal = useMemo(() => accounts.reduce((s,a)=>s+a.characters.reduce((x,c)=>x+c.ditto,0),0), [accounts]);
  const completed = useMemo(() => accounts.reduce((s,a)=>s+a.characters.filter(c=>c.ditto>=DITTO_TARGET).length,0), [accounts]);
  const gtlTotal = useMemo(() => extra.gtlRows.reduce((s,r)=>s+r.unitPrice*r.quantity,0), [extra.gtlRows]);
  const itemTotal = useMemo(() => extra.itemQuantities.reduce((s,q,i)=>s+q*ITEM_UNIT_VALUES[i],0), [extra.itemQuantities]);

  const updateAccount = (ai:number, patch:Partial<ShinyWarAccount>) => setAccounts(cur=>cur.map((a,i)=>i===ai?{...a,...patch}:a));
  const updateCharacter = (ai:number, ci:number, patch:Partial<ShinyWarCharacter>) => setAccounts(cur=>cur.map((a,i)=>i===ai?{...a,characters:a.characters.map((c,j)=>j===ci?{...c,...patch}:c)}:a));
  const addAccount = () => setAccounts(cur=>[...cur,emptyAccount()]);
  const removeAccount = () => setAccounts(cur => {
    if (cur.length <= 1) return cur;
    const last = cur[cur.length-1];
    if (!isEmptyAccount(last) && !window.confirm(`Supprimer le compte ${cur.length} et ses 3 personnages ?`)) return cur;
    return cur.slice(0,-1);
  });

  const updateGtl = (id:string, patch:Partial<GtlRow>) => setExtra(cur=>({...cur,gtlRows:cur.gtlRows.map(r=>r.id===id?{...r,...patch}:r)}));
  const addGtl = () => setExtra(cur=>({...cur,gtlRows:[...cur.gtlRows,createGtlRow()]}));
  const removeGtl = () => setExtra(cur=>({...cur,gtlRows:cur.gtlRows.slice(0,-1)}));
  const updateItemQty = (index:number, value:number) => setExtra(cur=>({...cur,itemQuantities:cur.itemQuantities.map((q,i)=>i===index?Math.max(0,Math.trunc(value||0)):q)}));

  const title = sheet === "ditto" ? "Suivi Ditto" : sheet === "gtl" ? "GTL" : sheet === "items" ? "Items" : sheet === "alphas" ? "Alphas" : sheet === "breeder" ? "Breeder" : "Synthèse";
  return <section className="shiny-war-page">
    <header className="page-header shiny-war-header">
      <div><p className="eyebrow">Shiny-War</p><h1>{title}</h1><p>{sheet === "ditto" ? "Comptes, personnages et Ditto." : sheet === "gtl" ? "Ce que tu as à récupérer de tes ventes GTL." : sheet === "items" ? "Suivi rapide de tes items." : sheet === "alphas" ? "Suivi de tes Pokémon Alpha des cinq premières générations." : sheet === "breeder" ? "Suivi de tes breeders par type et groupe d’œuf." : "Vue globale de toute ta préparation Shiny-War."}</p></div>
      <div className="shiny-war-summary">
        {sheet === "ditto" && <><div><span>Total actuel</span><strong>{dittoTotal.toLocaleString("fr-FR")}</strong></div><div><span>Comptes</span><strong>{accounts.length}</strong></div><div><span>À 660</span><strong>{completed}/{accounts.length*3}</strong></div></>}
        {sheet === "gtl" && <><div><span>Lignes</span><strong>{extra.gtlRows.length}</strong></div><div className="wide"><span>À récupérer</span><strong>{formatYen(gtlTotal)}</strong></div></>}
        {sheet === "items" && <><div><span>Références</span><strong>{ITEM_ICON_SOURCES.length}</strong></div><div className="wide"><span>Total items</span><strong>{itemTotal.toLocaleString("fr-FR")}</strong></div></>}
      </div>
      {onEditBackground && (
        <button type="button" className="shiny-war-edit-background" onClick={onEditBackground}>
          <ImageIcon size={16} />
          Fond
        </button>
      )}
    </header>

    <div className="shiny-war-workbook shiny-extra-workbook">
      <div className="shiny-war-sheet-tabs shiny-extra-tabs">
        <div className="shiny-extra-tab-buttons">
          <button className={sheet==="ditto"?"active":""} onClick={()=>setSheet("ditto")}><Table2 size={15}/> Ditto</button>
          <button className={sheet==="gtl"?"active":""} onClick={()=>setSheet("gtl")}><ShoppingCart size={15}/> GTL</button>
          <button className={sheet==="items"?"active":""} onClick={()=>setSheet("items")}><PackageOpen size={15}/> Items</button>
          <button className={sheet==="alphas"?"active":""} onClick={()=>setSheet("alphas")}><span aria-hidden="true">✦</span> Alphas</button>
          <button className={sheet==="breeder"?"active":""} onClick={()=>setSheet("breeder")}><span aria-hidden="true">◈</span> Breeder</button>
          <button className={sheet==="synthesis"?"active":""} onClick={()=>setSheet("synthesis")}><span aria-hidden="true">◎</span> Synthèse</button>
        </div>
        {sheet === "ditto" && <div className="shiny-war-account-actions"><button className="shiny-war-remove-account" onClick={removeAccount} disabled={accounts.length<=1}><Minus size={15}/> Supprimer</button><button className="shiny-war-add-account" onClick={addAccount}><Plus size={15}/> Ajouter un compte</button></div>}
        {sheet === "gtl" && <div className="shiny-war-account-actions"><button className="shiny-war-remove-account" onClick={removeGtl} disabled={!extra.gtlRows.length}><Minus size={15}/> Supprimer une ligne</button><button className="shiny-war-add-account" onClick={addGtl}><Plus size={15}/> Ajouter une ligne</button></div>}
      </div>

      {sheet === "ditto" && <div className="shiny-war-table-wrap"><table className="shiny-war-table"><thead><tr><th className="shiny-war-head-account">Compte</th><th className="shiny-war-head-character">Personnage</th><th className="shiny-war-head-ditto">Ditto</th><th className="shiny-war-head-total">Total</th></tr></thead><tbody>
        {accounts.map((a,ai)=>a.characters.map((c,ci)=>{const at=a.characters.reduce((s,x)=>s+x.ditto,0);return <tr key={`${ai}-${ci}`} className={ci===2?"account-end":""}>{ci===0&&<td rowSpan={3} className="shiny-war-account-cell"><span className="shiny-war-row-number">{String(ai+1).padStart(2,"0")}</span><input value={a.account} placeholder={`Compte ${ai+1}`} onChange={e=>updateAccount(ai,{account:e.target.value})}/></td>}<td className="shiny-war-character-cell"><input value={c.name} placeholder={`Personnage ${ci+1}`} onChange={e=>updateCharacter(ai,ci,{name:e.target.value})}/></td><td className={`shiny-war-ditto-cell ${c.ditto>=DITTO_TARGET?"target":c.ditto===0?"zero":"progress"}`}><input type="number" min="0" value={c.ditto} onChange={e=>updateCharacter(ai,ci,{ditto:Math.max(0,Number.parseInt(e.target.value||"0",10)||0)})}/></td>{ci===0&&<td rowSpan={3} className="shiny-war-total-cell"><strong>{at.toLocaleString("fr-FR")}</strong><span>{a.characters.filter(x=>x.ditto>=DITTO_TARGET).length} / 3 à 660</span></td>}</tr>}))}
        <tr className="shiny-war-grand-total-row"><td colSpan={3}><strong>Total général</strong><span>Somme des lignes Ditto</span></td><td><strong>{dittoTotal.toLocaleString("fr-FR")}</strong></td></tr>
      </tbody></table></div>}

      {sheet === "gtl" && <div className="shiny-war-table-wrap"><table className="shiny-war-table shiny-extra-table"><thead><tr><th>Item / Pokémon</th><th>Prix/u</th><th>Quantité</th><th>Total</th></tr></thead><tbody>
        {extra.gtlRows.length===0 && <tr><td colSpan={4} className="shiny-extra-empty">Ajoute une ligne pour commencer.</td></tr>}
        {extra.gtlRows.map((r,index)=><tr key={r.id}><td><div className="shiny-extra-index">{String(index+1).padStart(2,"0")}</div><input value={r.item} placeholder="Item / Pokémon" onChange={e=>updateGtl(r.id,{item:e.target.value})}/></td><td><input type="number" min="0" value={r.unitPrice} onChange={e=>updateGtl(r.id,{unitPrice:Math.max(0,Number.parseInt(e.target.value||"0",10)||0)})}/></td><td><input type="number" min="0" value={r.quantity} onChange={e=>updateGtl(r.id,{quantity:Math.max(0,Number.parseInt(e.target.value||"0",10)||0)})}/></td><td className="shiny-extra-total-cell"><strong>{formatYen(r.unitPrice*r.quantity)}</strong></td></tr>)}
        <tr className="shiny-war-grand-total-row"><td colSpan={3}><strong>Total à récupérer</strong><span>{extra.gtlRows.length} ligne{extra.gtlRows.length>1?"s":""}</span></td><td><strong>{formatYen(gtlTotal)}</strong></td></tr>
      </tbody></table></div>}

      {sheet === "items" && <div className="shiny-war-table-wrap"><table className="shiny-war-table shiny-items-table"><thead><tr><th>Items</th><th>Quantité</th><th>Total</th></tr></thead><tbody>
        {ITEM_ICON_SOURCES.map((sources,index)=><tr key={SHINY_WAR_ITEM_ROWS[index]?.key ?? index} className={SHINY_WAR_ITEM_ROWS[index]?.fossil ? "shiny-item-fossil-row" : ""}><td className="shiny-item-icon-cell"><div className={`shiny-item-icon-content ${index < 8 ? "no-label" : ""}`}><ShinyWarItemIcons sources={sources} index={index}/>{index >= 8 ? <span className="shiny-item-label">{ITEM_LABELS[index]}</span> : null}</div></td><td><input type="number" min="0" value={extra.itemQuantities[index]??0} onChange={e=>updateItemQty(index,Number.parseInt(e.target.value||"0",10)||0)}/></td><td className="shiny-extra-total-cell"><strong>{((extra.itemQuantities[index]??0)*ITEM_UNIT_VALUES[index]).toLocaleString("fr-FR")}</strong></td></tr>)}
        <tr className="shiny-war-grand-total-row"><td colSpan={2}><strong>Total</strong><span>Somme des {ITEM_ICON_SOURCES.length} lignes</span></td><td><strong>{itemTotal.toLocaleString("fr-FR")}</strong></td></tr>
      </tbody></table></div>}

      {sheet === "alphas" && <AlphaSheet rows={extra.alphaRows} onChange={(alphaRows) => setExtra(cur => ({ ...cur, alphaRows }))} />}
      {sheet === "breeder" && <BreederSheet rows={extra.breederRows} onChange={(breederRows) => setExtra(cur => ({ ...cur, breederRows }))} />}
      {sheet === "synthesis" && <ShinyWarSynthesisSheet accounts={accounts} extra={extra} userId={userId} />}

      <div className={`shiny-war-save-note ${cloudState}`}><CheckCircle2 size={15}/> {cloudState==="syncing"?"Synchronisation Alya…":cloudState==="error"?"Sauvegardé localement · cloud indisponible":"Sauvegardé localement + synchronisé sur Alya Cloud"}</div>
    </div>
  </section>;
}

