import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { usePurchaseAvailability } from '@/hooks/usePurchaseAvailability';

const GATED_PREFIXES = ['/select-modules', '/pricing', '/checkout', '/training', '/nutrition', '/vault'];

// '/dashboard' is deliberately NOT gated: new athletes go straight from
// onboarding to the dashboard, where the spotlight tour auto-starts.
export function DemoGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { progress, loading } = useDemoProgress();
  const { isStaffAccount, roleLoading } = usePurchaseAvailability();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (authLoading || loading || roleLoading || isStaffAccount) return;
    if (!user) return;
    if (!progress) return;
    if (progress.demo_state !== 'pending') return;
    if (pathname.startsWith('/demo') || pathname.startsWith('/start-here')) return;
    if (!GATED_PREFIXES.some(p => pathname.startsWith(p))) return;
    const intent = encodeURIComponent(pathname + search);
    navigate(`/start-here?intent=${intent}`, { replace: true });
  }, [user, progress, loading, authLoading, roleLoading, isStaffAccount, pathname, search, navigate]);

  return <>{children}</>;
}
