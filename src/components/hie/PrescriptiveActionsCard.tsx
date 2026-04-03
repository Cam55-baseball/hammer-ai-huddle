import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Play } from 'lucide-react';

export function PrescriptiveActionsCard() {
  const { snapshot } = useHIESnapshot();
  const navigate = useNavigate();

  if (!snapshot || snapshot.prescriptive_actions.length === 0) return null;

  const handleStartDrill = (drill: any) => {
    // Navigate to practice hub with drill parameters
    const params = new URLSearchParams({
      drill_type: drill.drill_type || drill.name,
      module: drill.module,
      constraints: drill.constraints || '',
    });
    if (drill.module === 'tex-vision') {
      navigate(`/tex-vision?${params.toString()}`);
    } else {
      navigate(`/practice-hub?${params.toString()}`);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          What To Do Next
        </CardTitle>
        <p className="text-xs text-muted-foreground">Suggested — Not Mandatory</p>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => handleStartDrill(drill)}
                >
                  <Play className="h-3 w-3" />
                  Start
                </Button>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
