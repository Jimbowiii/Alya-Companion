import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Minus, PackageOpen, Plus, ShoppingCart, Table2 } from "lucide-react";
import { loadCloudShinyWar, saveCloudShinyWar } from "../shared/auth";
import { createGtlRow, loadCloudExtra, loadLocalExtra, saveCloudExtra, saveLocalExtra, type GtlRow, type ShinyWarExtraSheets } from "../shinyWarExtraSheets";
import "../shiny-war-extra-mobile.css";
import { AlphaSheet } from "../AlphaSheet";
import { BreederSheet } from "../BreederSheet";
import { ShinyWarSynthesisSheet } from "../ShinyWarSynthesis";

import { SHINY_WAR_ITEM_ROWS } from "../shinyWarItemDefinitions";
type Character = { name: string; ditto: number };
type Account = { account: string; characters: Character[] };
type Sheet = "ditto" | "gtl" | "items" | "alphas" | "breeder" | "synthesis";
const STORAGE_KEY = "alya-companion-shiny-war-v1";
const TARGET = 660;
const DEFAULT_ACCOUNTS = 10;
const ITEM_ICON_SOURCES: string[][] = SHINY_WAR_ITEM_ROWS.map((row) => row.iconSources);
const ITEM_LABELS = SHINY_WAR_ITEM_ROWS.map((row) => row.label);
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

function emptyAccount(): Account { return { account:"", characters:Array.from({length:3},()=>({name:"",ditto:0})) }; }
function normalize(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return Array.from({length:DEFAULT_ACCOUNTS},emptyAccount);
  const count = Math.max(DEFAULT_ACCOUNTS, raw.length);
  return Array.from({length:count},(_,ai)=>{
    const a = raw[ai] && typeof raw[ai] === "object" ? raw[ai] as any : {};
    const chars = Array.isArray(a.characters) ? a.characters : [];
    return { account:typeof a.account === "string"?a.account:"", characters:Array.from({length:3},(_,ci)=>{const c=chars[ci]&&typeof chars[ci]==="object"?chars[ci] as any:{};const n=Number(c.ditto);return {name:typeof c.name==="string"?c.name:"",ditto:Number.isFinite(n)?Math.max(0,Math.trunc(n)):0};}) };
  });
}
function loadLocalDitto(){try{return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)??"[]"));}catch{return normalize([]);}}
function formatYen(n:number){return `${Math.max(0,Math.trunc(n)).toLocaleString("fr-FR")} ¥`;}

