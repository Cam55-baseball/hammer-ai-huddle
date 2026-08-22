// Owner-only manual grant / revoke of bundle access. Never writable from the client.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Identity strictly from the validated bearer token.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Not authenticated" }, 401);
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const actor = userData?.user;
    if (!actor) return json({ error: "Not authenticated" }, 401);

    const { data: isOwner } = await admin.rpc("has_role", {
      _user_id: actor.id,
      _role: "owner",
    });
    if (!isOwner) return json({ error: "Owner access required" }, 403);

    const body = await req.json().catch(() => null);
    const action = body?.action;
    const bundleId = typeof body?.bundleId === "string" ? body.bundleId.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

    if (action !== "grant" && action !== "revoke") return json({ error: "Invalid action" }, 400);
    if (!bundleId) return json({ error: "Missing bundle" }, 400);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Enter a valid email address" }, 400);
    }

    const { data: bundle } = await admin
      .from("bundles")
      .select("id, name")
      .eq("id", bundleId)
      .maybeSingle();
    if (!bundle) return json({ error: "Bundle not found" }, 404);

    // Resolve the target account by email (paginated auth lookup).
    let targetId: string | null = null;
    for (let page = 1; page <= 20 && !targetId; page++) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !list?.users?.length) break;
      targetId = list.users.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
      if (list.users.length < 200) break;
    }

    if (!targetId) {
      return json(
        { error: `No account found for ${email}. They need to sign up first.` },
        404,
      );
    }

    if (action === "grant") {
      const { error } = await admin
        .from("user_build_access")
        .upsert(
          { user_id: targetId, build_id: bundle.id, build_type: "bundle" },
          { onConflict: "user_id,build_id" },
        );
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await admin
        .from("user_build_access")
        .delete()
        .eq("user_id", targetId)
        .eq("build_id", bundle.id);
      if (error) return json({ error: error.message }, 500);
    }

    await admin.from("bundle_grants_audit").insert({
      build_id: bundle.id,
      target_user_id: targetId,
      target_email: email,
      action,
      actor_id: actor.id,
      reason,
    });

    return json({ success: true, action, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[OWNER-BUNDLE-ACCESS]", message);
    return json({ error: message }, 500);
  }
});
