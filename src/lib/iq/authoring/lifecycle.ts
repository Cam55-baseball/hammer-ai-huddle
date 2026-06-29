/**
 * Wave 5 — duplicate a Game IQ situation (clone with (copy) suffix, draft).
 * Copies the situation, all 9 actors, and all variants. Returns the new id.
 */
import { supabase } from "@/integrations/supabase/client";

export async function duplicateSituation(situationId: string): Promise<string> {
  const { data: src, error: sErr } = await supabase
    .from("iq_situations")
    .select("*")
    .eq("id", situationId)
    .single();
  if (sErr) throw sErr;
  if (!src) throw new Error("Source situation not found");

  const baseSlug = `${src.slug}-copy`;
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data: exists } = await supabase
      .from("iq_situations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }

  const insertPayload = {
    sport: src.sport,
    slug,
    title: `${src.title} (copy)`,
    summary: src.summary,
    lens_tags: src.lens_tags,
    difficulty: src.difficulty,
    status: "draft",
    canonical_order: 9999,
    sources: src.sources,
    triple_check_count: 0,
  };
  const { data: created, error: cErr } = await supabase
    .from("iq_situations")
    .insert(insertPayload as never)
    .select("id")
    .single();
  if (cErr) throw cErr;
  const newId = (created as { id: string }).id;

  const [{ data: actors }, { data: variants }] = await Promise.all([
    supabase.from("iq_situation_actors").select("*").eq("situation_id", situationId),
    supabase.from("iq_situation_variants").select("*").eq("situation_id", situationId),
  ]);

  if (actors?.length) {
    await supabase.from("iq_situation_actors").insert(
      actors.map((a) => {
        const { id: _id, situation_id: _sid, ...rest } = a as Record<string, unknown>;
        return { ...rest, situation_id: newId };
      }) as never,
    );
  }
  if (variants?.length) {
    await supabase.from("iq_situation_variants").insert(
      variants.map((v) => {
        const { id: _id, situation_id: _sid, ...rest } = v as Record<string, unknown>;
        return { ...rest, situation_id: newId };
      }) as never,
    );
  }

  return newId;
}

export async function softDeleteSituation(situationId: string): Promise<void> {
  const { error } = await supabase
    .from("iq_situations")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", situationId);
  if (error) throw error;
}

export async function restoreSituation(situationId: string): Promise<void> {
  const { error } = await supabase
    .from("iq_situations")
    .update({ deleted_at: null } as never)
    .eq("id", situationId);
  if (error) throw error;
}
