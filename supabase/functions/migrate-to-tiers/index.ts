import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MIGRATE-TIERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify owner authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { data: ownerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle();

    if (!ownerRole) throw new Error("Only owner can run migration");

    logStep("Migration started by owner", { userId: user.id });

    // Fetch all active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .not("subscribed_modules", "eq", "{}");

    if (subError) throw new Error(`Failed to fetch subscriptions: ${subError.message}`);

    const results: any[] = [];
    const sports = ['baseball', 'softball'];

    for (const sub of (subscriptions || [])) {
      const modules: string[] = sub.subscribed_modules || [];
      if (modules.length === 0) continue;

      // Skip if already migrated (has tier keys)
      if (modules.some((m: string) => m.includes('_5tool') || m.includes('_pitcher') || m.includes('_golden2way'))) {
        logStep("Already migrated, skipping", { userId: sub.user_id });
        continue;
      }

      const newModules: string[] = [];
      let tier: string | null = null;

      for (const sport of sports) {
        const hasHitting = modules.includes(`${sport}_hitting`);
        const hasPitching = modules.includes(`${sport}_pitching`);
        const hasThrowing = modules.includes(`${sport}_throwing`);

        if (hasHitting && hasPitching && hasThrowing) {
          newModules.push(`${sport}_golden2way`);
          tier = 'golden2way';
        } else if (hasHitting && hasThrowing) {
          newModules.push(`${sport}_5tool`);
          tier = '5tool';
        } else if (hasHitting || hasThrowing) {
          newModules.push(`${sport}_5tool`);
          tier = '5tool';
        } else if (hasPitching) {
          newModules.push(`${sport}_pitcher`);
          tier = tier || 'pitcher';
        }
      }

      if (newModules.length === 0) continue;

      // Determine grandfathered price based on what they had
      const hadMultiple = modules.length > 1;
      const grandfatheredPrice = hadMultiple ? `$${modules.length * 200}` : '$200';

      const updateData: any = {
        subscribed_modules: newModules,
        tier,
        grandfathered_at: new Date().toISOString(),
        grandfathered_price: grandfatheredPrice,
      };

      // Don't overwrite existing grandfathered data
      if (sub.grandfathered_price) {
        delete updateData.grandfathered_price;
        delete updateData.grandfathered_at;
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("user_id", sub.user_id);

      if (updateError) {
        logStep("Failed to update user", { userId: sub.user_id, error: updateError.message });
        continue;
      }

      // Log to audit
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "tier_migration",
        table_name: "subscriptions",
        record_id: sub.user_id,
        metadata: {
          old_modules: modules,
          new_modules: newModules,
          tier,
          grandfathered_price: updateData.grandfathered_price || sub.grandfathered_price,
        },
      });

      results.push({ userId: sub.user_id, oldModules: modules, newModules, tier });
      logStep("Migrated user", { userId: sub.user_id, from: modules, to: newModules, tier });
    }

    logStep("Migration complete", { totalMigrated: results.length });

    return new Response(JSON.stringify({ success: true, migrated: results.length, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
