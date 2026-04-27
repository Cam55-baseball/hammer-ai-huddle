/**
 * PHASE 13.5 — Access enforcement for purchased builds.
 * Renders one of: loading, sign-in required, invalid link, denied, or
 * "content coming soon" placeholder. RLS guarantees server-side safety
 * even though hasAccess() runs from the client.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasAccess } from '@/lib/userBuildAccess';

interface Props {
  buildType: 'program' | 'bundle' | 'consultation';
}

export default function BuildAccessGate({ buildType }: Props) {
  const { id: buildId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user?.id || !buildId) {
      setChecking(false);
      return;
    }
    setChecking(true);
    hasAccess(user.id, buildId).then((ok) => {
      if (!cancelled) {
        setAllowed(ok);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, buildId, authLoading]);

  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-2">{children}</div>
    </div>
  );

  if (authLoading || checking) {
    return <Wrap><p className="text-muted-foreground">Loading…</p></Wrap>;
  }
  if (!buildId) {
    return <Wrap><p className="text-muted-foreground">Invalid link.</p></Wrap>;
  }
  if (!user) {
    return (
      <Wrap>
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <p className="text-muted-foreground">You must sign in to access this content.</p>
      </Wrap>
    );
  }
  if (!allowed) {
    return (
      <Wrap>
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">You do not have access to this content.</p>
      </Wrap>
    );
  }
  return (
    <Wrap>
      <h1 className="text-xl font-semibold capitalize">{buildType}</h1>
      <p className="text-muted-foreground">Content coming soon.</p>
      <p className="text-xs text-muted-foreground/70 break-all">{buildId}</p>
    </Wrap>
  );
}
