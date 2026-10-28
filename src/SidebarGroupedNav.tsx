import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import {
  SIDEBAR_GROUPS,
  SIDEBAR_GROUP_ORDER_EVENT,
  loadSidebarGroupOrder,
} from "./sidebarGroupConfig";
import "./sidebar-groups.css";

type NavItem = readonly [string, string, LucideIcon];

type SidebarGroupedNavProps = {
  items: readonly NavItem[];
  activeTab: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
};

type GroupId = (typeof SIDEBAR_GROUPS)[number]["id"];

const OPEN_STORAGE_KEY = "alya-sidebar-groups-v1";

function loadOpenGroups(): Record<GroupId, boolean> {
  const fallback = Object.fromEntries(SIDEBAR_GROUPS.map((group) => [group.id, false])) as Record<GroupId, boolean>;

  try {
    const raw = localStorage.getItem(OPEN_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<GroupId, boolean>>;
    return Object.fromEntries(
      SIDEBAR_GROUPS.map((group) => [group.id, Boolean(parsed[group.id])]),
    ) as Record<GroupId, boolean>;
  } catch {
    return fallback;
  }
}

export default function SidebarGroupedNav({ items, activeTab, collapsed, onSelect }: SidebarGroupedNavProps) {
  const [openGroups, setOpenGroups] = useState<Record<GroupId, boolean>>(loadOpenGroups);
  const [groupOrder, setGroupOrder] = useState(loadSidebarGroupOrder);

  const dashboard = items.find(([id]) => id === "dashboard");
  const assignedIds = useMemo(() => new Set(SIDEBAR_GROUPS.flatMap((group) => [...group.tabs])), []);
  const ungrouped = items.filter(([id]) => id !== "dashboard" && !assignedIds.has(id));
  const orderedGroups = useMemo(() => {
    const byId = new Map(SIDEBAR_GROUPS.map((group) => [group.id, group] as const));
    return groupOrder.map((id) => byId.get(id)).filter(Boolean) as (typeof SIDEBAR_GROUPS)[number][];
  }, [groupOrder]);

  useEffect(() => {
    const refreshOrder = () => setGroupOrder(loadSidebarGroupOrder());
    window.addEventListener(SIDEBAR_GROUP_ORDER_EVENT, refreshOrder);
    window.addEventListener("storage", refreshOrder);
    return () => {
      window.removeEventListener(SIDEBAR_GROUP_ORDER_EVENT, refreshOrder);
      window.removeEventListener("storage", refreshOrder);
    };
  }, []);

  useEffect(() => {
    const activeGroup = SIDEBAR_GROUPS.find((group) => group.tabs.includes(activeTab));
    if (!activeGroup) return;
    setOpenGroups((current) => {
      if (current[activeGroup.id]) return current;
      const next = { ...current, [activeGroup.id]: true };
      try { localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [activeTab]);

  const toggleGroup = (id: GroupId) => {
    setOpenGroups((current) => {
      const next = { ...current, [id]: !current[id] };
      try { localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const renderItem = (item: NavItem, nested = false) => {
    const [id, label, Icon] = item;
    return (
      <button
        key={id}
        type="button"
        className={`${activeTab === id ? "nav-active" : ""}${nested ? " sidebar-group-item" : ""}`}
        onClick={() => onSelect(id)}
        title={collapsed ? label : undefined}
        aria-label={label}
      >
        <Icon size={nested ? 17 : 18} />
        <span className="nav-label">{label}</span>
      </button>
    );
  };

  return (
    <nav className="sidebar-grouped-nav">
      {dashboard && renderItem(dashboard)}

      <div className="sidebar-groups-list">
        {orderedGroups.map((group) => {
          // Preserve the user's historical tab order inside each category.
          const groupItems = items.filter(([id]) => group.tabs.includes(id));
          if (groupItems.length === 0) return null;

          const isOpen = openGroups[group.id];
          const containsActive = group.tabs.includes(activeTab);
          const GroupIcon = group.icon;

          return (
            <section
              key={group.id}
              className={`sidebar-nav-group ${isOpen ? "is-open" : ""} ${containsActive ? "has-active" : ""}`}
            >
              <button
                type="button"
                className="sidebar-group-header"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                title={collapsed ? group.label : undefined}
              >
                <GroupIcon size={18} />
                <span className="sidebar-group-title">{group.label}</span>
                <ChevronDown className="sidebar-group-chevron" size={15} />
              </button>

              <div className="sidebar-group-collapse" aria-hidden={!isOpen}>
                <div className="sidebar-group-inner">
                  {groupItems.map((item) => renderItem(item, true))}
                </div>
              </div>
            </section>
          );
        })}

        {ungrouped.length > 0 && (
          <section className="sidebar-nav-group is-open sidebar-ungrouped">
            {!collapsed && <div className="sidebar-ungrouped-label">Autres</div>}
            <div className="sidebar-group-inner">
              {ungrouped.map((item) => renderItem(item, true))}
            </div>
          </section>
        )}
      </div>
    </nav>
  );
}
