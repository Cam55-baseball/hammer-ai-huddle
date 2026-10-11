// Owner Exercise Vault — owner/admin only. Draft → validate → make live →
// undo workflow over exercise_vault_drafts / exercise_vault_versions /
// exercise_vault_audit. Every action writes an audit row. Live plans already
// built today are never touched: a live version takes effect from the next
// plan build unless the owner explicitly passes apply_today: true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const [{ data: isOwner }, { data: isAdmin }] = await Promise.all([
      admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" }),
      admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    ]);
    if (!isOwner && !isAdmin) return json({ error: "Owner/admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const slug = String(body?.slug ?? "").trim();
    if (!slug && action !== "list") return json({ error: "Missing slug" }, 400);

    const audit = (act: string, detail: unknown) =>
      admin.from("exercise_vault_audit").insert({ slug, action: act, actor: u.user.id, detail });

    if (action === "save_draft") {
      const payload = body?.payload;
      if (!payload || typeof payload !== "object") return json({ error: "Missing payload" }, 400);
      const validation = Array.isArray(body?.validation) ? body.validation : [];
      const row = {
        slug,
        payload,
        validation,
        is_new: Boolean(body?.is_new),
        status: "draft",
        created_by: u.user.id,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await admin.from("exercise_vault_drafts")
        .select("id").eq("slug", slug).eq("status", "draft").maybeSingle();
      const { error } = existing
        ? await admin.from("exercise_vault_drafts").update(row).eq("id", existing.id)
        : await admin.from("exercise_vault_drafts").insert(row);
      if (error) return json({ error: error.message }, 500);
      await audit("save_draft", { is_new: row.is_new, problems: validation.length });
      return json({ ok: true });
    }

    if (action === "make_live") {
      const { data: draft } = await admin.from("exercise_vault_drafts")
        .select("*").eq("slug", slug).eq("status", "draft").maybeSingle();
      if (!draft) return json({ error: "No draft to make live" }, 404);
      if (Array.isArray(draft.validation) && draft.validation.length > 0) {
        return json({ error: "Draft still has validation problems", problems: draft.validation }, 400);
      }
      const { data: cur } = await admin.from("exercise_vault_versions")
        .select("version,payload").eq("slug", slug).is("undone_at", null)
        .order("version", { ascending: false }).limit(1);
      const applyToday = Boolean(body?.apply_today);
      const today = new Date().toISOString().slice(0, 10);
      const effective = new Date(); if (!applyToday) effective.setDate(effective.getDate() + 1);
      const { error } = await admin.from("exercise_vault_versions").insert({
        slug,
        version: (cur?.[0]?.version ?? 0) + 1,
        payload: draft.payload,
        previous_payload: cur?.[0]?.payload ?? null,
        apply_today: applyToday,
        effective_from: applyToday ? today : effective.toISOString().slice(0, 10),
        made_live_by: u.user.id,
      });
      if (error) return json({ error: error.message }, 500);
      await admin.from("exercise_vault_drafts").update({ status: "live", updated_at: new Date().toISOString() }).eq("id", draft.id);
      await audit("make_live", { version: (cur?.[0]?.version ?? 0) + 1, apply_today: applyToday });
      return json({ ok: true });
    }

    if (action === "undo") {
      const { data: cur } = await admin.from("exercise_vault_versions")
        .select("*").eq("slug", slug).is("undone_at", null)
        .order("version", { ascending: false }).limit(1);
      const live = cur?.[0];
      if (!live) return json({ error: "Nothing to undo" }, 400);
      if (!live.previous_payload) return json({ error: "This was the first live version — nothing before it to restore" }, 400);
      await admin.from("exercise_vault_versions").update({ undone_at: new Date().toISOString() }).eq("id", live.id);
      const { error } = await admin.from("exercise_vault_versions").insert({
        slug,
        version: live.version + 1,
        payload: live.previous_payload,
        previous_payload: live.payload,
        apply_today: live.apply_today,
        effective_from: live.effective_from,
        made_live_by: u.user.id,
      });
      if (error) return json({ error: error.message }, 500);
      await audit("undo", { undone: live.version, restored_as: live.version + 1 });
      return json({ ok: true });
    }

    if (action === "list") {
      let vq = admin.from("exercise_vault_versions")
        .select("slug,version,apply_today,effective_from,undone_at,made_live_by,made_live_at")
        .order("made_live_at", { ascending: false }).limit(200);
      if (slug) vq = vq.eq("slug", slug);
      let dq = admin.from("exercise_vault_drafts")
        .select("slug,is_new,status,validation,updated_at")
        .order("updated_at", { ascending: false }).limit(200);
      if (slug) dq = dq.eq("slug", slug);
      const [{ data: versions, error: ve }, { data: drafts, error: de }] = await Promise.all([vq, dq]);
      if (ve || de) return json({ error: ve?.message ?? de?.message }, 500);
      return json({ versions: versions ?? [], drafts: drafts ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
});
