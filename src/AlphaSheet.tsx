import { useEffect, useMemo, useState } from "react";
import type { AlphaRow } from "./shinyWarExtraSheets";
import "./alpha-sheet.css";

const ALPHA_ICON_URL = "https://cdn.discordapp.com/emojis/1105317329618870342.webp?size=44";
const POKEMON_COUNT = 649;
const POKEMON_LIST_URL = "https://pokeapi.co/api/v2/pokemon?limit=649&offset=0";
const POKEMON_NAMES_CACHE = "alya-pokemon-gen1-5-names-v1";

type PokemonOption = { id: number; name: string };

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function fallbackCatalog(): PokemonOption[] {
  return Array.from({ length: POKEMON_COUNT }, (_, index) => ({
    id: index + 1,
    name: `Pokémon #${String(index + 1).padStart(3, "0")}`,
  }));
}

function loadCachedCatalog(): PokemonOption[] {
  try {
    const raw = JSON.parse(localStorage.getItem(POKEMON_NAMES_CACHE) ?? "null");
    if (Array.isArray(raw) && raw.length === POKEMON_COUNT) return raw;
  } catch {}
  return fallbackCatalog();
}

function usePokemonCatalog() {
  const [catalog, setCatalog] = useState<PokemonOption[]>(loadCachedCatalog);

  useEffect(() => {
    let disposed = false;
    void fetch(POKEMON_LIST_URL)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Pokédex indisponible")))
      .then((payload) => {
        if (disposed || !Array.isArray(payload?.results)) return;
        const next = payload.results.slice(0, POKEMON_COUNT).map((entry: any, index: number) => ({
          id: index + 1,
          name: typeof entry?.name === "string"
            ? entry.name.split("-").map((part: string) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ")
            : `Pokémon #${String(index + 1).padStart(3, "0")}`,
        }));
        if (next.length === POKEMON_COUNT) {
          setCatalog(next);
          try { localStorage.setItem(POKEMON_NAMES_CACHE, JSON.stringify(next)); } catch {}
        }
      })
      .catch(() => {});
    return () => { disposed = true; };
  }, []);

  return catalog;
}

function PokemonPicker({
  value,
  onChange,
}: {
  value: Pick<AlphaRow, "pokemonId" | "pokemonName">;
  onChange: (pokemon: PokemonOption) => void;
}) {
  const catalog = usePokemonCatalog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-FR");
    if (!needle) return catalog;
    return catalog.filter((pokemon) =>
      pokemon.name.toLocaleLowerCase("fr-FR").includes(needle) ||
      String(pokemon.id).includes(needle)
    );
  }, [catalog, query]);

  const selectedName = value.pokemonName || (value.pokemonId ? `Pokémon #${String(value.pokemonId).padStart(3, "0")}` : "Choisir un Pokémon");

  return <>
    <button type="button" className="alpha-pokemon-trigger" onClick={() => setOpen(true)}>
      {value.pokemonId ? <img src={spriteUrl(value.pokemonId)} alt="" /> : <span className="alpha-pokemon-placeholder">?</span>}
      <span>{selectedName}</span>
      <b>⌄</b>
    </button>

    {open && <div className="alpha-picker-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpen(false);
    }}>
      <section className="alpha-picker-panel" role="dialog" aria-modal="true" aria-label="Choisir un Pokémon">
        <header>
          <div>
            <small>POKÉDEX · GEN 1 → 5</small>
            <h3>Choisir un Pokémon</h3>
          </div>
          <button type="button" className="alpha-picker-close" onClick={() => setOpen(false)}>×</button>
        </header>
        <input
          className="alpha-picker-search"
          value={query}
          autoFocus
          placeholder="Rechercher par nom ou numéro…"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="alpha-picker-list">
          {filtered.map((pokemon) => (
            <button
              type="button"
              key={pokemon.id}
              className={value.pokemonId === pokemon.id ? "selected" : ""}
              onClick={() => {
                onChange(pokemon);
                setOpen(false);
                setQuery("");
              }}
            >
              <img loading="lazy" src={spriteUrl(pokemon.id)} alt="" />
              <span>
                <small>#{String(pokemon.id).padStart(3, "0")}</small>
                <strong>{pokemon.name}</strong>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>}
  </>;
}

export function AlphaSheet({
  rows,
  onChange,
}: {
  rows: AlphaRow[];
  onChange: (rows: AlphaRow[]) => void;
}) {
  const total = useMemo(() => rows.reduce((sum, row) => sum + Math.max(0, row.quantity || 0), 0), [rows]);

  const updateRow = (id: string, patch: Partial<AlphaRow>) => {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const addRow = () => onChange([
    ...rows,
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      pokemonId: null,
      pokemonName: "",
      quantity: 0,
    },
  ]);

  const removeRow = () => {
    if (rows.length <= 1) return;
    onChange(rows.slice(0, -1));
  };

  return <div className="alpha-sheet">
    <div className="alpha-sheet-toolbar">
      <div className="alpha-sheet-stats">
        <article><span>Lignes</span><strong>{rows.length}</strong></article>
        <article><span>Total Alphas</span><strong>{total.toLocaleString("fr-FR")}</strong></article>
      </div>
      <div className="alpha-sheet-actions">
        <button type="button" onClick={removeRow} disabled={rows.length <= 1}>− Supprimer une ligne</button>
        <button type="button" className="primary" onClick={addRow}>＋ Ajouter une ligne</button>
      </div>
    </div>

    <div className="shiny-war-table-wrap">
      <table className="shiny-war-table alpha-table">
        <thead><tr><th>Alphas</th><th>Pokémon</th><th>Quantité</th><th>Total</th></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className="alpha-icon-cell">
                <span className="alpha-index">{String(index + 1).padStart(2, "0")}</span>
                <img src={ALPHA_ICON_URL} alt="Alpha" />
              </td>
              <td className="alpha-pokemon-cell">
                <PokemonPicker
                  value={row}
                  onChange={(pokemon) => updateRow(row.id, { pokemonId: pokemon.id, pokemonName: pokemon.name })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={row.quantity}
                  onChange={(event) => updateRow(row.id, {
                    quantity: Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0),
                  })}
                />
              </td>
              <td className="shiny-extra-total-cell"><strong>{Math.max(0, row.quantity || 0).toLocaleString("fr-FR")}</strong></td>
            </tr>
          ))}
          <tr className="shiny-war-grand-total-row">
            <td colSpan={3}><strong>Total Alphas</strong><span>{rows.length} ligne{rows.length > 1 ? "s" : ""}</span></td>
            <td><strong>{total.toLocaleString("fr-FR")}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>;
}
