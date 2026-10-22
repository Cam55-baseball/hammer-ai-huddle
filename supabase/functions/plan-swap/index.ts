import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { missingGearAnswer, swapGearList } from "../_shared/planSwap/commonGear.ts";
import { injuryWords, requiredGear, swapChoices, swapMemoryAnswer, rememberedMissingGear, type SwapPlayer } from "../_shared/planSwap/simpleSwap.ts";

const base = { prescriptionId: z.string().uuid(), planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
