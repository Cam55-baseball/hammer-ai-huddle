import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDemoRegistry } from '@/hooks/useDemoRegistry';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { useDemoCompletion } from '@/hooks/useDemoCompletion';
import { DemoModeProvider } from '@/contexts/DemoModeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Suspense } from 'react';
import { demoComponents } from '@/components/demo/DemoComponentRegistry';

export default function StartHereRunner() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { recommendedSequence, allSubmodules, findBySlug, loading } = useDemoRegistry();
  const { progress, markViewed, startIfPending } = useDemoProgress();
  const { isComplete } = useDemoCompletion();

  // Build the sequence: prefer explicit recommended_order, fall back to first 4 submodules.
  const sequence = useMemo(() => {
    if (recommendedSequence.length > 0) return recommendedSequence;
    return allSubmodules.slice(0, 4);
  }, [recommendedSequence, allSubmodules]);

  const stepParam = parseInt(params.get('step') ?? '0', 10);
  const [step, setStep] = useState(Number.isFinite(stepParam) ? Math.max(0, stepParam) : 0);

  useEffect(() => { void startIfPending(); }, [startIfPending]);

  useEffect(() => {
    if (isComplete) navigate('/demo/upgrade?reason=complete', { replace: true });
  }, [isComplete, navigate]);

  if (loading || sequence.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">Loading guided tour…</div>;
  }

  const node = sequence[Math.min(step, sequence.length - 1)];
  const tierSlug = (() => {
    const cat = node?.parent_slug ? findBySlug(node.parent_slug) : null;
    return cat?.parent_slug ?? undefined;
  })();
  const Comp = node?.component_key ? demoComponents[node.component_key] : null;
  const pct = Math.round(((step + 1) / sequence.length) * 100);

  const goNext = async () => {
    if (node) await markViewed(node.slug, tierSlug);
    if (step + 1 < sequence.length) {
      const next = step + 1;
      setStep(next);
      setParams({ step: String(next) }, { replace: true });
    } else {
      navigate('/demo/upgrade?reason=complete');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Start Here</Badge>
          <div className="flex-1 px-2">
            <Progress value={pct} className="h-1.5" />
            <p className="mt-0.5 text-[10px] text-muted-foreground">Step {step + 1} of {sequence.length}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/demo')}>Just let me explore</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-black">{node.title}</h1>
          {node.tagline && <p className="text-sm text-muted-foreground">{node.tagline}</p>}
        </div>

        <DemoModeProvider value={{ isDemo: true, isPreview: true, tier: tierSlug, submodule: node.slug }}>
          <ErrorBoundary>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading preview…</p>}>
              {Comp ? <Comp /> : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Interactive preview coming soon for this feature.
                  </CardContent>
                </Card>
              )}
            </Suspense>
          </ErrorBoundary>
        </DemoModeProvider>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={step === 0} onClick={() => {
            const prev = Math.max(0, step - 1);
            setStep(prev);
            setParams({ step: String(prev) }, { replace: true });
          }}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={goNext}>
            {step + 1 < sequence.length ? 'Next' : 'See your tier'} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
