import { supabase } from "./shared/auth";

function client() {
  if (!supabase) throw new Error("Supabase n'est pas configuré.");
  return supabase;
}

export type GenericRow = Record<string, unknown>;

async function tryTable(names: string[]): Promise<{ table: string; rows: GenericRow[] }> {
  const sb = client();
  let last: unknown = null;
  for (const table of names) {
    const { data, error } = await sb.from(table).select("*");
    if (!error) return { table, rows: (data ?? []) as GenericRow[] };
    last = error;
  }
  throw last ?? new Error(`Aucune table compatible: ${names.join(", ")}`);
}

function firstKey(row: GenericRow | undefined, keys: string[]) {
  if (!row) return undefined;
  return keys.find((key) => Object.prototype.hasOwnProperty.call(row, key));
}

function stringValue(row: GenericRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length) return value;
  }
  return fallback;
}

export type MobileBadge = {
  id: string;
  name: string;
  color: string;
  image: string | null;
  raw: GenericRow;
};

export type BadgeAssignment = {
  userId: string;
  badgeId: string;
  raw: GenericRow;
};

const BADGE_TABLES = ["alya_badges", "player_badges", "badges"];
const ASSIGNMENT_TABLES = ["alya_user_badges", "profile_badges", "user_badges", "player_badge_assignments", "badge_assignments"];

export async function loadBadgeAdminData() {
  const badgeSource = await tryTable(BADGE_TABLES);
  const assignmentSource = await tryTable(ASSIGNMENT_TABLES);

  const badges: MobileBadge[] = badgeSource.rows.map((row, index) => ({
    id: stringValue(row, ["id", "badge_id"], String(index)),
    name: stringValue(row, ["name", "label", "title"], `Badge ${index + 1}`),
    color: stringValue(row, ["color", "hex_color", "accent"], "#987BDF"),
    image: stringValue(row, ["image_url", "image", "image_data", "icon_url", "icon"], "") || null,
    raw: row,
  }));

  const assignments: BadgeAssignment[] = assignmentSource.rows.map((row) => ({
    userId: stringValue(row, ["user_id", "profile_id", "target_user_id"]),
    badgeId: stringValue(row, ["badge_id", "player_badge_id"]),
    raw: row,
  })).filter((item) => item.userId && item.badgeId);

  return {
    badges,
    assignments,
    badgeTable: badgeSource.table,
    assignmentTable: assignmentSource.table,
    badgeSample: badgeSource.rows[0],
    assignmentSample: assignmentSource.rows[0],
  };
}

export async function createBadge(input: { name: string; color: string; image: string | null }) {
  const loaded = await loadBadgeAdminData();
  const sb = client();
  const sample = loaded.badgeSample;

  const payload: GenericRow = {};
  const nameKey = firstKey(sample, ["name", "label", "title"]) ?? "name";
  const colorKey = firstKey(sample, ["color", "hex_color", "accent"]) ?? "color";
  const imageKey = firstKey(sample, ["image_url", "image", "image_data", "icon_url", "icon"]);
  payload[nameKey] = input.name;
  payload[colorKey] = input.color;
  if (input.image && imageKey) payload[imageKey] = input.image;

  let { error } = await sb.from(loaded.badgeTable).insert(payload);
  if (error && input.image && !imageKey) {
    // Some schemas use a simple text image column but the table is initially empty.
    for (const candidate of ["image_data", "image", "image_url"]) {
      const fallback = { ...payload, [candidate]: input.image };
      const attempt = await sb.from(loaded.badgeTable).insert(fallback);
      if (!attempt.error) { error = null; break; }
    }
  }
  if (error) throw error;
}

export async function deleteBadge(badgeId: string) {
  const loaded = await loadBadgeAdminData();
  const sb = client();
  const badgeIdKey = firstKey(loaded.badgeSample, ["id", "badge_id"]) ?? "id";
  const assignmentBadgeKey = firstKey(loaded.assignmentSample, ["badge_id", "player_badge_id"]) ?? "badge_id";
  await sb.from(loaded.assignmentTable).delete().eq(assignmentBadgeKey, badgeId);
  const { error } = await sb.from(loaded.badgeTable).delete().eq(badgeIdKey, badgeId);
  if (error) throw error;
}

