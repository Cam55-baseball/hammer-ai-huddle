// Owner Exercise Vault — owner/admin only. Draft → validate → make live →
// undo workflow over exercise_vault_drafts / exercise_vault_versions /
// exercise_vault_audit. Every action writes an audit row. Live plans already
// built today are never touched: a live version takes effect from the next
// plan build unless the owner explicitly passes apply_today: true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { computeExerciseStats } from "../_shared/vault/exerciseStats.ts";
import { pendingEquipmentReviews } from "../_shared/vault/equipmentReview.ts";
import { validateExercise, type VaultExercise } from "../_shared/vault/validateExercise.ts";
import { ownerGear } from "../_shared/vault/ownerDefaults.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const cors = corsHeaders;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);
    const url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return json({ error: "Vault is unavailable." }, 503);
    const admin = createClient(url, service);
    const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const [{ data: isOwner }, { data: isAdmin }] = await Promise.all([
      admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" }),
      admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    ]);
    if (!isOwner && !isAdmin) return json({ error: "Owner/admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const slug = String(body?.slug ?? "").trim();
    if (!slug && action !== "list" && action !== "reviewed") return json({ error: "Missing slug" }, 400);

    const audit = (act: string, detail: unknown) =>
      admin.from("exercise_vault_audit").insert({ slug, action: act, actor: u.user.id, detail });

    if (action === "save_draft") {
      const payload = body?.payload;
      if (!payload || typeof payload !== "object") return json({ error: "Missing payload" }, 400);
      if (!Array.isArray(payload.equipment) || payload.equipment.some((item: unknown) => typeof item !== "string") ||
          !Array.isArray(payload.sports) || !Array.isArray(payload.season_phases) || typeof payload.name !== "string" || typeof payload.how_to_one_rep !== "string") {
        return json({ error: "Check the exercise fields." }, 400);
      }
      const mapped = ownerGear(payload.equipment);
      const normalized = { ...payload, slug, equipment: mapped.equipment } as VaultExercise;
      const validation = [...validateExercise(normalized, { isNew: Boolean(body?.is_new) }), ...mapped.unknown.map(item => `Equipment needs owner review: ${item}`)];
      const row = {
        slug,
        payload: normalized,
        validation,
        is_new: Boolean(body?.is_new),
        status: "draft",
        created_by: u.user.id,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await admin.from("exercise_vault_drafts")
        .select("id").eq("slug", slug).eq("status", "draft").maybeSingle();
      const { error } = existing
        ? await admin.from("exercise_vault_drafts").update(row).eq("id", existing.id)
        : await admin.from("exercise_vault_drafts").insert(row);
      if (error) return json({ error: error.message }, 500);
      await audit("save_draft", { is_new: row.is_new, problems: validation.length });
      if (mapped.unknown.length) await audit("equipment_corrected", { note: `Unknown equipment: ${mapped.unknown.join(", ")}`, after: mapped.equipment });
      return json({ ok: true });
    }

    if (action === "make_live") {
      const { data: draft } = await admin.from("exercise_vault_drafts")
        .select("*").eq("slug", slug).eq("status", "draft").maybeSingle();
      if (!draft) return json({ error: "No draft to make live" }, 404);
      const livePayload = draft.payload as VaultExercise;
      const liveProblems = [...validateExercise(livePayload, { isNew: Boolean(draft.is_new) }), ...ownerGear(livePayload.equipment).unknown.map(item => `Equipment needs owner review: ${item}`)];
      if (liveProblems.length > 0) {
        return json({ error: "Draft still has validation problems", problems: liveProblems }, 400);
      }
      const { data: cur } = await admin.from("exercise_vault_versions")
        .select("version,payload").eq("slug", slug).is("undone_at", null)
        .order("version", { ascending: false }).limit(1);
      const applyToday = Boolean(body?.apply_today);
      const today = new Date().toISOString().slice(0, 10);
      const effective = new Date(); if (!applyToday) effective.setDate(effective.getDate() + 1);
      const { error } = await admin.from("exercise_vault_versions").insert({
        slug,
        version: (cur?.[0]?.version ?? 0) + 1,
        payload: draft.payload,
        previous_payload: cur?.[0]?.payload ?? null,
        apply_today: applyToday,
        effective_from: applyToday ? today : effective.toISOString().slice(0, 10),
        made_live_by: u.user.id,
      });
      if (error) return json({ error: error.message }, 500);
      await admin.from("exercise_vault_drafts").update({ status: "live", updated_at: new Date().toISOString() }).eq("id", draft.id);
      // Brand-new exercises enter the planner's catalog so the next plan build
      // can prescribe them. The slug is new, so no plan built today references
      // it — today's plans are never changed.
      if (draft.is_new) {
        const p = (draft.payload ?? {}) as Record<string, unknown>;
        const sports = Array.isArray(p.sports) ? (p.sports as string[]) : [];
        const equipment = (Array.isArray(p.equipment) ? (p.equipment as string[]) : []).filter((x) => x && x !== "none");
        const DOSAGE: Record<string, string> = {
          weight_reps: "reps", reps: "reps", hold_seconds: "seconds", duration: "seconds",
          sprint_time: "seconds", jump_distance: "feet", jump_height: "inches",
          throw_count: "throws", velocity: "mph", bat_speed: "mph", exit_velocity: "mph",
          swing_count: "swings", check_off: "checkoff", bunt_attempts: "attempts",
        };
        const row: Record<string, any> = {
          slug,
          name: String(p.name ?? slug),
          category: String(p.catalog_category ?? p.card_type ?? ""),
          sport_scope: sports.length >= 2 ? "both" : (sports[0] ?? "both"),
          min_age_years: typeof p.min_age === "number" ? p.min_age : 0,
          season_eligibility: Array.isArray(p.season_phases)
            ? [...new Set((p.season_phases as string[]).flatMap((s) =>
                s === "off_season" ? ["os_q1", "os_q2", "os_q3", "os_q4"] : [s]))]
            : null,
          equipment,
          equipment_requirements: equipment.length ? equipment : ["bodyweight"],
          equipment_alternatives: Array.isArray(p.equipment_alternatives) ? p.equipment_alternatives : [],
          default_sets: typeof p.default_sets === "number" ? p.default_sets : null,
          default_reps: typeof p.default_reps === "number" ? p.default_reps : null,
          default_duration_seconds: typeof p.default_seconds === "number" ? p.default_seconds : null,
          default_distance_feet: typeof p.default_distance_ft === "number" ? p.default_distance_ft : null,
          default_load_pct: typeof p.default_load_pct === "number" ? p.default_load_pct : null,
          dosage_unit: DOSAGE[String(p.measure_type ?? "")] ?? "reps",
          cue: String(p.cue ?? ""),
          why_prescribed: String(p.why ?? ""),
          contraindications: p.stop_if ? [String(p.stop_if)] : null,
          is_active: true,
          wic_metadata_complete: true,
          updated_at: new Date().toISOString(),
          // Optional engine tags — only written when the owner sets them.
          ...(typeof p.speed_category === "string" && p.speed_category
            ? { speed_category: p.speed_category } : {}),
          ...(p.training_age_legality && typeof p.training_age_legality === "object"
            ? { training_age_legality: p.training_age_legality } : {}),
        };
        if (typeof p.swap_like === "string" && p.swap_like) {
          const { data: like } = await admin.from("wk_movement_catalog")
            .select("category,family,substitution_family,movement_category,intensity_class").eq("slug", p.swap_like).maybeSingle();
          if (!like || like.category !== row.category) return json({ error: "Swap alternative must be an existing item in the same category." }, 400);
          Object.assign(row, { family: like.family, substitution_family: like.substitution_family, movement_category: like.movement_category,
            intensity_class: (typeof p.intensity_class === "string" && p.intensity_class) || like.intensity_class });
        } else if (typeof p.intensity_class === "string" && p.intensity_class) Object.assign(row, { intensity_class: p.intensity_class });
        const tags = Array.isArray(p.issue_tags) ? (p.issue_tags as string[]).map(String).filter(Boolean) : [];
        if (tags.length) Object.assign(row, { troubleshooting_tags: tags });
        const flags = Array.isArray(p.injury_flags) ? (p.injury_flags as string[]).map(String).filter(Boolean) : [];
        if (flags.length) Object.assign(row, { contraindications: [...(row.contraindications ?? []), ...flags] });
        if (body?.test_only === true) {
          const { data: sw } = await admin.from("wk_feature_switches").select("allowlist").eq("feature_key", "swap_v2").maybeSingle();
          const testIds = (sw?.allowlist ?? []) as string[];
          if (!testIds.length) return json({ error: "No TEST accounts are listed. Nothing went live." }, 400);
          Object.assign(row, { visible_to: testIds });
        } else Object.assign(row, { visible_to: null });
        const { error: ce } = await admin.from("wk_movement_catalog").upsert(row, { onConflict: "slug" });
        if (ce) return json({ error: `Catalog entry failed: ${ce.message}` }, 500);
      }
      await audit("make_live", { version: (cur?.[0]?.version ?? 0) + 1, apply_today: applyToday, is_new: Boolean(draft.is_new), test_only: body?.test_only === true });
      return json({ ok: true });
    }

    if (action === "undo") {
      const { data: cur } = await admin.from("exercise_vault_versions")
        .select("*").eq("slug", slug).is("undone_at", null)
        .order("version", { ascending: false }).limit(1);
      const live = cur?.[0];
      if (!live) return json({ error: "Nothing to undo" }, 400);
      if (!live.previous_payload) {
        const { data: newDraft } = await admin.from("exercise_vault_drafts")
          .select("id").eq("slug", slug).eq("is_new", true).limit(1);
        await admin.from("exercise_vault_versions").update({ undone_at: new Date().toISOString() }).eq("id", live.id);
        if (!newDraft?.length) {
          // First edit of a built-in exercise: the built-in card is back in use; the exercise stays on.
          await audit("undo", { undone: live.version, restored: "built_in" });
          return json({ ok: true });
        }
        // First live version of a vault-created exercise: undo switches it back off in the planner.
        const { error: de } = await admin.from("wk_movement_catalog").update({ is_active: false, updated_at: new Date().toISOString() }).eq("slug", slug);
        if (de) return json({ error: de.message }, 500);
        await audit("undo", { undone: live.version, deactivated: true });
        return json({ ok: true });
      }
      await admin.from("exercise_vault_versions").update({ undone_at: new Date().toISOString() }).eq("id", live.id);
      const { error } = await admin.from("exercise_vault_versions").insert({
        slug,
        version: live.version + 1,
        payload: live.previous_payload,
        previous_payload: live.payload,
        apply_today: live.apply_today,
        effective_from: live.effective_from,
        made_live_by: u.user.id,
      });
      if (error) return json({ error: error.message }, 500);
      await audit("undo", { undone: live.version, restored_as: live.version + 1 });
      return json({ ok: true });
    }

    if (action === "list") {
      let vq = admin.from("exercise_vault_versions")
        .select("slug,version,apply_today,effective_from,undone_at,made_live_by,made_live_at,payload")
        .order("made_live_at", { ascending: false }).limit(200);
      if (slug) vq = vq.eq("slug", slug);
      let dq = admin.from("exercise_vault_drafts")
        .select("slug,is_new,status,validation,updated_at,payload")
        .order("updated_at", { ascending: false }).limit(200);
      if (slug) dq = dq.eq("slug", slug);
      const [{ data: versions, error: ve }, { data: drafts, error: de }] = await Promise.all([vq, dq]);
      if (ve || de) return json({ error: ve?.message ?? de?.message }, 500);
      return json({ versions: versions ?? [], drafts: drafts ?? [] });
    }

    if (action === "approve_review") {
      // Owner accepts the current text as-is; nothing about the card changes.
      const { error } = await audit("review_approved", { note: body?.note ?? null });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "reviewed") {
      const [{ data: a, error: ae }, { data: v, error: vErr }] = await Promise.all([
        admin.from("exercise_vault_audit").select("slug,action,at").in("action", ["review_approved", "equipment_corrected", "make_live"]).order("at", { ascending: false }).limit(5000),
        admin.from("exercise_vault_versions").select("slug").is("undone_at", null).limit(5000),
      ]);
      const reviewError = ae ?? vErr;
      if (reviewError) return json({ error: reviewError.message }, 500);
      return json({ slugs: [...new Set([...(a ?? []).filter(row => row.action === "review_approved"), ...(v ?? [])].map((r: any) => r.slug))], equipmentReview: pendingEquipmentReviews(a ?? []) });
    }

    if (action === "stats") {
      // Aggregates only — no athlete names or ids leave this function.
      const [rx, logs, anon] = await Promise.all([
        admin.from("wk_prescriptions").select("status,plan_date").eq("movement_slug", slug).limit(20000),
        admin.from("wk_session_logs").select("rpe,metrics").eq("movement_slug", slug).limit(20000),
        admin.from("anon_training_records").select("delta_2w,delta_4w,delta_8w").eq("movement_slug", slug).limit(20000),
      ]);
      const err = rx.error ?? logs.error ?? anon.error;
      if (err) return json({ error: err.message }, 500);
      return json(computeExerciseStats({ prescriptions: rx.data ?? [], logs: (logs.data ?? []) as any, anon: (anon.data ?? []) as any }));
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
});
