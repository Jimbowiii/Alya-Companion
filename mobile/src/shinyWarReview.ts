import { supabase } from "./shared/auth";

export type ShinyWarReview = {
  targetUserId: string;
  authorUserId: string | null;
  message: string;
  updatedAt: string | null;
};

function client() {
  if (!supabase) throw new Error("Supabase n'est pas configuré.");
  return supabase;
}

export async function loadShinyWarReview(targetUserId: string): Promise<ShinyWarReview | null> {
  const sb = client();
  const { data, error } = await sb
    .from("alya_shiny_war_reviews")
    .select("target_user_id,author_user_id,message,updated_at")
    .eq("target_user_id", targetUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    targetUserId: String(data.target_user_id),
    authorUserId: data.author_user_id ? String(data.author_user_id) : null,
    message: typeof data.message === "string" ? data.message : "",
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}

export async function saveShinyWarReview(targetUserId: string, authorUserId: string, message: string) {
  const sb = client();
  const clean = message.trim();
  const { error } = await sb.from("alya_shiny_war_reviews").upsert({
    target_user_id: targetUserId,
    author_user_id: authorUserId,
    message: clean,
    updated_at: new Date().toISOString(),
  }, { onConflict: "target_user_id" });
  if (error) throw error;
}
