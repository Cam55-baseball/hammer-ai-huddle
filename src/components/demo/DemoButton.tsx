import { useMemo, useState } from 'react';
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

/** Always-on Demo button: opens the guided tour for this viewer's role and plan. Re-openable any time. */
export function DemoButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useOptionalAuth();
  const { modules } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { isScout, isCoach } = useScoutAccess();
  const [open, setOpen] = useState(false);

  const audience: TourAudience = isOwner || isAdmin ? 'staff' : isCoach ? 'coach' : isScout ? 'scout' : 'athlete';
  const sport = (() => { try { return localStorage.getItem('selectedSport') === 'softball' ? 'softball' : 'baseball'; } catch { return 'baseball'; } })() as 'baseball' | 'softball';
  const steps = useMemo(
    () => stepsFor(audience, { modules, sport, isOwnerOrAdmin: isOwner || isAdmin }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audience, modules.join(','), sport, isOwner, isAdmin],
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 font-bold" data-testid="demo-button">
        <Sparkles className="h-4 w-4" /> Demo
      </Button>
      <SpotlightTour
        tourId={`demo-${audience}`}
        steps={steps}
        open={open}
        onClose={() => setOpen(false)}
        userId={user?.id}
        navigate={navigate}
        currentPath={location.pathname + location.search}
      />
    </>
  );
}
