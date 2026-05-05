import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { conversionCopy } from '@/demo/prescriptions/conversionCopy';
import { logDemoEvent } from '@/demo/guard';

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

export default function DemoUpgrade() {
  const navigate = useNavigate();
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

  useEffect(() => {
    void logEvent('unlock_click', from, { reason, gap, pct: pctParam, simId });
    logDemoEvent('upgrade_started', { from, reason, gap, pct: pctParam, simId });
  }, [from, reason, gap, pctParam, simId, logEvent]);

  const copy = conversionCopy(simId, reason, gap, { pct: pctParam });
  const simLabel = SIM_LABEL[simId] ?? 'performance';

  const handleContinue = async () => {
    logDemoEvent('upgrade_completed', { from, reason, gap, pct: pctParam, simId });
    await complete();
    navigate(`/select-modules?context=${encodeURIComponent(from)}`, { replace: true });
  };

  const showRecap = yourValue || eliteValue || gap || projected;

  return (
    <DemoLayout showBack>
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

          <p className="text-[11px] italic text-muted-foreground">{copy.socialProof}</p>

          <div className="flex flex-col items-center gap-1 pt-2">
            <Button size="lg" onClick={handleContinue} className="w-full gap-2">
              <Sparkles className="h-4 w-4" /> {copy.cta}
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-[11px] text-muted-foreground/80 hover:text-muted-foreground"
              onClick={() => navigate('/demo')}
            >
              Keep exploring demo
            </Button>
          </div>
        </CardContent>
      </Card>
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
