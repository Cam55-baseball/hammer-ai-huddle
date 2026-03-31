import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell } from 'lucide-react';
import { DEFAULT_PRESCRIPTIONS } from '@/data/udlDefaults';

interface Override {
  constraint_key: string;
  prescription_overrides: any;
}

interface Props {
  overrides: Override[];
}

export function PrescriptionEditor({ overrides }: Props) {
  const getOverride = (key: string) => overrides.find((o) => o.constraint_key === key);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Drill Prescriptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DEFAULT_PRESCRIPTIONS.map((mapping) => {
          const override = getOverride(mapping.constraint_key);
          const drills = override?.prescription_overrides?.drills ?? mapping.drills;

          return (
            <div key={mapping.constraint_key} className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium capitalize">
                {mapping.constraint_key.replace(/_/g, ' ')}
              </p>
              {drills.map((d: any) => (
                <div
                  key={d.drill_key}
                  className="flex items-start gap-2 text-xs bg-muted/30 rounded px-2 py-1.5"
                >
                  <Dumbbell className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{d.drill_name}</p>
                    <p className="text-muted-foreground">{d.reps} · {d.goal_metric}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    Lvl {d.difficulty_level}
                  </Badge>
                </div>
              ))}
              {override && (
                <Badge variant="secondary" className="text-[10px]">Custom Override</Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
