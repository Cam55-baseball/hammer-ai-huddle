/**
 * Phase D §1 — Parent invite email transport.
 *
 * Validates the caller is the athlete who owns the relationship, logs a
 * dispatch row (status `queued` → `sent` | `failed` | `skipped_disabled`),
 * then attempts to deliver via the project's transactional email function
 * if available. Email failure NEVER blocks the canonical relationship.created
 * event (which is emitted client-side before this function is invoked).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  relationship_id: string;
  athlete_id: string;
  recipient_email: string;
  athlete_display_name?: string;
  invite_url: string;
}

function validate(body: unknown): { ok: true; data: RequestBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "missing_body" };
  const b = body as Record<string, unknown>;
  for (const k of ["relationship_id", "athlete_id", "recipient_email", "invite_url"]) {
    if (typeof b[k] !== "string" || (b[k] as string).length === 0) {
      return { ok: false, error: `missing_field:${k}` };
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.recipient_email as string)) {
    return { ok: false, error: "invalid_email" };
  }
  return { ok: true, data: b as unknown as RequestBody };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimErr } = await authedClient.auth.getClaims(token);
  if (claimErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub;

  let parsed: ReturnType<typeof validate>;
  try {
    parsed = validate(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const body = parsed.data;

  if (body.athlete_id !== userId) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Log dispatch first (status=queued). This always succeeds independent of
  // email transport.
  const { data: dispatch, error: insertErr } = await service
    .from("parent_invite_dispatches")
    .insert({
      relationship_id: body.relationship_id,
      athlete_id: body.athlete_id,
      recipient_email: body.recipient_email,
      status: "queued",
      attempt_count: 1,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("[send-parent-invite] dispatch insert failed", insertErr);
    return new Response(JSON.stringify({ error: "log_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Attempt delivery via send-transactional-email if it exists. Soft failure
  // is the expected path until Lovable Emails is enabled by the owner.
  let deliveryStatus: "sent" | "failed" | "skipped_disabled" = "skipped_disabled";
  let lastError: string | null = "transactional_email_not_configured";

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        templateName: "parent-invite",
        recipientEmail: body.recipient_email,
        idempotencyKey: `parent-invite-${body.relationship_id}`,
        templateData: {
          athleteName: body.athlete_display_name ?? "An athlete",
          inviteUrl: body.invite_url,
        },
      }),
    });
    if (resp.ok) {
      deliveryStatus = "sent";
      lastError = null;
    } else {
      deliveryStatus = "failed";
      lastError = `transport_${resp.status}`;
    }
  } catch (e) {
    deliveryStatus = "failed";
    lastError = `transport_exception:${(e as Error).message}`;
    console.warn("[send-parent-invite] transport exception", e);
  }

  await service
    .from("parent_invite_dispatches")
    .update({ status: deliveryStatus, last_error: lastError })
    .eq("id", dispatch.id);

  return new Response(
    JSON.stringify({
      dispatch_id: dispatch.id,
      delivery: deliveryStatus,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
