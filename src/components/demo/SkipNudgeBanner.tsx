import { useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { useState } from 'react';

// Persistent nudge shown on Pricing/Checkout/etc. when user skipped before completing the demo.
export function SkipNudgeBanner() {
  const navigate = useNavigate();
  const { progress } = useDemoProgress();
  const [dismissed, setDismissed] = useState(false);

  if (!progress) return null;
  if (dismissed) return null;
  if (progress.demo_state !== 'skipped' || !progress.incomplete) return null;

  return (
    <div className="mx-auto mb-4 flex max-w-3xl items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
      <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
      <p className="flex-1">
        You skipped the demo — see what fits in 60 seconds before you commit.
      </p>
      <Button size="sm" onClick={() => navigate('/demo')}>Resume demo</Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDismissed(true)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
