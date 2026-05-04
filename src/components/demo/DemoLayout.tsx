import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { useDemoCompletion } from '@/hooks/useDemoCompletion';
import { SkipDemoDialog } from './SkipDemoDialog';

export function DemoLayout({ children, showBack = false }: { children: ReactNode; showBack?: boolean }) {
  const navigate = useNavigate();
  const { skip } = useDemoProgress();
  const { pct, isComplete, missing } = useDemoCompletion();
  const [confirmSkip, setConfirmSkip] = useState(false);

  const handleSkip = async () => {
    await skip();
    setConfirmSkip(false);
    navigate('/select-modules', { replace: true });
  };

  const remaining = `${missing.tiers ? `${missing.tiers} tier${missing.tiers > 1 ? 's' : ''} · ` : ''}` +
    `${missing.categories ? `${missing.categories} category · ` : ''}` +
    `${missing.submodules ? `${missing.submodules} feature${missing.submodules > 1 ? 's' : ''}` : ''}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2">
          {showBack ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/demo')} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Demo Home
            </Button>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Demo Mode
            </Badge>
          )}
          <div className="flex-1 px-2">
            <Progress value={pct} className="h-1.5" />
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {isComplete ? 'Demo complete — pick your tier' : `${pct}% · ${remaining || 'almost there'}`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setConfirmSkip(true)} className="gap-1 text-muted-foreground">
            <X className="h-4 w-4" /> Skip
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-4">{children}</main>

      <SkipDemoDialog open={confirmSkip} onOpenChange={setConfirmSkip} onConfirm={handleSkip} />
    </div>
  );
}
