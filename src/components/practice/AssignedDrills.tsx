import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ClipboardList, User } from 'lucide-react';
import { usePlayerAssignments, useCompleteAssignment } from '@/hooks/useDrillAssignments';
import { toast } from 'sonner';

export function AssignedDrills() {
  const { data: assignments, isLoading } = usePlayerAssignments();
  const completeMutation = useCompleteAssignment();

  const pending = assignments?.filter(a => !a.completed) ?? [];
  const completed = assignments?.filter(a => a.completed) ?? [];

  const handleComplete = (id: string) => {
    completeMutation.mutate(id, {
      onSuccess: () => toast.success('Drill marked as completed!'),
      onError: () => toast.error('Failed to update'),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground animate-pulse">
          Loading assignments...
        </CardContent>
      </Card>
    );
  }

  if (!assignments?.length) {
    return null; // Don't show section if no assignments
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-5 w-5 text-primary" />
          Coach-Assigned Drills
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 border rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{a.drill_name}</p>
                  {a.drill_description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.drill_description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <User className="h-2.5 w-2.5" />
                      {a.coach_name}
                    </Badge>
                    {a.notes && (
                      <span className="text-[11px] text-muted-foreground italic truncate max-w-[200px]">
                        "{a.notes}"
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 shrink-0"
                  onClick={() => handleComplete(a.id)}
                  disabled={completeMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Done
                </Button>
              </div>
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium mb-1">Completed</p>
            {completed.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm opacity-60">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="line-through">{a.drill_name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
