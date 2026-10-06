/**
 * Under-13 parent-controlled accounts (switch `under13_parent_program`).
 * Every write goes through the `parent-consent` backend function; the app
 * never writes consent rows itself.
 */
import { supabase } from "@/integrations/supabase/client";

export const PROMISE_VERSION = 2;
export const NOTICE_VERSION = 2;

/** Exact owner-approved wording (Round 3). */
export const TRAINING_OPT_IN_TEXT =
  "Optional: Help improve Hammers Modality. If you say yes, we use your child's training information — what was prescribed, what was completed, what worked, and numbers like angles, timing and speeds — with name, email, birthdate, photos and videos removed, to improve our training programs. It stays inside Hammers Modality and is never sold or given to other companies to train their AI. You can turn this off anytime, and we'll remove your child's information from future training.";

export interface ConsentStatus {
  enabled: boolean;
  consent: { id: string; signed_at: string; payment_confirmed_at: string | null; withdrawn_at: string | null; child_display_name: string } | null;
}

export async function callParentConsent<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("parent-consent", { body: { action, ...body } });
  if (error) {
    let detail: any = null;
    try { detail = await (error as any).context?.json?.(); } catch { /* no body */ }
    const e = new Error(detail?.error ?? error.message);
    (e as any).code = detail?.error ?? "failed";
    throw e;
  }
  return data as T;
}

export async function fetchConsentTexts(): Promise<{ promise: string; notice: string }> {
  const { data } = await supabase.from("consent_texts" as any).select("kind, version, body");
  const rows = (data ?? []) as any[];
  return {
    promise: rows.find((r) => r.kind === "parent_promise" && r.version === PROMISE_VERSION)?.body ?? "",
    notice: rows.find((r) => r.kind === "parent_notice" && r.version === NOTICE_VERSION)?.body ?? "",
  };
}

export function yearsOn(dob: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  let a = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) a -= 1;
  return a;
}

export const PARENT_ERRORS: Record<string, string> = {
  parent_not_adult: "The parent or guardian must be 18 or older.",
  not_under_13: "This path is only for players under 13.",
  email_in_use: "That email already has an account. Use a different email for this child's login.",
  signature_missing: "Please sign in the box.",
  not_available: "This isn't available yet.",
  invalid: "Please check every field.",
};
