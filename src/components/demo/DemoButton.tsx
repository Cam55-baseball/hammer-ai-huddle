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
const DASHBOARD_READY = '[data-tour="today-plan-heading"]';

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
  // has rendered. "New" = account created within the window AND never
  // auto-started on any device (flag in the account's own metadata) AND no
  // tour seen on this device. Any error: do nothing, dashboard stays as is.
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current || !user || open || !accessReady) return;
    if (location.pathname !== '/dashboard') return;
    try {
      const created = Date.parse((user as { created_at?: string }).created_at ?? '');
      const meta = (user as { user_metadata?: Record<string, unknown> }).user_metadata ?? {};
      const seenHere = Object.keys(localStorage).some((k) => k.startsWith(`hm-tour:${user.id}:`));
      if (!Number.isFinite(created) || Date.now() - created > NEW_ACCOUNT_MS || meta[AUTO_FLAG] || seenHere) {
        autoTried.current = true;
        return;
      }
    } catch { autoTried.current = true; return; }
    autoTried.current = true;
    const cancelled = false;
    const started = Date.now();
    // Second, server-side check: the profile row's own creation date. The
    // signed-in session's copy of the account can be stale or synthetic, so
    // it alone never decides. Any error or missing row: no auto-start.
    void (async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('created_at').eq('id', user.id).maybeSingle();
        const pc = Date.parse((data as { created_at?: string } | null)?.created_at ?? '');
        if (error || !Number.isFinite(pc) || Date.now() - pc > NEW_ACCOUNT_MS) return;
      } catch { return; }
      startWhenReady();
    })();
    function startWhenReady() {
    const wait = window.setInterval(() => {
      if (cancelled) return;
      if (window.location.pathname !== '/dashboard' || Date.now() - started > 20000) { window.clearInterval(wait); return; }
      const el = document.querySelector(DASHBOARD_READY);
      if (!el) return;
      window.clearInterval(wait);
      // Let the page settle, then record BEFORE showing, so exiting at step
      // one (or closing the app) still counts and it never re-triggers.
      window.setTimeout(() => {
        if (cancelled || window.location.pathname !== '/dashboard') return;
        try { localStorage.setItem(`hm-tour:${user.id}:auto`, JSON.stringify({ result: 'shown', at: Date.now() })); } catch { /* noop */ }
        void supabase.auth.updateUser({ data: { [AUTO_FLAG]: new Date().toISOString() } }).catch(() => {});
        setOpen(true);
      }, 1200);
    }, 300);
    };
    // No cleanup on re-render: the wait ends itself (ready, left page, or 20s).
    void cancelled;
  }, [user, open, accessReady, location.pathname]);

  // Staff-only preview override so the owner can check another audience's or plan's tour.
  const staff = isOwner || isAdmin;
  const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const asOverride = staff ? (read('hm.tourAs') as TourAudience | null) : null;
  const modulesOverride = staff && read('hm.tourModules') !== null ? (read('hm.tourModules') ?? '').split(',').filter(Boolean) : null;
  const audience: TourAudience = asOverride ?? (staff ? 'staff' : isCoach ? 'coach' : isScout ? 'scout' : 'athlete');
  const viewAsStaff = staff && !asOverride;
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
