// Step 12 Part A3 — automatic safety.
//
// Runs once a night, after the shadow determinism check. If last night's check
// failed, the backup plan was used on more than 0.5% of days, or card problems
// rose above a feature's normal level, every switch that is on drops down one
// step (Everyone → Pilot → Just me → Off). The owner gets an alert and the
// reason is written to the switch log.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evaluateAutoOff, type SwitchMode } from "../_shared/wic/flags/rollout.ts";
import { switchDownNote } from "../_shared/wic/watch/rules.ts";
import { writeNotes } from "../_shared/wic/watch/write.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Switches the rest-day / logging rollout governs. */
const GOVERNED = ["rest_day_calculator", "one_tap_logging"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body?.dry_run === true;

    const [switchRes, checkRes, baseRes] = await Promise.all([
      supabase.from("wk_feature_switches").select("feature_key, label, mode, allowlist, updated_by"),
      supabase
        .from("tcs_shadow_checks")
        .select("status, mismatches, fallback_rate, checked_date")
        .order("run_at", { ascending: false })
        .limit(1),
      supabase.from("wk_rollout_baselines").select("feature_key, baseline_errors_per_day"),
    ]);

    const check = (checkRes.data ?? [])[0] ?? null;
    const shadowCheck = check
      ? {
        status: String(check.status),
        mismatches: Number(check.mismatches ?? 0),
        fallbackRate: Number(check.fallback_rate ?? 0),
      }
      : null;

    const baselines = new Map(
      (baseRes.data ?? []).map((b: any) => [b.feature_key as string, Number(b.baseline_errors_per_day ?? 0)]),
    );

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const actions: any[] = [];

    for (const row of switchRes.data ?? []) {
      if (!GOVERNED.includes(row.feature_key)) continue;
      const mode = (row.mode ?? "off") as SwitchMode;
      if (mode === "off") continue;

      const { count } = await supabase
        .from("wk_feature_error_events")
        .select("id", { count: "exact", head: true })
        .eq("feature_key", row.feature_key)
        .gte("occurred_at", since);

      const verdict = evaluateAutoOff({
        mode,
        shadowCheck,
        errorsToday: count ?? 0,
        baselineErrors: baselines.get(row.feature_key) ?? 0,
      });

      if (!verdict.demoted) {
        actions.push({ feature_key: row.feature_key, demoted: false, mode });
        continue;
      }

      if (!dryRun) {
        await supabase
          .from("wk_feature_switches")
          .update({ mode: verdict.toMode })
          .eq("feature_key", row.feature_key);

        await supabase.from("wk_feature_switch_audit").insert({
          feature_key: row.feature_key,
          from_mode: verdict.fromMode,
          to_mode: verdict.toMode,
          from_allowlist: row.allowlist,
          to_allowlist: row.allowlist,
          changed_by: null,
          automatic: true,
          reason: verdict.reason,
        });

        await supabase.from("owner_alerts").insert({
          alert_key: `tcs_auto_off_${row.feature_key}`,
          severity: "high",
          title: `${row.label} dropped to ${verdict.toMode}`,
          detail: {
            feature_key: row.feature_key,
            from_mode: verdict.fromMode,
            to_mode: verdict.toMode,
            trigger: verdict.trigger,
            reason: verdict.reason,
            checked_date: check?.checked_date ?? null,
          },
          minute_bucket: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
        });

        // Step 13 Part B — every automatic switch-down is noted with its trigger.
        await writeNotes(supabase as any, [
          switchDownNote({
            featureKey: row.feature_key,
            label: row.label ?? row.feature_key,
            fromMode: verdict.fromMode,
            toMode: verdict.toMode,
            trigger: verdict.trigger ?? "unknown",
            reason: verdict.reason ?? "",
          }),
        ]);
      }

      actions.push({ feature_key: row.feature_key, ...verdict });
    }

    return new Response(JSON.stringify({ status: "ok", dry_run: dryRun, shadowCheck, actions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[tcs-auto-off] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
