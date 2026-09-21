/**
 * Step 21 proof — forced generation for every current athlete.
 *
 * Signs in as each athlete that holds a prescription (service-role magic link,
 * no password touched), forces today's card, and reports: card built or failed,
 * build time against the 3.2 s baseline, any critical watchdog note raised in
 * the window with the prescription rows it names, and whether the lift is
 * ordered after practice, game and conditioning.
 *
 * Run: bun scripts/audits/evidence/forced-generations.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key || !anon) {
  console.error("[forced] SUPABASE_URL / SERVICE_ROLE / ANON key required");
  process.exit(2);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

const startedAt = new Date().toISOString();

const { data: subs, error: subErr } = await admin
  .from("subscriptions")
  .select("user_id, status, subscribed_modules")
  .eq("status", "active");
if (subErr) throw subErr;
const athletes = (subs ?? []).filter((s) => (s.subscribed_modules ?? []).length > 0);
console.log(`[forced] athletes with an active prescription: ${athletes.length}`);

const today = new Date().toISOString().slice(0, 10);
const results: Array<Record<string, unknown>> = [];

for (const s of athletes) {
  const { data: u } = await admin.auth.admin.getUserById(s.user_id);
  const email = u?.user?.email;
  if (!email) {
    results.push({ user_id: s.user_id, built: false, reason: "no email on the account" });
    continue;
  }
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !link?.properties?.email_otp) {
    results.push({ user_id: s.user_id, built: false, reason: `could not mint a session: ${linkErr?.message}` });
    continue;
  }
  const userClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: sess, error: otpErr } = await userClient.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: "email",
  });
  if (otpErr || !sess?.session) {
    results.push({ user_id: s.user_id, built: false, reason: `sign-in failed: ${otpErr?.message}` });
    continue;
  }

  const t0 = Date.now();
  const { data, error } = await userClient.functions.invoke("wk-generate-daily", { body: { plan_date: today } });
  const ms = Date.now() - t0;

  const { data: rows } = await admin
    .from("wk_daily_prescriptions")
    .select("slot, sequence_order, movement_slug")
    .eq("user_id", s.user_id)
    .eq("plan_date", today)
    .order("sequence_order", { ascending: true });

  // Step 21B — the lift never runs before practice, game or conditioning.
  const ORDER = ["warmup", "primer", "speed", "bat_speed", "throwing", "practice_or_game", "conditioning", "lift", "recovery"];
  const idx = (slot: string) => {
    const i = ORDER.indexOf(slot);
    return i === -1 ? ORDER.length : i;
  };
  const slots = (rows ?? []).map((r) => String(r.slot));
  const liftAt = slots.findIndex((x) => x === "lift");
  const orderOk = liftAt === -1 ||
    slots.every((x, i) => (i < liftAt ? idx(x) <= idx("lift") : true)) &&
      !slots.slice(liftAt).some((x) => ["practice_or_game", "conditioning", "speed", "bat_speed", "warmup"].includes(x));

  results.push({
    user_id: s.user_id,
    built: !error && (rows ?? []).length > 0,
    rows: (rows ?? []).length,
    ms,
    within_baseline: ms <= 3200,
    lift_ordered_last_among_work: orderOk,
    error: error?.message ?? null,
  });
  console.log(
    `[forced] ${s.user_id.slice(0, 8)} — ${!error && (rows ?? []).length > 0 ? "card built" : "FAILED"} · ${(rows ?? []).length} rows · ${ms}ms${ms <= 3200 ? "" : " (over baseline)"} · order ${orderOk ? "ok" : "WRONG"}`,
  );
  await userClient.auth.signOut();
}

const { data: notes } = await admin
  .from("ti_watch_notes")
  .select("id, severity, kind, title, detail, created_at")
  .gte("created_at", startedAt)
  .order("created_at", { ascending: true });
const criticals = (notes ?? []).filter((n) => n.severity === "critical");

console.log("");
console.log(`[forced] cards built: ${results.filter((r) => r.built).length} / ${results.length}`);
console.log(`[forced] failed: ${results.filter((r) => !r.built).length}`);
console.log(`[forced] slowest build: ${Math.max(0, ...results.map((r) => Number(r.ms ?? 0)))}ms (baseline 3200ms)`);
console.log(`[forced] new watchdog notes in the window: ${(notes ?? []).length} · critical: ${criticals.length}`);
for (const c of criticals) {
  console.log(`[forced]   CRITICAL ${c.kind}: ${c.title}`);
  console.log(`[forced]     rows: ${JSON.stringify((c.detail as { rows?: unknown })?.rows ?? null)}`);
}

const failed = results.filter((r) => !r.built).length;
const slow = results.filter((r) => r.within_baseline === false).length;
const misordered = results.filter((r) => r.lift_ordered_last_among_work === false).length;
if (failed || criticals.length || misordered) {
  console.error(`[forced] ❌ FAILED — ${failed} cards failed, ${criticals.length} criticals, ${misordered} misordered.`);
  process.exit(1);
}
console.log(`[forced] ✅ PASSED — every card built, no criticals, lift last among work${slow ? ` (${slow} over baseline)` : ""}.`);
