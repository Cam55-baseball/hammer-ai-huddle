import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Building2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSentActivities } from '@/hooks/useSentActivities';

export type CoachPendingRequest = { id: string; kind: string; incoming: boolean; can_answer: boolean; other_name: string; status: string; team_name: string | null };

/** Owner Nov 4 r2 #2: coaches see "My players" (with pending player requests inline) and "My organization". */
export function coachPendingPlayerRequests<T extends CoachPendingRequest>(list: T[]): T[] {
  return list.filter(r => r.status === 'pending' && r.incoming && (r.kind === 'coach_player' || r.kind === 'org_player'));
}

export function CoachConnectionsView({ requests, onAnswer, answering }: {
  requests: CoachPendingRequest[]; onAnswer: (id: string, accept: boolean) => void; answering: boolean;
}) {
  const { user } = useAuth();
  const { followedPlayers, loadingPlayers, fetchFollowedPlayers } = useSentActivities();
  useEffect(() => { void fetchFollowedPlayers(); }, [fetchFollowedPlayers]);
  const orgs = useQuery({
    queryKey: ['coach-my-orgs', user?.id], enabled: !!user,
    queryFn: async () => {
      const m = await supabase.from('organization_members').select('organization_id, role_in_org').eq('user_id', user!.id).eq('status', 'active');
      if (m.error) throw m.error;
      const ids = [...new Set((m.data ?? []).map((r: any) => r.organization_id as string))];
      if (!ids.length) return [] as { id: string; name: string; role: string }[];
      const o = await supabase.from('organizations').select('id, name').in('id', ids);
      if (o.error) throw o.error;
      return (o.data ?? []).map((org: any) => ({ id: org.id, name: org.name ?? 'Organization', role: (m.data ?? []).find((r: any) => r.organization_id === org.id)?.role_in_org ?? 'coach' }));
    },
  });
  const pending = coachPendingPlayerRequests(requests);
  return <div className="space-y-4">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" />My players</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {pending.map(r => <div key={r.id} className="flex items-center gap-2 rounded-md border border-border p-2">
          <div className="min-w-0 flex-1"><p className="text-sm font-medium break-words">{r.other_name}</p><p className="text-xs text-muted-foreground">Wants to connect{r.team_name ? ` · ${r.team_name}` : ''}</p></div>
          <Badge variant="secondary">Waiting</Badge>
          {r.can_answer && <>
            <Button size="sm" disabled={answering} onClick={() => onAnswer(r.id, true)}><Check className="mr-1 h-4 w-4" />Accept</Button>
            <Button size="sm" variant="outline" disabled={answering} onClick={() => onAnswer(r.id, false)}><X className="mr-1 h-4 w-4" />Deny</Button>
          </>}
        </div>)}
        {loadingPlayers ? <p role="status" className="text-sm text-muted-foreground">Loading players…</p>
          : followedPlayers.length === 0 && pending.length === 0 ? <p className="text-sm text-muted-foreground">No connected players yet.</p>
          : followedPlayers.map(p => <div key={p.id} className="flex items-center gap-2 border-b border-border py-2 last:border-0"><span className="text-sm">{p.full_name ?? 'Player'}</span></div>)}
      </CardContent>
    </Card>
    {(orgs.data ?? []).length > 0 && <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-primary" />My organization</CardTitle></CardHeader>
      <CardContent className="space-y-2">{orgs.data!.map(o => <div key={o.id} className="flex items-center justify-between gap-2"><span className="text-sm font-medium break-words">{o.name}</span><Badge variant="outline" className="capitalize">{o.role}</Badge></div>)}</CardContent>
    </Card>}
  </div>;
}
