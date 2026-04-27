// PHASE 11 — Owner-gated Stripe Checkout for a single BuildItem.
// Reads localStorage-shaped BuildItem from the client, validates owner role,
// creates a one-off Stripe Checkout session via price_data (no per-build Product needed).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-BUILD-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Default prices in USD when build.meta.price is not provided.
const DEFAULT_PRICE_USD: Record<string, number> = {
  program: 99,
  bundle: 49,
  consultation: 199,
};

type BuildType = "program" | "bundle" | "consultation";

interface BuildItem {
  id: string;
  type: BuildType;
  name: string;
  meta: { price?: string | number; videoId?: string } & Record<string, unknown>;
  createdAt: number;
}

function validateBuild(input: unknown): BuildItem | null {
  if (!input || typeof input !== "object") return null;
  const b = input as Record<string, unknown>;
  if (typeof b.id !== "string" || !b.id) return null;
  if (b.type !== "program" && b.type !== "bundle" && b.type !== "consultation") return null;
  if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 200) return null;
  if (typeof b.createdAt !== "number") return null;
  const meta = (b.meta && typeof b.meta === "object" ? b.meta : {}) as BuildItem["meta"];
  return {
    id: b.id,
    type: b.type as BuildType,
    name: b.name.trim(),
    meta,
    createdAt: b.createdAt,
  };
}

function resolveUnitAmount(build: BuildItem): number {
  const raw = build.meta?.price;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  const dollars = Number.isFinite(n) && n > 0 ? n : DEFAULT_PRICE_USD[build.type];
  return Math.round(dollars * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    log("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    // Owner-only gate.
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .eq("status", "active");
    if (rolesErr) {
      log("Role lookup failed", { message: rolesErr.message });
      return new Response(JSON.stringify({ error: "Role lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: owner role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const build = validateBuild(body?.build);
    if (!build) {
      return new Response(JSON.stringify({ error: "Invalid build payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unitAmount = resolveUnitAmount(build);
    if (unitAmount < 50) {
      return new Response(JSON.stringify({ error: "Price too low (min $0.50)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Reuse existing Stripe customer when possible.
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: build.name,
              metadata: {
                build_id: build.id,
                build_type: build.type,
                video_id: String(build.meta?.videoId ?? ""),
              },
            },
          },
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&build=${encodeURIComponent(build.id)}`,
      cancel_url: `${origin}/owner/builds`,
      metadata: {
        user_id: user.id,
        build_id: build.id,
        build_type: build.type,
      },
    });

    log("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
