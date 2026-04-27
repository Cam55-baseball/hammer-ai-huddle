/**
 * PHASE 12 — Post-payment confirmation with type-specific delivery message.
 * Fetches the recorded purchase via get-build-purchase (RLS-protected) and
 * renders a tailored next-step message. Phase 13 will add real unlock/grant.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { supabase } from '@/integrations/supabase/client';

type Purchase = {
  build_id: string;
  build_type: 'program' | 'bundle' | 'consultation' | string;
  build_name: string | null;
  buyer_email: string;
  amount_cents: number | null;
  currency: string | null;
  created_at: string;
};

type Status = 'loading' | 'ready' | 'pending' | 'error';

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const deliveryMessage = (type: string) => {
  if (type === 'consultation') return 'We will contact you shortly to schedule your consultation.';
  if (type === 'program' || type === 'bundle') return 'Access will be granted shortly.';
  return 'Your purchase is being processed.';
};

export default function Success() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isOwner } = useOwnerAccess();

  const sessionId = params.get('session_id') ?? '';
  const buildIdParam = params.get('build') ?? '';

  const [status, setStatus] = useState<Status>(sessionId ? 'loading' : 'ready');
  const [purchase, setPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-build-purchase', {
          body: { session_id: sessionId },
        });
        if (cancelled) return;
        if (error) {
          setStatus('error');
          return;
        }
        if (data?.purchase) {
          setPurchase(data.purchase as Purchase);
          setStatus('ready');
        } else {
          setStatus('pending');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const renderBody = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Confirming your purchase…</p>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <p className="text-sm text-muted-foreground">
          Your payment was received. Confirmation is still processing — refresh in a moment.
        </p>
      );
    }

    if (status === 'error') {
      return (
        <p className="text-sm text-destructive">
          We couldn’t load your purchase details. Your payment is safe — please refresh.
        </p>
      );
    }

    // ready
    if (purchase) {
      const label = purchase.build_name?.trim() || `${titleCase(purchase.build_type)} Build`;
      return (
        <div className="space-y-3">
          <p className="text-base">
            You purchased: <span className="font-semibold">{label}</span>
          </p>
          <p className="text-sm text-muted-foreground">{deliveryMessage(purchase.build_type)}</p>
          <p className="text-xs text-muted-foreground">
            Receipt sent to <span className="font-mono">{purchase.buyer_email}</span>
          </p>
        </div>
      );
    }

    return (
      <p className="text-muted-foreground">Thank you — your purchase is confirmed.</p>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-8">
        <Card className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-14 w-14 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Payment Successful</h1>
          {renderBody()}
          {buildIdParam && (
            <p className="text-[11px] font-mono text-muted-foreground break-all pt-2">
              Build ID: {buildIdParam}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {purchase && (
              <Button
                onClick={() => {
                  const t = purchase.build_type;
                  const path =
                    t === 'program' ? `/program/${purchase.build_id}` :
                    t === 'bundle' ? `/bundle/${purchase.build_id}` :
                    t === 'consultation' ? `/consultation/${purchase.build_id}` :
                    '/dashboard';
                  navigate(path);
                }}
              >
                Access Your Purchase
              </Button>
            )}
            <Button variant={purchase ? 'outline' : 'default'} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
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
