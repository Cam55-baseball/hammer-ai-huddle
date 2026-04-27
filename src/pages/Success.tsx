/**
 * PHASE 11 — Post-payment confirmation.
 * No gated content / unlock yet (Phase 12).
 */
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';

export default function Success() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isOwner } = useOwnerAccess();

  const sessionId = params.get('session_id') ?? '';
  const buildId = params.get('build') ?? '';

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-8">
        <Card className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-14 w-14 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Payment Successful</h1>
          <p className="text-muted-foreground">
            Thank you — your purchase is confirmed.
          </p>
          {buildId && (
            <p className="text-xs font-mono text-muted-foreground break-all">
              Build ID: {buildId}
            </p>
          )}
          {sessionId && (
            <p className="text-[11px] font-mono text-muted-foreground break-all">
              Session: {sessionId}
            </p>
          )}
          <p className="text-sm text-muted-foreground pt-2">
            Delivery details will follow shortly.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            {isOwner && (
              <Button variant="outline" onClick={() => navigate('/owner/builds')}>
                View Builds
              </Button>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