export function ShinyWarMobilePage({ userId }: { userId: string }) {
  const [sheet,setSheet]=useState<Sheet>("ditto");
  const [accounts,setAccounts]=useState<Account[]>(loadLocalDitto);
  const [extra,setExtra]=useState<ShinyWarExtraSheets>(loadLocalExtra);
  const [cloudReady,setCloudReady]=useState(false);
  const [cloudState,setCloudState]=useState<"syncing"|"synced"|"error">("syncing");

  useEffect(()=>{let cancelled=false;setCloudReady(false);setCloudState("syncing");void Promise.all([loadCloudShinyWar(userId),loadCloudExtra(userId)]).then(async([d,e])=>{if(cancelled)return;if(d)setAccounts(normalize(d));else await saveCloudShinyWar(userId,accounts);if(e)setExtra(e);else await saveCloudExtra(userId,extra);if(!cancelled){setCloudReady(true);setCloudState("synced");}}).catch(()=>{if(!cancelled){setCloudReady(true);setCloudState("error");}});return()=>{cancelled=true;};},[userId]);
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(accounts));}catch{}if(!cloudReady)return;setCloudState("syncing");const t=window.setTimeout(()=>void saveCloudShinyWar(userId,accounts).then(()=>setCloudState("synced")).catch(()=>setCloudState("error")),600);return()=>window.clearTimeout(t);},[accounts,cloudReady,userId]);
  useEffect(()=>{saveLocalExtra(extra);if(!cloudReady)return;setCloudState("syncing");const t=window.setTimeout(()=>void saveCloudExtra(userId,extra).then(()=>setCloudState("synced")).catch(()=>setCloudState("error")),600);return()=>window.clearTimeout(t);},[extra,cloudReady,userId]);

  const dittoTotal=useMemo(()=>accounts.flatMap(a=>a.characters).reduce((s,c)=>s+c.ditto,0),[accounts]);
  const complete=useMemo(()=>accounts.flatMap(a=>a.characters).filter(c=>c.ditto>=TARGET).length,[accounts]);
  const gtlTotal=useMemo(()=>extra.gtlRows.reduce((s,r)=>s+r.unitPrice*r.quantity,0),[extra.gtlRows]);
  const itemTotal=useMemo(()=>extra.itemQuantities.reduce((s,q,i)=>s+q*ITEM_UNIT_VALUES[i],0),[extra.itemQuantities]);

  const patchAccount=(ai:number,patch:Partial<Account>)=>setAccounts(cur=>cur.map((a,i)=>i===ai?{...a,...patch}:a));
  const patchChar=(ai:number,ci:number,patch:Partial<Character>)=>setAccounts(cur=>cur.map((a,i)=>i===ai?{...a,characters:a.characters.map((c,j)=>j===ci?{...c,...patch}:c)}:a));
  const patchGtl=(id:string,patch:Partial<GtlRow>)=>setExtra(cur=>({...cur,gtlRows:cur.gtlRows.map(r=>r.id===id?{...r,...patch}:r)}));

  return <section className="mobile-page shiny-mobile-v2">
    <header className="mobile-page-header">
      <div><span>SHINY-WARS</span><h1>{sheet==="ditto"?"Suivi Ditto":sheet==="gtl"?"GTL":sheet==="items"?"Items":sheet==="alphas"?"Alphas":sheet==="breeder"?"Breeder":"Synthèse"}</h1><p>{sheet==="ditto"?"Ta feuille Ditto synchronisée.":sheet==="gtl"?"Tes ventes à récupérer.":sheet==="items"?"Inventaire rapide des items.":sheet==="alphas"?"Tes Pokémon Alpha, synchronisés avec ALYA Cloud.":sheet==="breeder"?"Tes breeders, synchronisés avec ALYA Cloud.":"Vue globale de toute ta préparation Shiny-War."}</p></div>
      <div className={`sync-pill ${cloudState}`}>{cloudState==="synced"?"Cloud OK":cloudState==="error"?"Local":"Sync…"}</div>
    </header>

    <div className="shiny-mobile-tabs">
      <button className={sheet==="ditto"?"active":""} onClick={()=>setSheet("ditto")}><Table2 size={15}/>Ditto</button>
      <button className={sheet==="gtl"?"active":""} onClick={()=>setSheet("gtl")}><ShoppingCart size={15}/>GTL</button>
      <button className={sheet==="items"?"active":""} onClick={()=>setSheet("items")}><PackageOpen size={15}/>Items</button>
      <button className={sheet==="alphas"?"active":""} onClick={()=>setSheet("alphas")}><span aria-hidden="true">✦</span>Alphas</button>
      <button className={sheet==="breeder"?"active":""} onClick={()=>setSheet("breeder")}><span aria-hidden="true">◈</span>Breeder</button>
      <button className={sheet==="synthesis"?"active":""} onClick={()=>setSheet("synthesis")}><span aria-hidden="true">◎</span>Synthèse</button>
    </div>

    {sheet==="ditto" && <>
      <div className="mobile-stats"><article><strong>{dittoTotal.toLocaleString("fr-FR")}</strong><span>Total Ditto</span></article><article><strong>{complete}/{accounts.length*3}</strong><span>à 660</span></article></div>
      <div className="mobile-inline-actions"><button onClick={()=>setAccounts(a=>[...a,emptyAccount()])}><Plus size={16}/>Compte</button><button disabled={accounts.length<=1} onClick={()=>setAccounts(a=>a.slice(0,-1))}><Minus size={16}/>Dernier</button></div>
      <div className="mobile-card-list">{accounts.map((a,ai)=><article className="mobile-card" key={ai}><div className="mobile-card-title"><div><small>COMPTE {String(ai+1).padStart(2,"0")}</small><h2>{a.account||`Compte ${ai+1}`}</h2></div><strong>{a.characters.reduce((s,c)=>s+c.ditto,0)}</strong></div><label className="mobile-field"><span>Nom du compte</span><input value={a.account} onChange={e=>patchAccount(ai,{account:e.target.value})}/></label>{a.characters.map((c,ci)=><div className="shiny-mobile-character" key={ci}><input value={c.name} placeholder={`Personnage ${ci+1}`} onChange={e=>patchChar(ai,ci,{name:e.target.value})}/><input className={c.ditto>=TARGET?"target":""} type="number" min="0" value={c.ditto} onChange={e=>patchChar(ai,ci,{ditto:Math.max(0,Number.parseInt(e.target.value||"0",10)||0)})}/></div>)}</article>)}</div>
    </>}

    {sheet==="gtl" && <>
      <div className="mobile-stats"><article><strong>{extra.gtlRows.length}</strong><span>lignes</span></article><article><strong>{formatYen(gtlTotal)}</strong><span>à récupérer</span></article></div>
      <div className="mobile-inline-actions"><button disabled={!extra.gtlRows.length} onClick={()=>setExtra(cur=>({...cur,gtlRows:cur.gtlRows.slice(0,-1)}))}><Minus size={16}/>Ligne</button><button onClick={()=>setExtra(cur=>({...cur,gtlRows:[...cur.gtlRows,createGtlRow()]}))}><Plus size={16}/>Ligne</button></div>
      <div className="mobile-card-list">{extra.gtlRows.length===0&&<div className="shiny-mobile-empty">Ajoute une ligne pour commencer.</div>}{extra.gtlRows.map((r,index)=><article className="mobile-card shiny-gtl-card" key={r.id}><small>LIGNE {String(index+1).padStart(2,"0")}</small><label className="mobile-field"><span>Item / Pokémon</span><input value={r.item} onChange={e=>patchGtl(r.id,{item:e.target.value})}/></label><div className="shiny-mobile-two"><label className="mobile-field"><span>Prix/u</span><input type="number" min="0" value={r.unitPrice} onChange={e=>patchGtl(r.id,{unitPrice:Math.max(0,Number.parseInt(e.target.value||"0",10)||0)})}/></label><label className="mobile-field"><span>Quantité</span><input type="number" min="0" value={r.quantity} onChange={e=>patchGtl(r.id,{quantity:Math.max(0,Number.parseInt(e.target.value||"0",10)||0)})}/></label></div><div className="shiny-mobile-row-total"><span>Total</span><strong>{formatYen(r.unitPrice*r.quantity)}</strong></div></article>)}</div>
      <div className="shiny-mobile-grand"><span>Total à récupérer</span><strong>{formatYen(gtlTotal)}</strong></div>
    </>}

    {sheet==="items" && <>
      <div className="mobile-stats"><article><strong>{ITEM_ICON_SOURCES.length}</strong><span>items</span></article><article><strong>{itemTotal.toLocaleString("fr-FR")}</strong><span>total</span></article></div>
      <div className="mobile-card-list shiny-items-mobile-list">{ITEM_ICON_SOURCES.map((sources,index)=><article className={`mobile-card shiny-item-mobile ${SHINY_WAR_ITEM_ROWS[index]?.fossil ? "fossil" : ""}`} key={SHINY_WAR_ITEM_ROWS[index]?.key ?? index}><div className={`shiny-item-mobile-heading ${index < 8 ? "no-label" : ""}`}><div className="shiny-item-mobile-icon"><ShinyWarItemIcons sources={sources} index={index}/></div>{index >= 8 ? <strong>{ITEM_LABELS[index]}</strong> : null}</div><label className="mobile-field"><span>Quantité</span><input type="number" min="0" value={extra.itemQuantities[index]??0} onChange={e=>setExtra(cur=>({...cur,itemQuantities:cur.itemQuantities.map((q,i)=>i===index?Math.max(0,Number.parseInt(e.target.value||"0",10)||0):q)}))}/></label><div className="shiny-item-mobile-total"><span>Total</span><strong>{((extra.itemQuantities[index]??0)*ITEM_UNIT_VALUES[index]).toLocaleString("fr-FR")}</strong></div></article>)}</div>
      <div className="shiny-mobile-grand"><span>Total</span><strong>{itemTotal.toLocaleString("fr-FR")}</strong></div>
    </>}

    {sheet==="alphas" && <AlphaSheet rows={extra.alphaRows} onChange={(alphaRows)=>setExtra(cur=>({...cur,alphaRows}))} />}
    {sheet==="breeder" && <BreederSheet rows={extra.breederRows} onChange={(breederRows)=>setExtra(cur=>({...cur,breederRows}))} />}
    {sheet==="synthesis" && <ShinyWarSynthesisSheet accounts={accounts} extra={extra} userId={userId} />}

    <div className={`shiny-mobile-cloud-note ${cloudState}`}><CheckCircle2 size={14}/>{cloudState==="syncing"?"Synchronisation…":cloudState==="error"?"Sauvegarde locale":"Synchronisé Alya Cloud"}</div>
  </section>;
}
