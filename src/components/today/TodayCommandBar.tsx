import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNextAction } from '@/hooks/useNextAction';
import { HammerStateBadge } from '@/components/hammer/HammerStateBadge';
import { ReadinessChip } from '@/components/hammer/ReadinessChip';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { QuickLogSheet } from '@/components/practice/QuickLogSheet';
import { EliteModePanel } from '@/components/hammer/EliteModePanel';

export function TodayCommandBar() {
  const navigate = useNavigate();
  const next = useNextAction();
  const [logOpen, setLogOpen] = useState(false);

  return (
    <>
      <EliteModePanel />
      <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <HammerStateBadge />
            <ReadinessChip />
            <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Next up</p>
              <button
                type="button"
                onClick={() => navigate(next.route)}
                className="text-sm font-semibold text-left hover:text-primary transition-colors"
              >
                {next.label}
              </button>
            </div>
            <div className="flex gap-1.5 ml-auto">
              <Button size="sm" variant="outline" onClick={() => navigate(next.route)} className="text-xs">
                {next.ctaLabel}
              </Button>
              <Button size="sm" onClick={() => setLogOpen(true)} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Log Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuickLogSheet open={logOpen} onOpenChange={setLogOpen} suggestedModule={next.moduleHint} />
    </>
  );
}
