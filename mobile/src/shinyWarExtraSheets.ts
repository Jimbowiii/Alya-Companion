import { supabase } from "./shared/auth";

export type GtlRow = {
  id: string;
  item: string;
  unitPrice: number;
  quantity: number;
};

export type AlphaRow = {
  id: string;
  pokemonId: number | null;
  pokemonName: string;
  quantity: number;
};

export type BreederKind = "alpha" | "normal";

export type EggGroup =
  | "Monster"
  | "Bug"
  | "Flying"
  | "Field"
  | "Fairy"
  | "Plant"
  | "Humanoid"
  | "Mineral"
  | "Chaos"
  | "Dragon"
  | "Water A"
  | "Water B"
  | "Water C"
  | "Genderless"
  | "Ditto"
  | "Cannot Breed";

export type BreederRow = {
  id: string;
  kind: BreederKind;
  eggGroup: EggGroup;
  quantity: number;
};

export type ShinyWarExtraSheets = {
  gtlRows: GtlRow[];
  itemQuantities: number[];
  alphaRows: AlphaRow[];
  breederRows: BreederRow[];
};

export const SHINY_EXTRA_LOCAL_KEY = "alya-shiny-war-extra-v1";
export const ITEM_COUNT = 17;

const EGG_GROUP_VALUES: EggGroup[] = [
  "Monster", "Bug", "Flying", "Field", "Fairy", "Plant", "Humanoid", "Mineral",
  "Chaos", "Dragon", "Water A", "Water B", "Water C", "Genderless", "Ditto", "Cannot Breed",
];

export function createGtlRow(): GtlRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    item: "",
    unitPrice: 0,
    quantity: 1,
  };
}

export function createAlphaRow(): AlphaRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    pokemonId: null,
    pokemonName: "",
    quantity: 0,
  };
}

export function createBreederRow(): BreederRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    kind: "alpha",
    eggGroup: "Monster",
    quantity: 0,
  };
}

function normalizeAlphaRow(raw: unknown, index: number): AlphaRow {
  const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const pokemonIdValue = Number(row.pokemonId);
  const quantityValue = Number(row.quantity);
  const pokemonId = Number.isInteger(pokemonIdValue) && pokemonIdValue >= 1 && pokemonIdValue <= 649
    ? pokemonIdValue
    : null;
  return {
    id: typeof row.id === "string" && row.id ? row.id : `alpha-${index}-${Date.now()}`,
    pokemonId,
    pokemonName: typeof row.pokemonName === "string" ? row.pokemonName : "",
    quantity: Number.isFinite(quantityValue) ? Math.max(0, Math.trunc(quantityValue)) : 0,
  };
}

function normalizeBreederRow(raw: unknown, index: number): BreederRow {
  const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const quantityValue = Number(row.quantity);
  const rawGroup = typeof row.eggGroup === "string" ? row.eggGroup as EggGroup : "Monster";
  return {
    id: typeof row.id === "string" && row.id ? row.id : `breeder-${index}-${Date.now()}`,
    kind: row.kind === "normal" ? "normal" : "alpha",
    eggGroup: EGG_GROUP_VALUES.includes(rawGroup) ? rawGroup : "Monster",
    quantity: Number.isFinite(quantityValue) ? Math.max(0, Math.trunc(quantityValue)) : 0,
  };
}

export function normalizeExtra(raw: unknown): ShinyWarExtraSheets {
  const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};

  const rawRows = Array.isArray(record.gtlRows) ? record.gtlRows : [];
  const gtlRows = rawRows.map((row, index) => {
    const r = row && typeof row === "object" ? row as Record<string, unknown> : {};
    const unitPrice = Number(r.unitPrice);
    const quantity = Number(r.quantity);
    return {
      id: typeof r.id === "string" ? r.id : `legacy-${index}`,
      item: typeof r.item === "string" ? r.item : "",
      unitPrice: Number.isFinite(unitPrice) ? Math.max(0, Math.trunc(unitPrice)) : 0,
      quantity: Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0,
    } satisfies GtlRow;
  });

  const rawItems = Array.isArray(record.itemQuantities) ? record.itemQuantities : [];
  // Migration v1.4.0:
  // les 7 premières quantités sont conservées. L'ancien total générique "Fossiles"
  // n'est pas attribué arbitrairement à un fossile précis; les 10 nouvelles lignes
  // (nouvel item + 9 fossiles détaillés) démarrent donc à zéro.
  const legacyEightItems = rawItems.length === 8;
  const itemQuantities = Array.from({ length: ITEM_COUNT }, (_, index) => {
    if (legacyEightItems && index >= 7) return 0;
    const value = Number(rawItems[index]);
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  });

  const rawAlphas = Array.isArray(record.alphaRows) ? record.alphaRows : [];
  const alphaRows = rawAlphas.length ? rawAlphas.map(normalizeAlphaRow) : [createAlphaRow()];

  const rawBreeders = Array.isArray(record.breederRows) ? record.breederRows : [];
  const breederRows = rawBreeders.length ? rawBreeders.map(normalizeBreederRow) : [createBreederRow()];

  return { gtlRows, itemQuantities, alphaRows, breederRows };
}

export function loadLocalExtra(): ShinyWarExtraSheets {
  try {
    return normalizeExtra(JSON.parse(localStorage.getItem(SHINY_EXTRA_LOCAL_KEY) ?? "{}"));
  } catch {
    return normalizeExtra({});
  }
}

export function saveLocalExtra(value: ShinyWarExtraSheets) {
  try { localStorage.setItem(SHINY_EXTRA_LOCAL_KEY, JSON.stringify(value)); } catch {}
}

export async function loadCloudExtra(userId: string): Promise<ShinyWarExtraSheets | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("alya_shiny_war_extra")
    .select("gtl_rows,item_quantities,alpha_rows,breeder_rows")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeExtra({
    gtlRows: data.gtl_rows,
    itemQuantities: data.item_quantities,
    alphaRows: data.alpha_rows,
    breederRows: data.breeder_rows,
  });
}

export async function saveCloudExtra(userId: string, value: ShinyWarExtraSheets) {
  if (!supabase) throw new Error("Supabase indisponible");
  const { error } = await supabase.from("alya_shiny_war_extra").upsert({
    user_id: userId,
    gtl_rows: value.gtlRows,
    item_quantities: value.itemQuantities,
    alpha_rows: value.alphaRows,
    breeder_rows: value.breederRows,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}
