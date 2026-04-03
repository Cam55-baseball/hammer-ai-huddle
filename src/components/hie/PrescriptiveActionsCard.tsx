import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { Zap, ArrowRight } from 'lucide-react';

export function PrescriptiveActionsCard() {
  const { snapshot } = useHIESnapshot();

  if (!snapshot || snapshot.prescriptive_actions.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          What To Do Next
        </CardTitle>
        <p className="text-xs text-muted-foreground">Recommended Based on Your Data</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.prescriptive_actions.map((action, i) => (
          <div key={i} className="space-y-2">
            <div className="font-semibold text-sm text-primary">Fix: {action.weakness_area}</div>
            {action.drills.map((drill, j) => (
              <div key={j} className="flex items-start gap-3 bg-accent/30 rounded-lg p-3">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{drill.name}</div>
                  <p className="text-xs text-muted-foreground">{drill.description}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{drill.constraints}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{drill.module.replace('-', ' ')}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
