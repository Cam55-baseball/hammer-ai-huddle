/**
 * legal_v2 — new legal pages and consent flows (DRAFT, lawyer review pending).
 * Everything user-visible checks useLegalV2(); with the switch OFF nothing changes.
 * All consent writes go through the `legal-consent` backend function.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../../supabase/functions/_shared/wic/flags/featureSwitches";

export const LEGAL_V2_KEY = "legal_v2";

/** Public documents, in footer order. `slug` is the legal_documents slug and the /legal/:slug address. */
export const PUBLIC_LEGAL_DOCS = [
  { slug: "terms", title: "Terms of Service" },
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "consumer-health-data", title: "Consumer Health Data Privacy Policy" },
  { slug: "medical-safety", title: "Medical & Safety Disclaimer" },
  { slug: "subscription-policy", title: "Subscription, Auto-Renewal, Cancellation & Refund Policy" },
  { slug: "child-safety", title: "Child Safety & Communication Policy" },
  { slug: "community-guidelines", title: "Community & Content Guidelines" },
  { slug: "copyright", title: "Copyright (DMCA) Policy" },
  { slug: "accessibility", title: "Accessibility Statement" },
] as const;

/** Documents a person agrees to inside the app. */
export const AGREEMENT_SLUGS = {
  adultRelease: "adult-release",
  minorWaiver: "minor-waiver",
  healthConsent: "health-data-consent",
  healthSharing: "health-data-sharing",
  autoRenewal: "auto-renewal-consent",
  cancellation: "subscription-cancellation",
} as const;

/** Signed-in documents that the one-time "Updated terms" screen asks existing users to accept. */
export const UPDATED_TERMS_SLUGS = ["terms", "privacy", "consumer-health-data", "medical-safety"] as const;

const cache = new Map<string, Promise<boolean>>();
export function legalV2OnFor(userId: string | null | undefined): Promise<boolean> {
  const key = userId ?? "__anon";
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const { data } = await supabase.from("wk_feature_switches" as any)
        .select("feature_key, mode, allowlist, updated_by").eq("feature_key", LEGAL_V2_KEY).maybeSingle();
      // Signed-out visitors (public website) see the new pages only once the switch is "all".
      if (!userId) return (data as any)?.mode === "all";
      return isSwitchOnFor(data as any, userId);
    })().catch(() => false);
    cache.set(key, p);
  }
  return p;
}

export function useLegalV2(): { on: boolean; ready: boolean } {
  const { user, loading } = useOptionalAuth() as any;
  const [s, setS] = useState({ on: false, ready: false });
  useEffect(() => {
    let alive = true;
    if (loading) return;
    legalV2OnFor(user?.id).then((on) => alive && setS({ on, ready: true }));
    return () => { alive = false; };
  }, [user?.id, loading]);
  return s;
}

export interface LegalDoc { slug: string; version: number; title: string; body: string; effective_date: string | null; approved: boolean }

export async function fetchLatestDoc(slug: string): Promise<LegalDoc | null> {
  const { data } = await supabase.from("legal_documents" as any)
    .select("slug, version, title, body, effective_date, approved").eq("slug", slug)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  return (data as any) ?? null;
}

export async function fetchLatestVersions(slugs: readonly string[]): Promise<Record<string, number>> {
  const { data } = await supabase.from("legal_documents" as any).select("slug, version").in("slug", slugs as string[]);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as any[]) out[r.slug] = Math.max(out[r.slug] ?? 0, r.version);
  return out;
}

export type ConsentChoice = "accepted" | "declined" | "withdrawn" | "signed" | "cancelled";
export async function recordConsent(input: {
  slug: string; version: number; choice: ConsentChoice; method: string;
  signer_name?: string; signer_role?: string; details?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke("legal-consent", { body: { action: "record", ...input } });
  if (error) throw error;
  return data as { ok: true; id: string; recorded_at: string };
}

export async function myConsentStatus(): Promise<Record<string, { document_version: number; choice: string; recorded_at: string }>> {
  const { data, error } = await supabase.functions.invoke("legal-consent", { body: { action: "status" } });
  if (error) throw error;
  return (data as any)?.latest ?? {};
}

/**
 * Wording-only updates that never ask anyone to accept again: the newest
 * version each document still REQUIRES acceptance for. Later versions are
 * shown with a one-time notice instead (PolicyUpdateNotice).
 */
export const ACCEPTANCE_REQUIRED_UP_TO: Record<string, number> = {
  terms: 1, // v2 adds only the coach/org fair-use section; players do not re-accept (owner 2026-10-13)
  privacy: 1,
  "consumer-health-data": 1,
  "child-safety": 1,
};

/** One-time, non-blocking "we've updated" notice for these document versions. */
export const POLICY_NOTICE = { id: "under13-scouting-2026-10-12", slugs: ["privacy", "child-safety", "consumer-health-data"] } as const;

/** Which updated documents this person still has to accept (pure, tested). */
export function pendingAcceptances(
  latestVersions: Record<string, number>,
  status: Record<string, { document_version: number; choice: string }>,
  slugs: readonly string[] = UPDATED_TERMS_SLUGS,
): string[] {
  return slugs.filter((s) => {
    const latest = latestVersions[s];
    if (!latest) return false;
    const v = Math.min(latest, ACCEPTANCE_REQUIRED_UP_TO[s] ?? latest);
    const st = status[s];
    return !st || st.choice !== "accepted" || st.document_version < v;
  });
}

/** Exact auto-renewal sentence shown before checkout. */
export function autoRenewalSentence(period: string, price: string): string {
  return `I agree my plan renews automatically every ${period} at ${price} until I cancel. I can cancel anytime in Settings → Legal & privacy.`;
}

/** Until a DMCA agent is registered, the copyright page shows the contact email instead of a blank placeholder. */
export const COPYRIGHT_CONTACT = "Copyright notices: [hammersmodality@hammersmodality.org](mailto:hammersmodality@hammersmodality.org)";
export function displayBody(slug: string, body: string): string {
  if (slug !== "copyright" || !/PLACEHOLDER/.test(body)) return body;
  return body
    .replace(/Send our designated agent a written notice/, "Send us a written notice")
    .replace(/# Designated agent\n[\s\S]*?(?=\n# )/, `# Where to send notices\n${COPYRIGHT_CONTACT}\n`);
}

/** Drafting notes for the lawyer ("[LAWYER: …]", "[OWNER/LAWYER: …]") are never shown to readers. */
export function stripDraftNotes(body: string): string {
  return body.replace(/[ \t]*\[(?:OWNER\/)?LAWYER:[^\]]*\][ \t]*/g, "").replace(/\n{3,}/g, "\n\n");
}
