/**
 * RR-4 — parent-side invite acceptance.
 *
 * Why this exists: `asb_events` RLS scopes both SELECT and INSERT to
 * `athlete_id = auth.uid()`. A parent therefore can neither read the
 * originating `relationship.created` event (needed for lineage) nor append
 * the `relationship.confirmed` event on the athlete's timeline. The deep-link
 * accept flow was dead end-to-end. This function is the authorized bridge:
 * it verifies the parent's JWT, validates the invite token, resolves the
 * created event, and appends the confirmation with `actor_id = parent`.
 *
 * It never mutates existing events. Append-only, idempotent by
 * sha256(athlete_id|topic|occurred_at|canonical(payload)).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "asb-1.0.0";
const RELATIONAL_REASONING_VERSION = "relational-1.0.0";
const CREATED_TOPIC = "relational.relationship.created";
const CONFIRMED_TOPIC = "relational.relationship.confirmed";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((s.length + 3) % 4);
  return new TextDecoder().decode(
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
  );
}

interface InviteToken {
  relationship_id: string;
  athlete_id: string;
  issued_at: string;
  expires_at?: string;
}

function decodeToken(token: string): InviteToken | null {
  try {
    const obj = JSON.parse(base64urlDecode(token));
    if (
      typeof obj?.relationship_id === "string" &&
      typeof obj?.athlete_id === "string" &&
      typeof obj?.issued_at === "string"
    ) return obj as InviteToken;
    return null;
  } catch {
    return null;
  }
}

function canonicalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = canonicalize((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

async function idempotencyKey(
  athleteId: string,
  topic: string,
  occurredAt: string,
  payload: unknown,
): Promise<string> {
  const material = [
    athleteId,
    topic,
    occurredAt,
    JSON.stringify(canonicalize(payload)),
  ].join("|");
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(material),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const authed = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error: userErr } = await authed.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const decoded = token ? decodeToken(token) : null;
    if (!decoded) return json({ error: "invalid_token" }, 400);

    // Expiry — tokens without expires_at are treated as expired (legacy).
    const exp = decoded.expires_at ? Date.parse(decoded.expires_at) : NaN;
    if (Number.isNaN(exp) || exp <= Date.now()) {
      return json({ error: "expired_token" }, 400);
    }

    // The parent may not accept on their own behalf as the athlete.
    if (decoded.athlete_id === user.id) {
      return json({ error: "self_accept_forbidden" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve the originating created event (lineage anchor).
    const { data: createdRows, error: createdErr } = await admin
      .from("asb_events")
      .select("event_id, payload")
      .eq("athlete_id", decoded.athlete_id)
      .eq("topic_id", CREATED_TOPIC)
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (createdErr) {
      console.error("[accept-parent-invite] created lookup failed", createdErr);
      return json({ error: "lookup_failed" }, 500);
    }

    const created = (createdRows ?? []).find(
      (r) =>
        (r.payload as { relationship_id?: string } | null)?.relationship_id ===
          decoded.relationship_id,
    );
    if (!created) return json({ error: "invite_not_found" }, 404);

    const occurredAt = new Date().toISOString();
    const payload = {
      engine_version: ENGINE_VERSION,
      reasoning_version: RELATIONAL_REASONING_VERSION,
      visibility_scope: "parent",
      confidence: 1,
      missingness: { fields: [], reason: "not_observed" },
      authority: "parent",
      lineage_parent_ids: [created.event_id],
      relationship_id: decoded.relationship_id,
      confirmed_by: "parent",
      confirmation_method: "invite_token",
      relationship: "parent",
    };

    const eventId = crypto.randomUUID();
    const key = await idempotencyKey(
      decoded.athlete_id,
      CONFIRMED_TOPIC,
      occurredAt,
      payload,
    );

    const { error: insertErr } = await admin.from("asb_events").insert({
      event_id: eventId,
      athlete_id: decoded.athlete_id,
      topic_id: CONFIRMED_TOPIC,
      actor_role: "parent",
      actor_id: user.id,
      occurred_at: occurredAt,
      ingested_at: occurredAt,
      effective_at: occurredAt,
      valid_from: occurredAt,
      valid_to: null,
      payload,
      engine_version: ENGINE_VERSION,
      idempotency_key: key,
      causality_refs: [],
      lineage_refs: [created.event_id],
    });

    if (insertErr && insertErr.code !== "23505") {
      console.error("[accept-parent-invite] insert failed", insertErr);
      return json({ error: "emit_failed", detail: insertErr.message }, 500);
    }

    // Lineage edge — best effort, never blocks the accept path.
    try {
      await admin.from("asb_event_lineage").insert({
        parent_event_id: created.event_id,
        child_event_id: eventId,
        derivation_type: "relationship_transition",
        engine_version: ENGINE_VERSION,
      });
    } catch (e) {
      console.info("[accept-parent-invite] lineage edge skipped", e);
    }

    // Operational hygiene for the dispatch log.
    try {
      await admin
        .from("parent_invite_dispatches")
        .update({ status: "accepted" })
        .eq("relationship_id", decoded.relationship_id);
    } catch (e) {
      console.info("[accept-parent-invite] dispatch update skipped", e);
    }

    // Confirm the projection landed (trigger-driven).
    const { data: link } = await admin
      .from("parent_athlete_links")
      .select("id, status")
      .eq("parent_user_id", user.id)
      .eq("athlete_user_id", decoded.athlete_id)
      .maybeSingle();

    return json({
      ok: true,
      confirmed_event_id: eventId,
      relationship_id: decoded.relationship_id,
      activated: !!link && link.status === "active",
    });
  } catch (e) {
    console.error("[accept-parent-invite] unhandled", e);
    return json({ error: "unexpected", detail: String(e) }, 500);
  }
});
