import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { usePurchaseAvailability } from '@/hooks/usePurchaseAvailability';

const GATED_PREFIXES = ['/select-modules', '/pricing', '/checkout', '/dashboard', '/training', '/nutrition', '/vault'];

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

  // Never flash a pending athlete purchase flow to a coach or scout while redirecting.
  if (user && progress?.demo_state === 'pending' && !roleLoading && !isStaffAccount &&
      !pathname.startsWith('/demo') && !pathname.startsWith('/start-here') &&
      GATED_PREFIXES.some(p => pathname.startsWith(p))) return null;

  return <>{children}</>;
}
