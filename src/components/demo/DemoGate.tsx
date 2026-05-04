import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDemoProgress } from '@/hooks/useDemoProgress';

const GATED_PREFIXES = ['/select-modules', '/pricing', '/checkout'];

export function DemoGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { progress, loading } = useDemoProgress();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) return;
    if (!progress) return;
    if (progress.demo_state !== 'pending') return;
    if (pathname.startsWith('/demo') || pathname.startsWith('/start-here')) return;
    if (!GATED_PREFIXES.some(p => pathname.startsWith(p))) return;
    const intent = encodeURIComponent(pathname + search);
    navigate(`/start-here?intent=${intent}`, { replace: true });
  }, [user, progress, loading, authLoading, pathname, search, navigate]);

  return <>{children}</>;
}
