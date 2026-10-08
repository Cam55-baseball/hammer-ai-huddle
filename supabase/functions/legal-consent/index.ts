/**
 * legal-consent — the only writer of consent_records (legal_v2).
 * Actions:
 *   record        — save one consent choice for the caller (IP + device captured here)
 *   status        — caller's latest choice per document
 *   export_my_data— JSON copy of every row the caller owns (Download my data)
 * The user id always comes from the verified JWT, never the body.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { OWNED_TABLES } from "./ownedTables.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CHOICES = new Set(["accepted", "declined", "withdrawn", "signed", "cancelled"]);
const METHODS = new Set(["checkbox", "typed_signature", "drawn_signature", "toggle", "button", "checkout_checkbox", "updated_terms_screen"]);
const SLUG = /^[a-z0-9-]{2,64}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "unauthorized" }, 401);
    const uid = u.user.id;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "record") {
      const slug = String(body.slug ?? "");
      const version = Number(body.version);
      const choice = String(body.choice ?? "");
      const method = String(body.method ?? "");
      if (!SLUG.test(slug) || !Number.isInteger(version) || version < 1 || !CHOICES.has(choice) || !METHODS.has(method)) {
        return json({ error: "invalid" }, 400);
      }
      const { data: doc } = await admin.from("legal_documents").select("id").eq("slug", slug).eq("version", version).maybeSingle();
      if (!doc) return json({ error: "unknown_document" }, 400);
      const signer = body.signer_name ? String(body.signer_name).trim().slice(0, 120) : null;
      if (method === "typed_signature" && (!signer || signer.length < 3)) return json({ error: "signature_missing" }, 400);
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || null;
      const details = typeof body.details === "object" && body.details ? body.details : {};
      const { data, error } = await admin.from("consent_records").insert({
        user_id: uid, document_slug: slug, document_version: version, choice, method,
        signer_name: signer, signer_role: body.signer_role ? String(body.signer_role).slice(0, 40) : null,
        details, ip, device: (req.headers.get("user-agent") ?? "").slice(0, 300),
      }).select("id, recorded_at").single();
      if (error) throw error;
      return json({ ok: true, ...data });
    }

    if (action === "status") {
      const { data, error } = await admin.from("consent_records")
        .select("document_slug, document_version, choice, recorded_at")
        .eq("user_id", uid).order("recorded_at", { ascending: false }).limit(500);
      if (error) throw error;
      const latest: Record<string, unknown> = {};
      for (const r of data ?? []) if (!latest[r.document_slug]) latest[r.document_slug] = r;
      return json({ latest });
    }

    if (action === "export_my_data") {
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: uid, email: u.user.email };
      for (const [table, col] of [...OWNED_TABLES, ["profiles", "id"], ["consent_records", "user_id"], ["privacy_requests", "user_id"]] as Array<[string, string]>) {
        const { data, error } = await admin.from(table).select("*").eq(col, uid).limit(5000);
        out[table] = error ? { error: "not_readable" } : data;
      }
      await admin.from("privacy_requests").insert({ user_id: uid, kind: "export", status: "done", completed_at: new Date().toISOString(), details: { self_service: true } });
      return json(out);
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[legal-consent]", e);
    return json({ error: "failed", details: String((e as Error)?.message ?? e) }, 500);
  }
});
