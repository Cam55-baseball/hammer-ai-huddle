import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { ExitInterceptDialog } from '@/components/demo/ExitInterceptDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Clock, Check } from 'lucide-react';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { conversionCopy } from '@/demo/prescriptions/conversionCopy';
import { logDemoEvent } from '@/demo/guard';
import { useDemoUrgency, formatMmSs } from '@/hooks/useDemoUrgency';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const SIM_BY_SLUG: Record<string, string> = {
  'hitting-analysis': 'hitting',
  'iron-bambino': 'program',
  'vault': 'vault',
};

const SIM_LABEL: Record<string, string> = {
  hitting: 'hitting',
  program: 'training program',
  vault: 'performance history',
};

const VALUE_STACK = [
  'Full personalized system (based on your result)',
  'Complete drill library (not just previews)',
  'Progress tracking + performance history',
  'Adaptive programming (updates as you improve)',
];

export default function DemoUpgrade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const from = params.get('from') ?? '';
  const reason = (params.get('reason') as 'minor' | 'moderate' | 'critical') || 'moderate';
  const gap = params.get('gap') ?? '';
  const pctParam = parseInt(params.get('pct') ?? '0', 10) || 0;
  const simId = params.get('sim') ?? SIM_BY_SLUG[from] ?? 'hitting';
  const yourValue = params.get('your') ?? '';
  const eliteValue = params.get('elite') ?? '';
  const projected = params.get('projected') ?? '';
  const { complete, logEvent } = useDemoProgress();
  const { remainingMs, expired } = useDemoUrgency(from || 'demo', simId);

  const [exitOpen, setExitOpen] = useState(false);
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    void logEvent('unlock_click', from, { reason, gap, pct: pctParam, simId });
    logDemoEvent('upgrade_started', { from, reason, gap, pct: pctParam, simId });
  }, [from, reason, gap, pctParam, simId, logEvent]);

  // Exit intercept on browser back navigation
  useEffect(() => {
    window.history.pushState({ demoUpgrade: true }, '');
    const onPop = () => {
      if (allowLeaveRef.current) return;
      window.history.pushState({ demoUpgrade: true }, '');
      setExitOpen(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const copy = conversionCopy(simId, reason, gap, { pct: pctParam });
  const simLabel = SIM_LABEL[simId] ?? 'performance';

  const handleContinue = async () => {
    if (expired) {
      navigate(`/demo/${from}`);
      return;
    }
    logDemoEvent('upgrade_completed', { from, reason, gap, pct: pctParam, simId });
    await complete();
    // 1-click continuation: skip /select-modules, go straight to checkout w/ context
    const qp = new URLSearchParams({
      prefill: simId,
      reason,
      gap: String(gap),
      pct: String(pctParam),
      from,
    });
    allowLeaveRef.current = true;
    navigate(`/checkout?${qp.toString()}`);
  };

  const handleSaveLead = async (email: string) => {
    try {
      await supabase.from('demo_leads').insert({
        user_id: user?.id ?? null,
        email,
        sim_id: simId,
        severity: reason,
        gap: String(gap),
        pct: pctParam,
        from_slug: from,
      });
      logDemoEvent('lead_captured', { simId, gap });
      toast({ title: 'Plan saved', description: 'We\'ll email it shortly.' });
      setExitOpen(false);
    } catch (e) {
      toast({ title: 'Could not save', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleLeave = () => {
    allowLeaveRef.current = true;
    setExitOpen(false);
    navigate('/demo');
  };

  const handleKeepExploring = (e: React.MouseEvent) => {
    e.preventDefault();
    setExitOpen(true);
  };

  const showRecap = yourValue || eliteValue || gap || projected;
  const ctaLabel = expired ? 'Re-run your analysis to unlock your system' : copy.cta;

  return (
    <DemoLayout showBack>
      {/* Urgency banner */}
      <div className={`mb-3 flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold ${expired ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-primary/40 bg-primary/10 text-primary'}`}>
        <Clock className="h-3.5 w-3.5" />
        {expired
          ? <span>Analysis expired — re-run to restore</span>
          : <span>Your analysis is saved for the next {formatMmSs(remainingMs)}</span>}
      </div>

      <Card className="border-primary/40 bg-gradient-to-b from-primary/15 to-transparent">
        <CardContent className="space-y-4 p-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            You just uncovered a {reason} gap in your {simLabel} performance
          </p>
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-xl font-black leading-tight">{copy.headline}</h2>
          <p className="text-sm text-muted-foreground">{copy.subhead}</p>

          {showRecap && (
            <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
              <RecapCell label="Your result" value={yourValue || '—'} />
              <RecapCell label="Elite" value={eliteValue || '—'} highlight />
              <RecapCell label="Gap" value={gap || '—'} accent />
              <RecapCell label="Projected" value={projected || '—'} />
            </div>
          )}

          {/* Value stack */}
          <div className="rounded-md border bg-muted/20 p-3 text-left">
            <p className="mb-2 text-xs font-black uppercase tracking-wide">You're unlocking:</p>
            <ul className="space-y-1.5">
              {VALUE_STACK.map(v => (
                <li key={v} className="flex items-start gap-2 text-xs">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t pt-2 text-[11px] italic text-muted-foreground">
              Most athletes spend $200–$500/month trying to fix this manually.
            </p>
          </div>

          <p className="text-[11px] italic text-muted-foreground">{copy.socialProof}</p>

          <div className="flex flex-col items-center gap-1 pt-2">
            <Button size="lg" onClick={handleContinue} className="w-full gap-2">
              <Sparkles className="h-4 w-4" /> {ctaLabel}
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-[11px] text-muted-foreground/80 hover:text-muted-foreground"
              onClick={handleKeepExploring}
            >
              Keep exploring demo
            </Button>
          </div>
        </CardContent>
      </Card>

      <ExitInterceptDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onSave={handleSaveLead}
        onLeave={handleLeave}
      />
    </DemoLayout>
  );
}

function RecapCell({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-2 text-center ${highlight ? 'border-primary/40 bg-primary/5' : accent ? 'border-destructive/40 bg-destructive/5' : 'bg-muted/30'}`}>
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}
