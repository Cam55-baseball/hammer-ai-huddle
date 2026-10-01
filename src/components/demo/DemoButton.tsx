import { useEffect, useMemo, useState } from 'react';
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
    <SpotlightTour
      tourId={asOverride || modulesOverride ? `preview-${audience}-${(modulesOverride ?? []).join('-')}` : `demo-${audience}`}
      steps={steps}
      open={open && (latched || accessReady)}
      onClose={() => setOpen(false)}
      userId={user.id}
      navigate={navigate}
      currentPath={location.pathname + location.search}
    />
  );
}
