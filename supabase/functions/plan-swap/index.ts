import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { missingGearAnswer, swapGearList } from "../_shared/planSwap/commonGear.ts";
import { blockKnownGear, blockSwapChoices } from "../_shared/planSwap/blockSwap.ts";
import { injuryWords, requiredGear, swapChoices, swapMemoryAnswer, rememberedMissingGear, type SwapPlayer } from "../_shared/planSwap/simpleSwap.ts";

const base = { prescriptionId: z.string().uuid(), planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  speedSetup: z.object({ spaceYards: z.number().finite().min(0).max(200).nullable(), hill: z.boolean(), sled: z.boolean(), band: z.boolean(), treadmill: z.boolean() }).strict().optional(),
  block: z.object({ modality: z.string().max(40), index: z.number().int().min(0), sport: z.enum(["baseball", "softball"]) }).optional(),
  missing: z.array(z.string().min(1).max(60)).max(40), note: z.string().max(300).optional() };
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("options"), ...base }).strict(),
  z.object({ action: z.literal("swap"), ...base, toSlug: z.string().min(1).max(120),
    scope: z.enum(["today", "always"]) }).strict(),
]);
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Use the Swap sheet." }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return reply({ error: "Sign in to use Swap." }, 401);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply({ error: "Swap is unavailable. Nothing was saved." }, 503);
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, service);
  const { data: identity, error: authError } = await client.auth.getUser(auth.slice(7));
  if (authError || !identity.user) return reply({ error: "Sign in to use Swap." }, 401);
  const uid = identity.user.id;
  const { data: swapEnabled, error: gateError } = await client.rpc("swap_v2_enabled");
  if (gateError || swapEnabled !== true) return reply({ error: "Use the existing alternatives on your plan." }, 403);
  try {
    const input = bodySchema.safeParse(await req.json());
    if (!input.success) return reply({ error: "Check your Swap answer. Nothing was saved." }, 400);
    const body = input.data;
    if (body.block) {
      const location = body.block;
      const { data: snapshot, error: snapshotError } = await client.from("athlete_plan_snapshots").select("*")
        .eq("id", body.prescriptionId).eq("user_id", uid).eq("plan_date", body.planDate).eq("sport", location.sport).maybeSingle();
      if (snapshotError || !snapshot) return reply({ error: "Reload your plan. Nothing was saved." }, 409);
      const payload = snapshot.payload as any;
      const block = payload?.blocks?.find((b: any) => b.modality === location.modality);
      const source = block?.drills?.[location.index];
      if (!source || block.status !== "ready") return reply({ error: "This item can't be changed." }, 409);
      const [{ data: inventory, error: inventoryError }, { data: memory, error: memoryError }, { data: context, error: contextError }] = await Promise.all([
        client.from("athlete_equipment_context").select("equipment,valid_until,created_at").eq("user_id", uid).order("created_at", { ascending: false }),
        client.from("athlete_equipment_memory").select("confirmed_have,confirmed_lacks").eq("user_id", uid).or(`scope.eq.always,plan_date.eq.${body.planDate}`).order("created_at", { ascending: true }),
        client.from("athlete_context").select("injury_history,sport_primary,season_phase").eq("user_id", uid).maybeSingle(),
      ]);
      if (inventoryError || memoryError || contextError) return reply({ error: "We couldn't check your saved answers. Nothing was saved." }, 503);
      const knownGear = blockKnownGear(source, location.modality, location.sport);
      const missing = missingGearAnswer(body.missing, body.note, knownGear);
      if (context?.sport_primary !== location.sport || injuryWords(context?.injury_history).length) {
        return body.action === "options" ? reply({ gear: swapGearList(knownGear), missing, choices: [] }) : reply({ error: "No safe swap found for this one; skip it today." }, 409);
      }
      const owned = new Set<string>((inventory ?? []).find(r => !r.valid_until || Date.parse(r.valid_until) > Date.now())?.equipment ?? []);
      for (const answer of memory ?? []) {
        for (const g of answer.confirmed_have ?? []) owned.add(g);
        for (const g of answer.confirmed_lacks ?? []) owned.delete(g);
      }
      let speedInputs;
      if (location.modality === "speed" && body.speedSetup) {
        const [{ data: profile, error: profileError }, { data: ledger, error: ledgerError }, { data: ready, error: readyError }, { data: day, error: dayError }] = await Promise.all([
          client.from("profiles").select("date_of_birth").eq("id", uid).maybeSingle(),
          client.from("wk_cns_ledger").select("units_spent,units_cap").eq("user_id", uid).eq("ledger_date", body.planDate).maybeSingle(),
          client.from("asb_events").select("payload").eq("athlete_id", uid).eq("topic_id", "behavioral.readiness")
            .gte("occurred_at", `${body.planDate}T00:00:00Z`).lt("occurred_at", `${body.planDate}T23:59:59.999Z`).order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
          client.from("athlete_daily_log").select("injury_mode,day_status").eq("user_id", uid).eq("entry_date", body.planDate).maybeSingle(),
        ]);
        if (profileError || ledgerError || readyError || dayError) return reply({ error: "We couldn't check today's readiness and running load. Nothing was saved." }, 503);
        const score = (ready?.payload as any)?.score;
        const born = profile?.date_of_birth ? Date.parse(profile.date_of_birth) : NaN;
        // These are this player's declared Today facts, never assumed saved equipment.
        for (const [item, available] of [["hill", body.speedSetup.hill], ["sled", body.speedSetup.sled], ["bands", body.speedSetup.band]] as const) {
          if (available && !missing.includes(item)) owned.add(item);
        }
        speedInputs = { ...body.speedSetup, readiness: day?.injury_mode || ["rest", "injury", "off"].includes(day?.day_status ?? "") ? "stop" as const :
          typeof score === "number" && score > 4 && score <= 10 ? "ready" as const : null,
          cnsLoad: ledger?.units_spent ?? null, cnsCap: ledger?.units_cap ?? null, phase: context?.season_phase ?? "",
          injuries: injuryWords(context?.injury_history), ageYears: Number.isFinite(born) ? Math.floor((Date.now() - born) / 31_557_600_000) : null };
      }
      const choices = blockSwapChoices(source, location.modality, location.sport, [...owned], [...missing, ...rememberedMissingGear(memory ?? [])], speedInputs);
      if (body.action === "options") return reply({ gear: swapGearList(knownGear), missing, choices });
      const chosen = choices.find(choice => choice.slug === body.toSlug);
      if (!chosen) return reply({ error: "No safe swap found for this one; skip it today." }, 409);
      const { data: result, error: saveError } = await admin.rpc("wk_swap_block_atomic", {
        p_user: uid, p_date: body.planDate, p_id: snapshot.id, p_sport: location.sport,
        p_modality: location.modality, p_index: location.index, p_expected: source,
        p_replacement: chosen.replacement, p_reason: chosen.reason, p_missing: missing, p_scope: body.scope,
      });
      if (saveError || !result?.saved) {
        console.error("[plan-swap] block transaction failed", saveError?.code, saveError?.message);
        return reply({ error: "Your plan changed or the save couldn't finish. Nothing was saved." }, 409);
      }
      return reply({ saved: result.saved, memorySaved: result.memorySaved, reason: chosen.reason });
    }
    const { data: rx } = await client.from("wk_prescriptions").select("*")
      .eq("id", body.prescriptionId).eq("user_id", uid).eq("plan_date", body.planDate).maybeSingle();
    if (!rx || !["planned", "pending"].includes(rx.status)) return reply({ error: "Reload your plan. This exercise can't be changed." }, 409);
    const { data: source } = await client.from("wk_movement_catalog").select("*").eq("slug", rx.movement_slug).maybeSingle();
    if (!source) return reply({ error: "This exercise couldn't be checked." }, 409);
    const knownGear = requiredGear(source);
    const gear = swapGearList(knownGear);
    const missing = missingGearAnswer(body.missing, body.note, knownGear);
    const [{ data: ctx, error: ctxError }, { data: profile, error: profileError }, { data: family, error: familyError }, { data: inventory, error: inventoryError }, { data: memory, error: memoryError }] = await Promise.all([
      client.from("athlete_context").select("season_phase, injury_history, sport_primary").eq("user_id", uid).maybeSingle(),
      client.from("profiles").select("date_of_birth").eq("id", uid).maybeSingle(),
      source.substitution_family ? client.from("wk_movement_catalog").select("*")
        .eq("substitution_family", source.substitution_family).eq("movement_category", source.movement_category).eq("is_active", true)
        : Promise.resolve({ data: [] as any[] }),
      client.from("athlete_equipment_context").select("scope,equipment,valid_until,created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      client.from("athlete_equipment_memory").select("scope,plan_date,confirmed_have,confirmed_lacks,created_at").eq("user_id", uid)
        .or(`scope.eq.always,plan_date.eq.${body.planDate}`).order("created_at", { ascending: true }),
    ]);
    if (ctxError || profileError || familyError || inventoryError || memoryError) return reply({ error: "We couldn't check your saved equipment and safety answers. Nothing was saved." }, 503);
    const liveInventory = (inventory ?? []).filter(r => !r.valid_until || new Date(r.valid_until).getTime() > Date.now());
    const equipment = ["session", "temporary", "persistent", "inferred"].map(scope => liveInventory.find(r => r.scope === scope)).find(Boolean);
    const available = new Set<string>(equipment?.equipment ?? []);
    for (const answer of memory ?? []) {
      for (const g of answer.confirmed_have ?? []) available.add(g);
      for (const g of answer.confirmed_lacks ?? []) available.delete(g);
    }
    const knownMissing = [...new Set([...missing, ...rememberedMissingGear(memory ?? [])])];
    const dob = profile?.date_of_birth ? new Date(profile.date_of_birth) : null;
    const player: SwapPlayer = { phase: rx.phase ?? ctx?.season_phase ?? "",
      sport: ctx?.sport_primary === "baseball" || ctx?.sport_primary === "softball" ? ctx.sport_primary : null,
      ageYears: dob ? Math.floor((Date.now() - dob.getTime()) / 31_557_600_000) : null,
      injuries: injuryWords(ctx?.injury_history ?? null), availableGear: [...available] };
    const choices = swapChoices(source, family ?? [], rx, knownMissing, player);
    // No open field on a single-row sprint → the deterministic no-field mix, same intent and reps.
    if (body.speedSetup && source.category === "speed_lab" && knownMissing.includes("open_field")) {
      const [{ data: ledger, error: ledgerError }, { data: ready, error: readyError }, { data: day, error: dayError }] = await Promise.all([
        client.from("wk_cns_ledger").select("units_spent,units_cap").eq("user_id", uid).eq("ledger_date", body.planDate).maybeSingle(),
        client.from("asb_events").select("payload").eq("athlete_id", uid).eq("topic_id", "behavioral.readiness")
          .gte("occurred_at", `${body.planDate}T00:00:00Z`).lt("occurred_at", `${body.planDate}T23:59:59.999Z`).order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
        client.from("athlete_daily_log").select("injury_mode,day_status").eq("user_id", uid).eq("entry_date", body.planDate).maybeSingle(),
      ]);
      if (ledgerError || readyError || dayError) return reply({ error: "We couldn't check today's readiness and running load. Nothing was saved." }, 503);
      const score = (ready?.payload as any)?.score;
      const speed = speedRowSwap(source, rx, knownMissing, { ...body.speedSetup,
        readiness: day?.injury_mode || ["rest", "injury", "off"].includes(day?.day_status ?? "") ? "stop" : typeof score === "number" && score > 4 && score <= 10 ? "ready" : null,
        cnsLoad: ledger?.units_spent ?? null, cnsCap: ledger?.units_cap ?? null, phase: player.phase, injuries: player.injuries, ageYears: player.ageYears });
      if (body.action === "options") return reply({ gear, missing, choices: speed ? [{ slug: speed.slug, name: speed.name, reason: speed.reason }] : [] });
      if (!speed || speed.slug !== body.toSlug) return reply({ error: "No safe swap found for this one; skip it today." }, 409);
      const { data: result, error: saveError } = await admin.rpc("wk_swap_speed_item_atomic", {
        p_user: uid, p_date: body.planDate, p_id: rx.id, p_expected: rx, p_target: speed.slug, p_reason: speed.reason,
        p_missing: missing, p_scope: body.scope, p_total_reps: speed.totalReps, p_distance_feet: speed.distanceFeet, p_note: speed.note,
      });
      if (saveError || !result?.saved) return reply({ error: "Your plan changed or the save couldn't finish. Nothing was saved; reload and try again." }, 409);
      return reply({ saved: result.saved, reason: speed.reason, memorySaved: result.memorySaved });
    }
    if (body.action === "options") return reply({ gear, missing, choices });

    const chosen = choices.find(c => c.slug === body.toSlug);
    if (!chosen) return reply({ error: "That choice isn't safe for you today anymore. Nothing was saved." }, 409);
    const target = (family ?? []).find((t: any) => t.slug === chosen.slug);
    if (!target) return reply({ error: "That choice is unavailable. Nothing was saved." }, 409);
    const { data: result, error: saveError } = await admin.rpc("wk_swap_item_atomic", {
      p_user: uid, p_date: body.planDate, p_id: rx.id, p_expected: rx,
      p_target: target.slug, p_reason: chosen.reason, p_missing: missing, p_scope: body.scope,
    });
    if (saveError || !result?.saved) return reply({ error: "Your plan changed or the save couldn't finish. Nothing was saved; reload and try again." }, 409);
    return reply({ saved: result.saved, reason: chosen.reason, memorySaved: result.memorySaved });
  } catch {
    return reply({ error: "Swap couldn't finish. Reload your plan to check whether the exercise changed before trying again." }, 500);
  }
});
