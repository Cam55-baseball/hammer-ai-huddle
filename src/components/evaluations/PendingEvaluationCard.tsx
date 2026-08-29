import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertCircle, CalendarDays, Check, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useConfirmAttendance,
  useRejectAttendance,
  type PendingEvaluation,
} from '@/hooks/useEvaluations';

/**
 * Pending confirmation prompt. Shows ONLY event context and evaluator identity —
 * grades and notes are withheld by RLS until the athlete confirms attendance.
 */
export function PendingEvaluationCard({ pending }: { pending: PendingEvaluation }) {
  const confirm = useConfirmAttendance();
  const { toast } = useToast();

  const credentials = [
    pending.evaluator_role
      ? pending.evaluator_role.charAt(0).toUpperCase() + pending.evaluator_role.slice(1)
      : null,
    pending.evaluator_organization,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleConfirm = async () => {
    try {
      const ok = await confirm.mutateAsync(pending.id);
      toast({
        title: ok ? 'Attendance confirmed' : 'Already confirmed',
        description: ok
          ? 'The report is now visible to you and to the coaches and scouts following you.'
          : 'This evaluation was already confirmed.',
      });
    } catch (err) {
      toast({
        title: 'Could not confirm',
        description: (err as Error)?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-amber-500/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Confirm you were at this evaluation
        </CardTitle>
        <CardDescription>
          The grades and write-up stay hidden — from you and from anyone following you — until you
          confirm you attended.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(pending.graded_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {pending.evaluation_context && (
            <p className="text-muted-foreground">{pending.evaluation_context}</p>
          )}
          {pending.event_description && (
            <p className="text-muted-foreground">{pending.event_description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{pending.evaluator_name}</span>
          {pending.evaluator_role && (
            <Badge variant="secondary" className="capitalize">{pending.evaluator_role}</Badge>
          )}
          {credentials.includes('·') || pending.evaluator_organization ? (
            <Badge variant="outline">{pending.evaluator_organization}</Badge>
          ) : null}
          <Badge variant="outline">
            {pending.grade_type === 'pitching' ? 'Pitching report' : 'Position player report'}
          </Badge>
        </div>

        <Button onClick={handleConfirm} disabled={confirm.isPending} className="w-full sm:w-auto">
          {confirm.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Yes, I was there — release this report
        </Button>
      </CardContent>
    </Card>
  );
}
