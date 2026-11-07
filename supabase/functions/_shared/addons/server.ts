// Server helpers for the add-on edge functions (service role; scoped to the buyer, their linked parent, or the owner).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { EARLY_RECAP, ONLINE_LESSONS, isUnder18, type AddonProduct } from "./rules.ts";
import type { PurchaseRow, PurchaseStore } from "./apple.ts";

export { corsHeaders };

/**
 * The shared 6-week recap generator must accept { periodStart, periodEnd, kind: 'early' } and save
 * recap_kind='early' before early recaps can be made. Until the owner approves that generator change
 * by name (docs/owner/early-recap-generator-patch.md), purchases keep their entitlement and wait.
 */
export const EARLY_RECAP_GENERATOR_READY = true; // owner approval by name, Nov 6

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}

export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data } = await c.auth.getUser(auth.replace("Bearer ", ""));
  return data.user ? { user: data.user, auth } : null;
}

export async function isOwner(db: SupabaseClient, userId: string) {
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "owner");
  return !!data?.length;
}

export async function hasActivePlan(db: SupabaseClient, userId: string) {
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", userId).in("role", ["owner", "admin"]);
  if (roles?.length) return true;
  const { data } = await db.from("subscriptions").select("status, subscribed_modules, tier").eq("user_id", userId);
  return (data ?? []).some((s: any) => ["active", "trialing"].includes(s.status) && ((s.subscribed_modules?.length ?? 0) > 0 || !!s.tier));
}

export async function recapAnchor(db: SupabaseClient, userId: string): Promise<Date | null> {
  const { data: st } = await db.from("vault_streaks").select("created_at").eq("user_id", userId).maybeSingle();
  if (st?.created_at) return new Date(st.created_at);
  const { data: sub } = await db.from("subscriptions").select("created_at").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
  return sub?.created_at ? new Date(sub.created_at) : null;
}

export async function boughtBlocks(db: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await db.from("addon_purchases").select("block_start").eq("user_id", userId).eq("product", "early_recap");
  return (data ?? []).map((r: any) => r.block_start).filter(Boolean);
}

export async function athleteFacts(db: SupabaseClient, athleteId: string, now = new Date()) {
  const { data: p } = await db.from("profiles").select("date_of_birth, full_name, first_name, contact_email").eq("id", athleteId).maybeSingle();
  const { data: links } = await db.from("parent_athlete_links").select("parent_user_id").eq("athlete_user_id", athleteId).eq("status", "active");
  const parentIds = (links ?? []).map((l: any) => l.parent_user_id);
  return { under18: isUnder18(p?.date_of_birth ?? null, now), parentIds, name: p?.full_name || p?.first_name || "Player", contactEmail: p?.contact_email ?? null };
}

export async function emailOf(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

export function purchaseStore(db: SupabaseClient): PurchaseStore {
  return {
    async findByExternalId(externalId) {
      const { data } = await db.from("addon_purchases").select("*").eq("external_id", externalId).maybeSingle();
      return data as any;
    },
    async insert(row: PurchaseRow) {
      const { data, error } = await db.from("addon_purchases").insert(row).select("*").single();
      if (!error) return { row: data as any };
      if (error.code === "23505") {
        return { error: String(error.message).includes("one_recap_per_block") ? "duplicate_block" : "duplicate_external" };
      }
      return { error: error.message };
    },
  };
}

export async function notify(db: SupabaseClient, userIds: string[], title: string, body: string, link: string) {
  if (!userIds.length) return;
  await db.from("addon_notices").insert(userIds.map((user_id) => ({ user_id, title, body, link })));
}

export async function ownerIds(db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from("user_roles").select("user_id").eq("role", "owner");
  return (data ?? []).map((r: any) => r.user_id);
}

export interface RecapGenerator {
  (args: { periodStart: string; periodEnd: string }): Promise<{ ok: true; recapId: string | null } | { ok: false; error: string }>;
}

/** Deliver an early recap. Never charges; failures keep the entitlement and are retried on the player's next visit. */
export async function deliverEarlyRecap(
  db: SupabaseClient,
  purchase: { id: string; user_id: string; block_start: string; delivery_status: string; delivery_attempts: number; created_at: string },
  generate: RecapGenerator | null,
) {
  if (purchase.delivery_status === "delivered") return { status: "delivered" as const };
  if (!EARLY_RECAP_GENERATOR_READY || !generate) {
    await db.from("addon_purchases").update({ delivery_status: "awaiting_generator", updated_at: new Date().toISOString() }).eq("id", purchase.id);
    return { status: "awaiting_generator" as const };
  }
  const res = await generate({ periodStart: purchase.block_start, periodEnd: purchase.created_at.slice(0, 10) });
  if (res.ok) {
    await db.from("addon_purchases").update({ delivery_status: "delivered", recap_id: res.recapId, last_error: null, updated_at: new Date().toISOString() }).eq("id", purchase.id);
    await notify(db, [purchase.user_id], "Your early recap is ready", "Your Early 6-Week Recap is saved with your recaps.", "/vault");
    return { status: "delivered" as const };
  }
  await db.from("addon_purchases").update({ delivery_status: "failed", delivery_attempts: purchase.delivery_attempts + 1, last_error: res.error.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", purchase.id);
  return { status: "failed" as const };
}

/** Calls the shared recap generator as the player (it reads the player's own data with their session). */
export function generatorAs(userAuth: string): RecapGenerator {
  return async ({ periodStart, periodEnd }) => {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-vault-recap`, {
      method: "POST",
      headers: { Authorization: userAuth, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify({ periodStart, periodEnd, kind: "early" }),
    });
    const text = await r.text();
    if (!r.ok) return { ok: false, error: `[${r.status}] ${text}` };
    try { return { ok: true, recapId: JSON.parse(text)?.recap_id ?? null }; } catch { return { ok: true, recapId: null }; }
  };
}

/** After a paid lesson purchase: open a booking and tell the player and the owner. */
export async function openLessonBooking(db: SupabaseClient, purchase: { id: string; user_id: string }) {
  const { data: existing } = await db.from("lesson_bookings").select("id").eq("purchase_id", purchase.id).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await db.from("lesson_bookings").insert({ purchase_id: purchase.id, athlete_user_id: purchase.user_id }).select("id").single();
  if (error) {
    const { data: again } = await db.from("lesson_bookings").select("id").eq("purchase_id", purchase.id).maybeSingle();
    return again?.id as string;
  }
  await db.from("addon_purchases").update({ delivery_status: "delivered" }).eq("id", purchase.id);
  await notify(db, [purchase.user_id], "Pick your 4 lesson times", "Your Hammers Online lessons are paid. Pick 4 days and times.", "/lessons");
  return data.id as string;
}

export const PRODUCTS: Record<AddonProduct, { priceCents: number; stripePriceId: string; name: string }> = {
  early_recap: { priceCents: EARLY_RECAP.priceCents, stripePriceId: EARLY_RECAP.stripePriceId, name: "Early 6-Week Recap" },
  online_lessons: { priceCents: ONLINE_LESSONS.priceCents, stripePriceId: ONLINE_LESSONS.stripePriceId, name: "Hammers Online ×4 — Private lessons" },
};