export async function setBadgeAssignment(userId: string, badgeId: string, enabled: boolean) {
  const loaded = await loadBadgeAdminData();
  const sb = client();
  const userKey = firstKey(loaded.assignmentSample, ["user_id", "profile_id", "target_user_id"]) ?? "user_id";
  const badgeKey = firstKey(loaded.assignmentSample, ["badge_id", "player_badge_id"]) ?? "badge_id";

  if (enabled) {
    const { error } = await sb.from(loaded.assignmentTable).upsert({ [userKey]: userId, [badgeKey]: badgeId });
    if (error) throw error;
  } else {
    const { error } = await sb.from(loaded.assignmentTable).delete().eq(userKey, userId).eq(badgeKey, badgeId);
    if (error) throw error;
  }
}

const EVENT_TABLES = ["alya_dashboard_event", "alya_dashboard_events", "dashboard_event", "dashboard_events"];

export type MobileDashboardEvent = {
  id: string | null;
  title: string;
  body: string;
  titleColor: string;
  image: string | null;
  endsAt: string;
  active: boolean;
  raw: GenericRow | null;
  table: string;
};

export async function loadDashboardEventAdmin(): Promise<MobileDashboardEvent> {
  const source = await tryTable(EVENT_TABLES);
  const row = source.rows[0] ?? null;
  return {
    id: row ? stringValue(row, ["id", "event_id"], "") || null : null,
    title: row ? stringValue(row, ["title", "event_title", "name"]) : "",
    body: row ? stringValue(row, ["body", "description", "content", "text", "message"]) : "",
    titleColor: row ? stringValue(row, ["title_color", "color", "accent_color"], "#FFD84A") : "#FFD84A",
    image: row ? stringValue(row, ["background_image", "background_url", "image_url", "image", "background"], "") || null : null,
    endsAt: row ? stringValue(row, ["ends_at", "end_at", "expires_at", "end_time"]) : "",
    active: row ? Boolean(row["active"] ?? row["is_active"] ?? row["enabled"] ?? true) : false,
    raw: row,
    table: source.table,
  };
}

export async function saveDashboardEventAdmin(input: Omit<MobileDashboardEvent, "raw" | "table">) {
  const current = await loadDashboardEventAdmin();
  const sb = client();
  const sample = current.raw ?? {};
  const payload: GenericRow = {};

  const put = (keys: string[], fallback: string, value: unknown) => {
    const key = firstKey(sample, keys) ?? fallback;
    payload[key] = value;
  };

  put(["title", "event_title", "name"], "title", input.title);
  put(["body", "description", "content", "text", "message"], "body", input.body);
  put(["title_color", "color", "accent_color"], "title_color", input.titleColor);
  put(["ends_at", "end_at", "expires_at", "end_time"], "ends_at", input.endsAt || null);
  put(["active", "is_active", "enabled"], "active", input.active);
  if (input.image) put(["background_image", "background_url", "image_url", "image", "background"], "background_image", input.image);

  const idKey = firstKey(sample, ["id", "event_id"]);
  if (current.id && idKey) {
    const { error } = await sb.from(current.table).update(payload).eq(idKey, current.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from(current.table).insert(payload);
    if (error) throw error;
  }
}

export async function disableDashboardEventAdmin() {
  const current = await loadDashboardEventAdmin();
  if (!current.raw) return;
  const sb = client();
  const activeKey = firstKey(current.raw, ["active", "is_active", "enabled"]) ?? "active";
  const idKey = firstKey(current.raw, ["id", "event_id"]);
  if (current.id && idKey) {
    const { error } = await sb.from(current.table).update({ [activeKey]: false }).eq(idKey, current.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from(current.table).update({ [activeKey]: false });
    if (error) throw error;
  }
}
