/**
 * PHASE 14 — Access enforcement + post-purchase UX + safe owner bypass.
 * - Owner role bypasses hasAccess() for preview/testing (no DB writes).
 * - "Allowed" state offers clear next actions instead of a dead end.
 * RLS still enforced server-side; this is a UI gate refinement only.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { hasAccess } from '@/lib/userBuildAccess';
import { Button } from '@/components/ui/button';

interface Props {
  buildType: 'program' | 'bundle' | 'consultation';
}

export default function BuildAccessGate({ buildType }: Props) {
  const { id: buildId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (authLoading || ownerLoading) return;
    if (!user?.id || !buildId) {
      setChecking(false);
      return;
    }

    // Owner bypass — preview only, no writes to user_build_access.
    if (isOwner) {
      setAllowed(true);
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
  }, [user?.id, buildId, authLoading, ownerLoading, isOwner]);

  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-2">{children}</div>
    </div>
  );

  if (authLoading || ownerLoading || checking) {
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
        <div className="flex flex-col gap-2 pt-3">
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </Wrap>
    );
  }
  return (
    <Wrap>
      {isOwner && (
        <div className="flex justify-center">
          <span className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">
            Owner Preview Mode
          </span>
        </div>
      )}
      <h1 className="text-xl font-semibold capitalize">{buildType}</h1>
      <p className="text-muted-foreground">Content coming soon.</p>
      <p className="text-xs text-muted-foreground/70 break-all font-mono">{buildId}</p>
      <div className="flex flex-col gap-2 pt-3">
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          My Purchases
        </Button>
      </div>
    </Wrap>
  );
}
