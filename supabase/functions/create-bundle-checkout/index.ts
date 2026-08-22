// Public bundle checkout — anyone with the link can buy.
// Price and discount are re-read from the database; never trusted from the client.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[CREATE-BUNDLE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const rawCode = typeof body?.code === "string" ? body.code.trim() : "";
    if (!slug || slug.length > 120) return json({ error: "Invalid bundle" }, 400);
    if (rawCode.length > 60) return json({ error: "Invalid code" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Canonical bundle state from the database.
    const { data: bundle, error: bundleErr } = await admin
      .from("bundles")
      .select("id, name, description, price_cents, status, cover_url")
      .eq("slug", slug)
      .maybeSingle();

    if (bundleErr) {
      log("Bundle lookup failed", { message: bundleErr.message });
      return json({ error: "Lookup failed" }, 500);
    }
    if (!bundle || bundle.status !== "published") {
      return json({ error: "This bundle is not available for purchase." }, 404);
    }

    // Optional signed-in buyer — identity comes from the validated token only.
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email ?? null;
      }
    }

    // Server-side discount validation.
    let unitAmount = bundle.price_cents as number;
    let appliedCode: string | null = null;
    if (rawCode) {
      const { data: code } = await admin
        .from("bundle_discount_codes")
        .select("*")
        .ilike("code", rawCode)
        .eq("active", true)
        .maybeSingle();

      const now = Date.now();
      const usable =
        !!code &&
        (!code.bundle_id || code.bundle_id === bundle.id) &&
        (!code.expires_at || new Date(code.expires_at).getTime() > now) &&
        (code.max_redemptions == null || code.redeemed_count < code.max_redemptions);

      if (!usable) return json({ error: "That discount code isn't valid for this bundle." }, 400);

      const discount =
        code!.kind === "percent"
          ? Math.floor((unitAmount * Math.min(code!.value, 100)) / 100)
          : Math.min(code!.value, unitAmount);
      unitAmount = Math.max(unitAmount - discount, 0);
      appliedCode = String(code!.code).toUpperCase();
    }

    if (unitAmount < 50) {
      return json({ error: "Price after discount is below the $0.50 minimum." }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (userEmail ?? undefined),
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: bundle.name,
              description: (bundle.description ?? "").slice(0, 300) || undefined,
              metadata: { bundle_id: bundle.id, build_type: "bundle" },
            },
          },
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&build=${encodeURIComponent(bundle.id)}&slug=${encodeURIComponent(slug)}`,
      cancel_url: `${origin}/b/${encodeURIComponent(slug)}`,
      metadata: {
        build_id: bundle.id,
        build_type: "bundle",
        bundle_slug: slug,
        ...(userId ? { user_id: userId } : {}),
        ...(appliedCode ? { discount_code: appliedCode } : {}),
      },
    });

    log("Checkout session created", { sessionId: session.id, unitAmount, appliedCode });
    return json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ error: message }, 500);
  }
});
