/**
 * delete-account — self-service account deletion (Apple Guideline 5.1.1(v)).
 *
 * Deletes ONLY the calling user's own account. The user id is taken from the
 * verified JWT; a user id in the request body is never accepted.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { OWNED_TABLES, AUTHORSHIP_TABLES, USER_STORAGE_BUCKETS } from "./ownedTables.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[DELETE-ACCOUNT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let userId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    userId = userData.user.id;
    log("Authenticated", { userId });

    // --- Guard: owner/admin accounts may never self-delete -----------------
    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesError) throw new Error(`Could not read account roles: ${rolesError.message}`);

    const roleList = (roles ?? []).map((r: { role: string }) => r.role);
    if (roleList.includes("owner") || roleList.includes("admin")) {
      return jsonResponse(
        {
          error:
            "Owner and admin accounts cannot be deleted from the app. Remove the admin role first, or ask another owner to remove this account.",
          code: "ADMIN_BLOCKED",
        },
        403,
      );
    }

    // --- Step 1: cancel any active Stripe subscription ---------------------
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let subscriptionsCancelled = 0;
    try {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (sub?.stripe_customer_id && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const active = await stripe.subscriptions.list({
          customer: sub.stripe_customer_id,
          status: "active",
        });
        for (const s of active.data) {
          await stripe.subscriptions.cancel(s.id);
          subscriptionsCancelled += 1;
        }
        log("Cancelled subscriptions", { subscriptionsCancelled });
      }
    } catch (stripeError) {
      // A billing failure must not leave a half-deleted account behind.
      log("Stripe cancellation failed", { error: String(stripeError) });
      return jsonResponse(
        {
          error:
            "We could not cancel your subscription, so nothing was deleted. Please try again in a few minutes.",
          code: "BILLING_ERROR",
        },
        500,
      );
    }

    // --- Step 2: storage objects ------------------------------------------
    for (const bucket of USER_STORAGE_BUCKETS) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
        const paths = (files ?? []).map((f: { name: string }) => `${userId}/${f.name}`);
        if (paths.length > 0) {
          await admin.storage.from(bucket).remove(paths);
          log("Removed storage objects", { bucket, count: paths.length });
        }
      } catch (storageError) {
        log("Storage cleanup issue", { bucket, error: String(storageError) });
      }
    }

    // --- Step 3: clear authorship on shared library content ----------------
    for (const [table, column] of AUTHORSHIP_TABLES) {
      const { error } = await admin.from(table).update({ [column]: null }).eq(column, userId);
      if (error) log("Authorship clear issue", { table, column, error: error.message });
    }

    // --- Step 4: delete owned rows (includes unlinking parents/athletes) ---
    const failures: Array<{ table: string; column: string; error: string }> = [];
    for (const [table, column] of OWNED_TABLES) {
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error) {
        failures.push({ table, column, error: error.message });
        log("Row deletion issue", { table, column, error: error.message });
      }
    }

    // --- Step 5: profile ---------------------------------------------------
    const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
    if (profileError) {
      failures.push({ table: "profiles", column: "id", error: profileError.message });
    }

    // --- Step 6: the auth user itself --------------------------------------
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      log("Auth deletion failed", { userId, error: authError.message, failures });
      return jsonResponse(
        {
          error:
            "Your account could not be fully deleted. Nothing further was removed and our team has been notified. Please try again or contact support.",
          code: "AUTH_DELETE_FAILED",
        },
        500,
      );
    }

    log("Account deleted", { userId, subscriptionsCancelled, failures: failures.length });

    return jsonResponse(
      {
        success: true,
        message: "Account deleted",
        subscriptionsCancelled,
        nonBlockingIssues: failures.length,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { userId, message });
    return jsonResponse({ error: message }, 500);
  }
});
