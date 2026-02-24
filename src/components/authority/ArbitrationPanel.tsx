import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useGovernanceFlags } from '@/hooks/useGovernanceFlags';
import { GovernanceFlagCard } from './GovernanceFlagCard';
import { Scale, CheckCircle, XCircle, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ArbitrationPanelProps {
  sessionId?: string;
  playerGrade?: number;
  coachGrade?: number;
}

export function ArbitrationPanel({ sessionId, playerGrade, coachGrade }: ArbitrationPanelProps) {
  const { data: flags, resolveFlag } = useGovernanceFlags({ allUsers: true });
  const { toast } = useToast();
  const [notes, setNotes] = useState('');

  const sessionFlags = (flags ?? []).filter((f: any) => f.source_session_id === sessionId);
  const delta = playerGrade != null && coachGrade != null ? playerGrade - coachGrade : null;

  const handleResolve = async (flagId: string, action: string) => {
    try {
      await resolveFlag.mutateAsync({ flagId, action, notes: notes || undefined });
      toast({ title: 'Resolved', description: `Flag ${action}.` });
      setNotes('');
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve flag.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Arbitration Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {delta != null && (
          <div className="rounded-lg border p-3 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Player Grade</p>
              <p className="text-xl font-bold">{playerGrade}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delta</p>
              <p className={`text-xl font-bold ${delta > 10 ? 'text-red-600' : delta < -10 ? 'text-blue-600' : 'text-foreground'}`}>
                {delta > 0 ? '+' : ''}{delta}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Coach Grade</p>
              <p className="text-xl font-bold">{coachGrade}</p>
            </div>
          </div>
        )}

        {sessionFlags.length > 0 ? (
          <div className="space-y-2">
            {sessionFlags.map((f: any) => (
              <GovernanceFlagCard key={f.id} flag={f} onResolve={handleResolve} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No flags for this session.</p>
        )}

        <Textarea
          placeholder="Admin notes for resolution..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />
      </CardContent>
    </Card>
  );
}
