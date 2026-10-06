import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { SpotlightTour } from '@/components/tour/SpotlightTour';
import { useOptionalAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { stepsFor, type TourAudience } from '@/lib/tour/tours';

const OPEN_EVENT = 'hm:open-demo-tour';

/** Always-on Demo button: opens the guided tour. Re-openable any time. */
export function DemoButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="gap-1.5 font-bold" data-testid="demo-button">
      <Sparkles className="h-4 w-4" /> Demo
    </Button>
  );
}

/** A tour crash must never take the dashboard down with it. */
class TourBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn('[demo] tour failed, hidden', e); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** New-account window: only accounts created this recently can auto-start. */
const NEW_ACCOUNT_MS = 48 * 60 * 60 * 1000;
const AUTO_FLAG = 'hm_demo_autostarted';
const LANDING_READY = '[data-tour="landing"]';
const PLAN_READY = '[data-tour="today-plan-heading"]';

/** Internal auto-start outcomes belong only in the debug console, for every role. */
function autoDiag(reason: string) {
  try {
    console.debug('[demo auto-start]', reason);
  } catch { /* never let diagnostics break anything */ }
}

/** Mounted once inside the router so the tour survives page changes. */
export function DemoTourHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useOptionalAuth();
  const { modules, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [open, setOpen] = useState(false);
  const { isScout, isCoach, loading: roleLoading } = useScoutAccess();
  // The tour fixes its step list when it opens, so wait until plan and role
  // are known — otherwise a paid athlete could get the free tour.
  const accessReady = !subLoading && !ownerLoading && !adminLoading && !roleLoading;
  // Latch: role/plan hooks re-load on page changes; the tour must not blink
  // closed and reopen mid-walk (that dropped the back-press exit).
  const [latched, setLatched] = useState(false);
  useEffect(() => { if (!open) setLatched(false); else if (accessReady) setLatched(true); }, [open, accessReady]);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, h);
    return () => window.removeEventListener(OPEN_EVENT, h);
  }, []);

  // Auto-start once for a genuinely new account, on the dashboard, after it
  // has rendered. "New" = account AND profile created within the window AND
  // never auto-started on any device (account metadata flag) AND no tour seen
  // on this device. Any error: no tour, dashboard untouched. Every outcome is
  // reported by autoDiag() — never a silent no-op.
  const autoTried = useRef(false);
  const roleRef = useRef({ isCoach, isScout });
  roleRef.current = { isCoach, isScout };
  useEffect(() => {
    if (!user) return;
    if (location.pathname !== '/dashboard') { autoDiag('waiting: not on /dashboard (' + location.pathname + ')', staffRef.current, false); return; }
    if (open) return;
    if (autoTried.current) return;
    if (!accessReady) { autoDiag('waiting: plan/role still loading', staffRef.current, false); return; }
    autoTried.current = true;
    const stop = (why: string) => autoDiag('skipped: ' + why, staffRef.current, true);
    try {
      const created = Date.parse((user as { created_at?: string }).created_at ?? '');
      const meta = (user as { user_metadata?: Record<string, unknown> }).user_metadata ?? {};
      const seenKey = Object.keys(localStorage).find((k) => k.startsWith(`hm-tour:${user.id}:`));
      if (!Number.isFinite(created)) return stop('account creation date unreadable');
      if (Date.now() - created > NEW_ACCOUNT_MS) return stop(`account is older than 48 hours (created ${new Date(created).toISOString()})`);
      if (meta[AUTO_FLAG]) return stop(`already auto-started on ${String(meta[AUTO_FLAG])}`);
      if (seenKey) return stop(`a tour was already seen on this device (${seenKey})`);
    } catch (e) { return stop('check failed: ' + String(e)); }
    const started = Date.now();
    void (async () => {
      // Server check on the profile row's own creation date. Retried, in case
      // the row lands a moment after first sign-in.
      let pc = NaN;
      for (let attempt = 0; attempt < 4 && !Number.isFinite(pc); attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 2000));
        try {
          const { data } = await supabase.from('profiles').select('created_at').eq('id', user.id).maybeSingle();
          pc = Date.parse((data as { created_at?: string } | null)?.created_at ?? '');
        } catch { /* retry */ }
      }
      if (!Number.isFinite(pc)) return stop('profile row not found or unreadable after retries');
      if (Date.now() - pc > NEW_ACCOUNT_MS) return stop(`profile is older than 48 hours (created ${new Date(pc).toISOString()})`);
      autoDiag('waiting: dashboard to finish loading', staffRef.current, false);
      let landingAt = 0;
      const wait = window.setInterval(() => {
        if (window.location.pathname !== '/dashboard') { window.clearInterval(wait); return stop('left the dashboard before it finished loading'); }
        if (Date.now() - started > 45000) { window.clearInterval(wait); return stop('dashboard did not finish loading within 45 seconds'); }
        if (!document.querySelector(LANDING_READY)) return;
        if (!landingAt) landingAt = Date.now();
        const { isCoach: c, isScout: sc } = roleRef.current;
        // Athletes: also wait for today's plan, but never more than 10s extra.
        if (!c && !sc && !document.querySelector(PLAN_READY) && Date.now() - landingAt < 10000) return;
        window.clearInterval(wait);
        // Settle, then record BEFORE showing, so exiting at step one (or
        // closing the app) still counts and it never re-triggers.
        window.setTimeout(() => {
          if (window.location.pathname !== '/dashboard') return stop('left the dashboard before the tour opened');
          try { localStorage.setItem(`hm-tour:${user.id}:auto`, JSON.stringify({ result: 'shown', at: Date.now() })); } catch { /* noop */ }
          void supabase.auth.updateUser({ data: { [AUTO_FLAG]: new Date().toISOString() } }).catch(() => {});
          autoDiag('started', staffRef.current, true);
          setOpen(true);
        }, 1200);
      }, 300);
    })();
  }, [user, open, accessReady, location.pathname]);

  // Staff-only preview override so the owner can check another audience's or plan's tour.
  const staff = isOwner || isAdmin;
  const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const asOverride = staff ? (read('hm.tourAs') as TourAudience | null) : null;
  const modulesOverride = staff && read('hm.tourModules') !== null ? (read('hm.tourModules') ?? '').split(',').filter(Boolean) : null;
  // A coach or scout role decides the tour even if the account is also an
  // admin — those accounts previously got the staff (athlete) tour.
  const audience: TourAudience = asOverride ?? (isCoach ? 'coach' : isScout ? 'scout' : staff ? 'staff' : 'athlete');
  const viewAsStaff = staff && audience === 'staff' && !asOverride;
  const sport = (() => { try { return localStorage.getItem('selectedSport') === 'softball' ? 'softball' : 'baseball'; } catch { return 'baseball'; } })() as 'baseball' | 'softball';
  const steps = useMemo(
    () => stepsFor(audience, { modules: modulesOverride ?? modules, sport, isOwnerOrAdmin: viewAsStaff }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audience, (modulesOverride ?? modules).join(','), sport, viewAsStaff],
  );

  if (!user) return null;
  return (
    <TourBoundary>
    <SpotlightTour
      tourId={asOverride || modulesOverride ? `preview-${audience}-${(modulesOverride ?? []).join('-')}` : `demo-${audience}`}
      steps={steps}
      open={open && (latched || accessReady)}
      onClose={() => setOpen(false)}
      userId={user.id}
      navigate={navigate}
      currentPath={location.pathname + location.search}
    />
    </TourBoundary>
  );
}
