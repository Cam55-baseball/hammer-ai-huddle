/**
 * One-time, non-blocking "We've updated our Privacy Policy" notice (owner, 2026-10-12).
 * No re-acceptance; dismissing hides it for this account on this device.
 * Under-13 accounts are run by a parent, so they get the parent line too.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { yearsOn } from "@/lib/parent/parentConsent";
import { POLICY_NOTICE, useLegalV2 } from "@/lib/legal/legalV2";

const HIDE_ON = [/^\/auth/, /^\/signup/, /^\/legal\//, /^\/parent-sign\//, /^\/parent-waiver\//];
export const noticeKey = (uid: string) => `policy-notice:${POLICY_NOTICE.id}:${uid}`;

export function PolicyUpdateNotice() {
  const { user } = useOptionalAuth() as any;
  const { on, ready } = useLegalV2();
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [under13, setUnder13] = useState(false);

  useEffect(() => {
    if (!ready || !on || !user?.id) { setShow(false); return; }
    if (localStorage.getItem(noticeKey(user.id))) return;
    setShow(true);
    supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle().then(({ data }) => {
      const dob = (data as any)?.date_of_birth;
      setUnder13(!!dob && yearsOn(dob) < 13);
    });
  }, [ready, on, user?.id]);

  if (!show || HIDE_ON.some((r) => r.test(pathname))) return null;
  const close = () => { localStorage.setItem(noticeKey(user.id), new Date().toISOString()); setShow(false); };
  return (
    <div role="status" aria-label="Policy update" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-lg pb-safe">
      <button onClick={close} aria-label="Dismiss" className="absolute right-1 top-1 rounded p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <p className="pr-6 text-sm font-semibold">We've updated our Privacy Policy</p>
      <p className="text-xs text-muted-foreground">
        Clearer rules about scouts and coaches. You don't need to do anything.
      </p>
      {under13 && (
        <p className="mt-1 text-xs">
          Parent: you can now let approved scouts and coaches see items you pick. It stays off until you turn it on, and scouts can only ever contact you, never your child.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={close}><Link to="/legal/privacy">Read it</Link></Button>
        <Button size="sm" className="h-7 px-2 text-xs" onClick={close}>Got it</Button>
      </div>
    </div>
  );
}
