import { Suspense, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { DemoWatermark } from '@/components/demo/DemoWatermark';
import { useDemoRegistry } from '@/hooks/useDemoRegistry';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { DemoModeProvider } from '@/contexts/DemoModeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock } from 'lucide-react';
import { demoComponents } from '@/components/demo/DemoComponentRegistry';

function DemoComingSoon({ title }: { title: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">Loading interactive preview…</p>
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Full feature unlocks when you subscribe
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemoSubmodule() {
  const { tier = '', submodule = '' } = useParams();
  const navigate = useNavigate();
  const { findBySlug } = useDemoRegistry();
  const { markViewed } = useDemoProgress();
  const node = findBySlug(submodule);

  useEffect(() => {
    if (node) void markViewed(node.slug, tier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.slug]);

  if (!node) {
    return <DemoLayout showBack><p className="text-sm text-muted-foreground">Preview not found.</p></DemoLayout>;
  }

  const Comp = node.component_key ? demoComponents[node.component_key] : null;

  return (
    <DemoLayout showBack>
      <DemoModeProvider value={{ isDemo: true, isPreview: true, tier, submodule: node.slug }}>
        <div className="mb-4">
          <h1 className="text-xl font-black">{node.title}</h1>
          {node.tagline && <p className="text-sm text-muted-foreground">{node.tagline}</p>}
        </div>

        <ErrorBoundary>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading preview…</p>}>
            {Comp ? <Comp /> : <DemoComingSoon title={node.title} />}
          </Suspense>
        </ErrorBoundary>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => navigate('/demo')}>Back to Demo Home</Button>
          <Button onClick={() => navigate(`/demo/upgrade?from=${node.slug}`)} className="gap-2">
            <Sparkles className="h-4 w-4" /> Unlock
          </Button>
        </div>
      </DemoModeProvider>
      <DemoWatermark />
    </DemoLayout>
  );
}
