import { useMemo, useState } from "react";
import type { BreederRow, BreederKind, EggGroup } from "./shinyWarExtraSheets";
import "./breeder-sheet.css";

const ALPHA_ICON_URL = "https://cdn.discordapp.com/emojis/1105317329618870342.webp?size=44";

const EGG_GROUPS: Array<{ value: EggGroup; label: string }> = [
  { value: "Monster", label: "Monstre" },
  { value: "Bug", label: "Insecte" },
  { value: "Flying", label: "Vol" },
  { value: "Field", label: "Champ" },
  { value: "Fairy", label: "Fée" },
  { value: "Plant", label: "Plante" },
  { value: "Humanoid", label: "Humanoïde" },
  { value: "Mineral", label: "Minéral" },
  { value: "Chaos", label: "Chaos" },
  { value: "Dragon", label: "Dragon" },
  { value: "Water A", label: "Eau A" },
  { value: "Water B", label: "Eau B" },
  { value: "Water C", label: "Eau C" },
  { value: "Genderless", label: "Sans genre" },
  { value: "Ditto", label: "Métamorph" },
  { value: "Cannot Breed", label: "Non reproductible" },
];

function AlphaMark({ kind, compact = false }: { kind: BreederKind; compact?: boolean }) {
  return (
    <span className={`breeder-alpha-mark ${kind === "normal" ? "crossed" : ""} ${compact ? "compact" : ""}`}>
      <img src={ALPHA_ICON_URL} alt={kind === "alpha" ? "Alpha" : "Non Alpha"} />
      {kind === "normal" && <span className="breeder-alpha-slash" aria-hidden="true" />}
    </span>
  );
}

function KindPicker({
  value,
  onChange,
}: {
  value: BreederKind;
  onChange: (kind: BreederKind) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="breeder-kind-picker">
      <button type="button" className="breeder-kind-trigger" onClick={() => setOpen((current) => !current)}>
        <AlphaMark kind={value} />
        <span>{value === "alpha" ? "Alpha" : "Non Alpha"}</span>
        <b>⌄</b>
      </button>
      {open && (
        <div className="breeder-kind-menu">
          <button type="button" className={value === "alpha" ? "selected" : ""} onClick={() => { onChange("alpha"); setOpen(false); }}>
            <AlphaMark kind="alpha" compact />
            <span>Alpha</span>
          </button>
          <button type="button" className={value === "normal" ? "selected" : ""} onClick={() => { onChange("normal"); setOpen(false); }}>
            <AlphaMark kind="normal" compact />
            <span>Non Alpha</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function BreederSheet({
  rows,
  onChange,
}: {
  rows: BreederRow[];
  onChange: (rows: BreederRow[]) => void;
}) {
  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Math.max(0, Number(row.quantity) || 0), 0),
    [rows],
  );

  const updateRow = (id: string, patch: Partial<BreederRow>) => {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const addRow = () => {
    onChange([
      ...rows,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        kind: "alpha",
        eggGroup: "Monster",
        quantity: 0,
      },
    ]);
  };

  const removeRow = () => {
    if (rows.length <= 1) return;
    onChange(rows.slice(0, -1));
  };

  return (
    <div className="breeder-sheet">
      <div className="breeder-toolbar">
        <div className="breeder-stats">
          <article><span>Lignes</span><strong>{rows.length}</strong></article>
          <article><span>Total Breeders</span><strong>{total.toLocaleString("fr-FR")}</strong></article>
        </div>
        <div className="breeder-actions">
          <button type="button" onClick={removeRow} disabled={rows.length <= 1}>− Supprimer une ligne</button>
          <button type="button" className="primary" onClick={addRow}>＋ Ajouter une ligne</button>
        </div>
      </div>

      <div className="shiny-war-table-wrap">
        <table className="shiny-war-table breeder-table">
          <thead>
            <tr>
              <th>Breeder</th>
              <th>Groupe d'œuf</th>
              <th>Quantité</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <span className="breeder-row-index">{String(index + 1).padStart(2, "0")}</span>
                  <KindPicker value={row.kind} onChange={(kind) => updateRow(row.id, { kind })} />
                </td>
                <td>
                  <select
                    className="breeder-egg-select"
                    value={row.eggGroup}
                    onChange={(event) => updateRow(row.id, { eggGroup: event.target.value as EggGroup })}
                  >
                    {EGG_GROUPS.map((group) => (
                      <option value={group.value} key={group.value}>{group.label}</option>
                    ))}
                  </select>
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
                <td className="shiny-extra-total-cell">
                  <strong>{Math.max(0, row.quantity || 0).toLocaleString("fr-FR")}</strong>
                </td>
              </tr>
            ))}
            <tr className="shiny-war-grand-total-row">
              <td colSpan={3}>
                <strong>Total Breeders</strong>
                <span>{rows.length} ligne{rows.length > 1 ? "s" : ""}</span>
              </td>
              <td><strong>{total.toLocaleString("fr-FR")}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
