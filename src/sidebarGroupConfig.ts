import type { LucideIcon } from "lucide-react";
import { Coins, Globe2, Swords, Wrench } from "lucide-react";

export type SidebarGroupId = "web" | "utilities" | "money" | "shinywars";

export type SidebarGroupDefinition = {
  id: SidebarGroupId;
  label: string;
  icon: LucideIcon;
  tabs: readonly string[];
};

export const SIDEBAR_GROUP_ORDER_STORAGE_KEY = "alya-sidebar-group-order-v1";
export const SIDEBAR_GROUP_ORDER_EVENT = "alya-sidebar-group-order-change";

export const SIDEBAR_GROUPS: readonly SidebarGroupDefinition[] = [
  {
    id: "web",
    label: "Web",
    icon: Globe2,
    tabs: ["shinyboard", "forum", "vanity", "pokepedia", "pokebip", "stream"],
  },
  {
    id: "utilities",
    label: "Utilities",
    icon: Wrench,
    tabs: ["mods", "surf", "theme", "rotations", "raids"],
  },
  {
    id: "money",
    label: "Make Big Money",
    icon: Coins,
    tabs: ["gymrerun", "berries"],
  },
  {
    id: "shinywars",
    label: "Shiny-Wars",
    icon: Swords,
    tabs: ["shinywar"],
  },
] as const;

export const DEFAULT_SIDEBAR_GROUP_ORDER: SidebarGroupId[] = SIDEBAR_GROUPS.map((group) => group.id);

export function normalizeSidebarGroupOrder(raw: unknown): SidebarGroupId[] {
  const known = new Set<SidebarGroupId>(DEFAULT_SIDEBAR_GROUP_ORDER);
  const result: SidebarGroupId[] = [];

  if (Array.isArray(raw)) {
    for (const value of raw) {
      if (typeof value !== "string") continue;
      const id = value as SidebarGroupId;
      if (known.has(id) && !result.includes(id)) result.push(id);
    }
  }

  for (const id of DEFAULT_SIDEBAR_GROUP_ORDER) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}

export function loadSidebarGroupOrder(): SidebarGroupId[] {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUP_ORDER_STORAGE_KEY);
    if (!raw) return [...DEFAULT_SIDEBAR_GROUP_ORDER];
    return normalizeSidebarGroupOrder(JSON.parse(raw));
  } catch {
    return [...DEFAULT_SIDEBAR_GROUP_ORDER];
  }
}

export function saveSidebarGroupOrder(order: readonly SidebarGroupId[]) {
  const normalized = normalizeSidebarGroupOrder([...order]);
  try {
    localStorage.setItem(SIDEBAR_GROUP_ORDER_STORAGE_KEY, JSON.stringify(normalized));
  } catch {}
  window.dispatchEvent(new CustomEvent(SIDEBAR_GROUP_ORDER_EVENT));
  return normalized;
}
