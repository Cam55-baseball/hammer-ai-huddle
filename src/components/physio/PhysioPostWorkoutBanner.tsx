import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhysioDailyReport } from '@/hooks/usePhysioDailyReport';

const colorMap = {
  green: {
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
  },
  yellow: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
    text: 'text-amber-400',
  },
  red: {
    bg: 'bg-red-500/10 border-red-500/30',
    dot: 'bg-red-500',
    text: 'text-red-400',
  },
};

const messageMap = {
  green: "Your body is well-regulated today. You're primed for quality work — stay focused and execute.",
  yellow: "Solid regulation with room to optimize. Warm up thoroughly and listen to your body during the session.",
  red: "Your body is asking for recovery. Consider reducing intensity today — consistency over the long run matters more.",
};

export function PhysioPostWorkoutBanner() {
  const { report, regulationColor } = usePhysioDailyReport();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('physio-banner-dismissed') === 'true';
  });

  if (!report || !regulationColor || dismissed) return null;

  const config = colorMap[regulationColor];
  const message = messageMap[regulationColor];

  const handleDismiss = () => {
    sessionStorage.setItem('physio-banner-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <Card className={cn('border', config.bg)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <div className={cn('w-2 h-2 rounded-full animate-pulse', config.dot)} />
            <Activity className={cn('h-4 w-4', config.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-semibold mb-0.5', config.text)}>
              Physio Report • {report.regulation_score}/100
            </p>
            <p className="text-xs text-foreground leading-relaxed">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
