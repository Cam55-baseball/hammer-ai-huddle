import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { BroadcastRep } from '@/hooks/useLiveRepBroadcast';

interface PartnerRepsFeedProps {
  reps: BroadcastRep[];
}

export function PartnerRepsFeed({ reps }: PartnerRepsFeedProps) {
  if (reps.length === 0) {
    return (
      <Card className="border-dashed border-accent">
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <Users className="h-4 w-4 mx-auto mb-1 text-accent" />
          Waiting for partner reps…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          Partner Reps
          <Badge variant="secondary" className="ml-auto text-xs">{reps.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-48 overflow-y-auto">
        {reps.map((rep, i) => (
          <div key={i} className="flex items-center gap-2 text-xs rounded border border-accent/30 bg-accent/5 px-2.5 py-1.5">
            <span className="font-medium text-accent-foreground">#{rep.index + 1}</span>
            {rep.contact_quality && <Badge variant="outline" className="text-[10px]">{rep.contact_quality}</Badge>}
            {rep.pitch_result && <Badge variant="outline" className="text-[10px]">{rep.pitch_result}</Badge>}
            {rep.pitch_type && <span className="text-muted-foreground">{rep.pitch_type}</span>}
            {rep.exit_direction && <span className="text-muted-foreground">{rep.exit_direction}</span>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
