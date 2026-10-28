import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Gauge, GripVertical } from "lucide-react";
import {
  SIDEBAR_GROUPS,
  loadSidebarGroupOrder,
  saveSidebarGroupOrder,
  type SidebarGroupId,
} from "./sidebarGroupConfig";

function reorder(order: SidebarGroupId[], from: SidebarGroupId, to: SidebarGroupId) {
  if (from === to) return order;
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return order;
  const next = [...order];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function SidebarCategoryCustomizer() {
  const [order, setOrder] = useState<SidebarGroupId[]>(loadSidebarGroupOrder);
  const [dragged, setDragged] = useState<SidebarGroupId | null>(null);
  const groupMap = useMemo(() => new Map(SIDEBAR_GROUPS.map((group) => [group.id, group] as const)), []);

  const apply = (next: SidebarGroupId[]) => {
    const saved = saveSidebarGroupOrder(next);
    setOrder(saved);
  };

  const move = (id: SidebarGroupId, offset: number) => {
    const index = order.indexOf(id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    apply(next);
  };

  return (
    <>
      <h3>Catégories du volet</h3>
      <div className="tab-order-list sidebar-category-order-list">
        <div className="tab-order-row sidebar-category-row is-locked">
          <span className="drag-handle disabled" aria-hidden="true"><GripVertical size={16} /></span>
          <Gauge size={15} />
          <span className="tab-order-label">Dashboard</span>
          <small>Toujours en haut</small>
        </div>

        {order.map((id, index) => {
          const group = groupMap.get(id);
          if (!group) return null;
          const Icon = group.icon;
          return (
            <div
              key={id}
              className={`tab-order-row sidebar-category-row ${dragged === id ? "dragging" : ""}`}
              draggable
              onDragStart={(event) => {
                setDragged(id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const source = (event.dataTransfer.getData("text/plain") || dragged) as SidebarGroupId | null;
                if (source) apply(reorder(order, source, id));
                setDragged(null);
              }}
              onDragEnd={() => setDragged(null)}
            >
              <span className="drag-handle" title={`Déplacer ${group.label}`} aria-label={`Déplacer ${group.label}`}>
                <GripVertical size={16} aria-hidden="true" />
              </span>
              <Icon size={15} />
              <span className="tab-order-label sidebar-category-label">
                <strong>{group.label}</strong>
                <small>{group.tabs.length} onglet{group.tabs.length > 1 ? "s" : ""}</small>
              </span>
              <div className="tab-order-actions" aria-label={`Position de ${group.label}`}>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(id, -1)}
                  title={`Monter ${group.label}`}
                  aria-label={`Monter ${group.label}`}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={index === order.length - 1}
                  onClick={() => move(id, 1)}
                  title={`Descendre ${group.label}`}
                  aria-label={`Descendre ${group.label}`}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="customizer-hint">Glisse une catégorie ou utilise les flèches pour choisir sa position dans la sidebar. L’ordre des onglets à l’intérieur de chaque catégorie reste inchangé.</p>
    </>
  );
}
