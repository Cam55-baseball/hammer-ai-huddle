import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export function SmartWeekPlan() {
  const { snapshot } = useHIESnapshot();
  const [isOpen, setIsOpen] = useState(false);

  if (!snapshot || snapshot.smart_week_plan.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Smart Week Plan will appear after sufficient training data is collected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Smart Week Plan
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <p className="text-xs text-muted-foreground">Suggested Plan — Not Mandatory</p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-2">
            {snapshot.smart_week_plan.map((day: any, i: number) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3">
                <Badge variant="outline" className="shrink-0">{day.day ?? `Day ${i + 1}`}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{day.focus ?? 'General'}</div>
                  <p className="text-xs text-muted-foreground">{day.description ?? ''}</p>
                </div>
                {day.intensity && (
                  <Badge variant="secondary" className="text-xs shrink-0">{day.intensity}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
