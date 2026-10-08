/**
 * legal_v2 one-time agreement screen, shown after sign-in (new and existing users).
 *  - Everyone: accept updated Terms / Privacy / Consumer Health Data / Medical & Safety.
 *  - Everyone: health-data collection consent — a separate, unchecked opt-in (yes or no both saved).
 *  - Adults 18+: Assumption of Risk & Release (typed full name + checkbox).
 *  - 13–17: a parent signs the minor waiver from an emailed link (TeenWaiverGate on the training plan);
 *    under-13 parents sign it in the parent flow.
 * OFF switch → renders children untouched.
 */
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { yearsOn } from "@/lib/parent/parentConsent";
import { LegalMarkdown } from "./LegalMarkdown";
import {
  AGREEMENT_SLUGS, UPDATED_TERMS_SLUGS, PUBLIC_LEGAL_DOCS, fetchLatestDoc, fetchLatestVersions,
  myConsentStatus, pendingAcceptances, recordConsent, useLegalV2, type LegalDoc,
} from "@/lib/legal/legalV2";

const OPEN = [/^\/auth/, /^\/signup/, /^\/legal\//, /^\/terms/, /^\/privacy/, /^\/reset-password/, /^\/parent-waiver\//];

type Need = { terms: string[]; health: boolean; release: LegalDoc | null; versions: Record<string, number> };

export function LegalV2Gate({ children }: { children: React.ReactNode }) {
  const { user } = useOptionalAuth() as any;
  const { pathname } = useLocation();
  const { on, ready } = useLegalV2();
  const [need, setNeed] = useState<Need | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!ready || !on || !user?.id) { setNeed(null); return; }
    let alive = true;
    (async () => {
      const slugs = [...UPDATED_TERMS_SLUGS, AGREEMENT_SLUGS.healthConsent, AGREEMENT_SLUGS.adultRelease];
      const [versions, status, prof] = await Promise.all([
        fetchLatestVersions(slugs), myConsentStatus(),
        supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle(),
      ]);
      const age = (prof.data as any)?.date_of_birth ? yearsOn((prof.data as any).date_of_birth) : null;
      const terms = pendingAcceptances(versions, status);
      const hs = status[AGREEMENT_SLUGS.healthConsent];
      const health = !!versions[AGREEMENT_SLUGS.healthConsent] && (!hs || hs.document_version < versions[AGREEMENT_SLUGS.healthConsent]);
      const rs = status[AGREEMENT_SLUGS.adultRelease];
      const needRelease = age !== null && age >= 18 && !!versions[AGREEMENT_SLUGS.adultRelease]
        && (!rs || rs.choice !== "signed" || rs.document_version < versions[AGREEMENT_SLUGS.adultRelease]);
      const release = needRelease ? await fetchLatestDoc(AGREEMENT_SLUGS.adultRelease) : null;
      if (alive) setNeed({ terms, health, release, versions });
    })().catch(() => alive && setNeed(null)); // never lock someone out on a network error
    return () => { alive = false; };
  }, [on, ready, user?.id, tick]);

  if (!need || OPEN.some((r) => r.test(pathname))) return <>{children}</>;
  if (!need.terms.length && !need.health && !need.release) return <>{children}</>;
  return <AgreementScreen need={need} onDone={() => setTick((t) => t + 1)} />;
}

function AgreementScreen({ need, onDone }: { need: Need; onDone: () => void }) {
  const [accept, setAccept] = useState(false);
  const [health, setHealth] = useState(false);
  const [name, setName] = useState("");
  const [release, setRelease] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const titles = Object.fromEntries(PUBLIC_LEGAL_DOCS.map((d) => [d.slug, d.title]));
  const ok = (!need.terms.length || accept) && (!need.release || (release && name.trim().split(/\s+/).length >= 2));

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      for (const s of need.terms) await recordConsent({ slug: s, version: need.versions[s], choice: "accepted", method: "updated_terms_screen" });
      if (need.health) await recordConsent({ slug: AGREEMENT_SLUGS.healthConsent, version: need.versions[AGREEMENT_SLUGS.healthConsent], choice: health ? "accepted" : "declined", method: "checkbox" });
      if (need.release) await recordConsent({ slug: need.release.slug, version: need.release.version, choice: "signed", method: "typed_signature", signer_name: name.trim(), signer_role: "self_adult" });
      onDone();
    } catch { setErr("Couldn't save. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  return (
    <main className="flex min-h-[100dvh] justify-center bg-background px-5 pb-[calc(1.5rem+var(--safe-bottom,0px))] pt-[calc(1.25rem+var(--safe-top,0px))]">
      <div className="w-full max-w-md space-y-5">
        <h1 className="text-2xl font-semibold">Before you keep training</h1>
        {need.terms.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold">Updated terms</h2>
            <p className="text-sm text-muted-foreground">We updated these. Tap a name to read it.</p>
            <ul className="space-y-1">{need.terms.map((s) => <li key={s}><Link className="inline-flex min-h-[44px] items-center text-primary underline" to={`/legal/${s}`} target="_blank">{titles[s] ?? s}</Link></li>)}</ul>
            <label className="flex min-h-[44px] items-start gap-3 text-sm"><Checkbox checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" />I have read and agree to the updated documents above.</label>
          </section>
        )}
        {need.health && (
          <section className="space-y-2 rounded-lg border p-3">
            <h2 className="font-semibold">Health information (optional)</h2>
            <p className="text-sm text-muted-foreground">Sleep, pain, injuries, readiness, nutrition and body measurements help us keep your plan safe. It's your choice.</p>
            <label className="flex min-h-[44px] items-start gap-3 text-sm"><Checkbox checked={health} onCheckedChange={(v) => setHealth(v === true)} className="mt-0.5" /><span>Yes, Hammers Modality may collect and use my health information as described in the <Link to="/legal/consumer-health-data" target="_blank" className="text-primary underline">Consumer Health Data Privacy Policy</Link>.</span></label>
          </section>
        )}
        {need.release && (
          <section className="space-y-3 rounded-lg border p-3">
            <h2 className="font-semibold">{need.release.title}</h2>
            <div className="max-h-64 overflow-y-auto text-sm"><LegalMarkdown body={need.release.body} /></div>
            <div className="space-y-1.5"><Label htmlFor="rel-name">Type your full legal name</Label><Input id="rel-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-11" /></div>
            <label className="flex min-h-[44px] items-start gap-3 text-sm"><Checkbox checked={release} onCheckedChange={(v) => setRelease(v === true)} className="mt-0.5" />I am 18 or older and I agree to this Assumption of Risk & Release.</label>
          </section>
        )}
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button className="h-12 w-full text-base" disabled={!ok || busy} onClick={save}>{busy ? "Saving…" : "Save and continue"}</Button>
      </div>
    </main>
  );
}
