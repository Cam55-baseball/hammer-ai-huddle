/**
 * One-time, non-blocking "We've updated our Privacy Policy" notice (owner, 2026-10-12).
 * Shown once per account per document version: "Got it" (or "I've read this" on the
 * document page) saves a consent record, and the notice never shows again — on any
 * device — until a newer version comes out. Under-13 accounts get the parent line too.
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { yearsOn } from "@/lib/parent/parentConsent";
import { POLICY_NOTICE, fetchLatestVersions, myConsentStatus, recordConsent, useLegalV2 } from "@/lib/legal/legalV2";
import { noticeStillNeeded } from "@/lib/legal/noticeState";

const HIDE_ON = [/^\/auth/, /^\/signup/, /^\/legal\//, /^\/parent-sign\//, /^\/parent-waiver\//];
export const noticeKey = (uid: string) => `policy-notice:${POLICY_NOTICE.id}:${uid}`;

export function PolicyUpdateNotice() {
  const { user } = useOptionalAuth() as any;
  const { on, ready } = useLegalV2();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [under13, setUnder13] = useState(false);
  const [versions, setVersions] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    if (!ready || !on || !user?.id) { setShow(false); return; }
    (async () => {
      const [latest, status] = await Promise.all([fetchLatestVersions(POLICY_NOTICE.slugs), myConsentStatus()]);
      if (!alive) return;
      setVersions(latest);
      if (!noticeStillNeeded(latest, status, POLICY_NOTICE.slugs)) { setShow(false); return; }
      setShow(true);
      const { data } = await supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle();
      const dob = (data as any)?.date_of_birth;
      if (alive) setUnder13(!!dob && yearsOn(dob) < 13);
    })().catch(() => alive && setShow(false)); // never block or nag when status can't be read
    return () => { alive = false; };
  }, [ready, on, user?.id, pathname.startsWith("/legal/")]);

  if (!show || HIDE_ON.some((r) => r.test(pathname))) return null;
  const acknowledge = async () => {
    setShow(false);
    await Promise.all(POLICY_NOTICE.slugs.filter((s) => versions[s]).map((s) =>
      recordConsent({ slug: s, version: versions[s], choice: "accepted", method: "notice_acknowledged", details: { notice: POLICY_NOTICE.id } }).catch(() => undefined)));
  };
  return (
    <div role="status" aria-label="Policy update" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-lg pb-safe">
      <button onClick={acknowledge} aria-label="Close" className="absolute right-1 top-1 rounded p-2 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <p className="pr-8 text-sm font-semibold">We've updated our Privacy Policy</p>
      <p className="pr-14 text-xs text-muted-foreground">
        Clearer rules about scouts and coaches. You don't need to do anything.
      </p>
      {under13 && (
        <p className="mt-1 text-xs">
          Parent: you can now let approved scouts and coaches see items you pick. It stays off until you turn it on, and scouts can only ever contact you, never your child.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => navigate("/legal/privacy")}>Read it</Button>
        <Button size="sm" className="h-8 px-2 text-xs" onClick={acknowledge}>Got it</Button>
      </div>
    </div>
  );
}
