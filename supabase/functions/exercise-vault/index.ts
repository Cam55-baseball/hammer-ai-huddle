// Owner Exercise Vault — owner/admin only. Append-only version store:
// save_draft, make_live, undo (restores the previous live version as a new
// version), list. Every action writes an audit row. Nothing is ever updated
// or deleted; live plans already built today are never touched here — live
// versions apply from the next plan build.
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

    const nextVersion = async () => {
      const { data } = await admin
        .from("exercise_vault_versions").select("version").eq("slug", slug)
        .order("version", { ascending: false }).limit(1);
      return (data?.[0]?.version ?? 0) + 1;
    };

    if (action === "save_draft") {
      const payload = body?.payload;
      if (!payload || typeof payload !== "object") return json({ error: "Missing payload" }, 400);
      const version = await nextVersion();
      const { error } = await admin.from("exercise_vault_versions")
        .insert({ slug, version, status: "draft", payload, note: body?.note ?? null, edited_by: u.user.id });
      if (error) return json({ error: error.message }, 500);
      await audit("save_draft", { version, note: body?.note ?? null });
      return json({ ok: true, version });
    }

    if (action === "make_live") {
      const version = Number(body?.version);
      if (!version) return json({ error: "Missing version" }, 400);
      const { data: draft } = await admin.from("exercise_vault_versions")
        .select("id,status").eq("slug", slug).eq("version", version).maybeSingle();
      if (!draft) return json({ error: "Version not found" }, 404);
      // Supersede any current live version, then promote this one.
      await admin.from("exercise_vault_versions").update({ status: "superseded" })
        .eq("slug", slug).eq("status", "live");
      const { error } = await admin.from("exercise_vault_versions")
        .update({ status: "live" }).eq("slug", slug).eq("version", version);
      if (error) return json({ error: error.message }, 500);
      await audit("make_live", { version });
      return json({ ok: true, version });
    }

    if (action === "undo") {
      const { data: versions } = await admin.from("exercise_vault_versions")
        .select("version,status,payload").eq("slug", slug)
        .in("status", ["live", "superseded"])
        .order("version", { ascending: false });
      const live = versions?.find((v) => v.status === "live");
      const prev = versions?.find((v) => v.status === "superseded");
      if (!live || !prev) return json({ error: "Nothing to undo" }, 400);
      await admin.from("exercise_vault_versions").update({ status: "superseded" })
        .eq("slug", slug).eq("status", "live");
      const version = await nextVersion();
      const { error } = await admin.from("exercise_vault_versions")
        .insert({ slug, version, status: "live", payload: prev.payload, note: `Undo of version ${live.version}`, edited_by: u.user.id });
      if (error) return json({ error: error.message }, 500);
      await audit("undo", { from: live.version, restored: prev.version, as: version });
      return json({ ok: true, version });
    }

    if (action === "list") {
      let q = admin.from("exercise_vault_versions").select("slug,version,status,note,edited_by,created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (slug) q = q.eq("slug", slug);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ versions: data ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
});
