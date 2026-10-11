import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Check, X, Inbox, Star } from 'lucide-react';

type Req = {
  id: string; kind: string; incoming: boolean; can_answer: boolean; other_name: string;
  org_name: string | null; team_name: string | null; status: string; message: string | null; created_at: string;
};
type Coach = { coach_id: string; coach_name: string; via: string; is_head: boolean };

const KIND_LABEL: Record<string, string> = {
  coach_player: 'Coach connection',
  scout_player: 'Scout follow',
  org_coach: 'Join staff',
  org_player: 'Join team',
};

export function describeRequest(r: Pick<Req, 'kind' | 'incoming' | 'other_name' | 'org_name' | 'team_name'>): string {
  const where = r.team_name ? `${r.team_name}${r.org_name ? ` (${r.org_name})` : ''}` : r.org_name ?? '';
  if (r.kind === 'org_coach') return r.incoming ? `${r.other_name} — coach staff for ${where}` : `You asked to coach at ${where || r.other_name}`;
  if (r.kind === 'org_player') return r.incoming ? `${r.other_name} — player on ${where}` : `You asked to join ${where || r.other_name}`;
  if (r.kind === 'scout_player') return r.incoming ? `${r.other_name} wants to follow your profile` : `You asked to follow ${r.other_name}`;
  return r.incoming ? `${r.other_name} wants to connect as your coach` : `You asked to connect with ${r.other_name}`;
}

export default function Requests() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const reqs = useQuery({
    queryKey: ['my-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_requests');
      if (error) throw error;
      return (data ?? []) as Req[];
    },
  });

  const coaches = useQuery({
    queryKey: ['my-coaches', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_coaches', {});
      if (error) throw error;
      return (data ?? []) as Coach[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-requests'] });
    qc.invalidateQueries({ queryKey: ['my-coaches'] });
  };

  const answer = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_connection_request', { _id: id, _accept: accept });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.accept ? 'Accepted — access is on now' : 'Denied'); refresh(); },
    onError: (e: any) => toast.error(e.message ?? 'Could not answer'),
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_connection_request', { _id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Request cancelled'); refresh(); },
  });
  const setHead = useMutation({
    mutationFn: async (coachId: string | null) => {
      const { error } = await supabase.rpc('set_head_coach', { _athlete: user!.id, _coach: coachId as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Head coach updated'); refresh(); },
    onError: (e: any) => toast.error(e.message ?? 'Could not update'),
  });
  const endConn = useMutation({
    mutationFn: async (coachId: string) => {
      const { error } = await supabase.rpc('end_connection', { _other: coachId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Connection ended — their access is off now'); refresh(); },
  });

  const list = reqs.data ?? [];
  const waiting = list.filter((r) => r.status === 'pending' && r.incoming);
  const sent = list.filter((r) => r.status === 'pending' && !r.incoming);
  const past = list.filter((r) => r.status !== 'pending').slice(0, 10);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Inbox className="h-6 w-6 text-primary" /> Requests</h1>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Waiting for you ({waiting.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reqs.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : waiting.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests right now.</p>
            ) : waiting.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{KIND_LABEL[r.kind] ?? 'Request'}</p>
                <p className="font-medium">{describeRequest(r)}</p>
                {r.message && <p className="mt-1 text-sm text-muted-foreground">Note: “{r.message}”</p>}
                {r.can_answer ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => answer.mutate({ id: r.id, accept: true })} disabled={answer.isPending}><Check className="mr-1 h-4 w-4" /> Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => answer.mutate({ id: r.id, accept: false })} disabled={answer.isPending}><X className="mr-1 h-4 w-4" /> Deny</Button>
                  </div>
                ) : <p className="mt-2 text-sm text-muted-foreground">A parent answers this one.</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">My coaches</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(coaches.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No connected coaches yet.</p> : (coaches.data ?? []).map((c) => (
              <div key={c.coach_id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{c.coach_name}</p>
                  <p className="text-xs text-muted-foreground">Connected: {c.via}</p>
                  {c.is_head && <Badge className="mt-1"><Star className="mr-1 h-3 w-3" /> Head coach</Badge>}
                </div>
                <div className="flex flex-col gap-1">
                  {!c.is_head && <Button size="sm" variant="outline" onClick={() => setHead.mutate(c.coach_id)}>Make head coach</Button>}
                  {c.via === 'Direct' && <Button size="sm" variant="ghost" onClick={() => endConn.mutate(c.coach_id)}>End connection</Button>}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Your head coach gets your alerts first. It doesn't let them see anything more.</p>
          </CardContent>
        </Card>

        {sent.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Sent by you</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sent.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm">{describeRequest(r)}</p>
                  <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>Cancel</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {past.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent answers</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {past.map((r) => (
                <p key={r.id} className="text-sm text-muted-foreground">{describeRequest(r)} — <span className="font-medium">{r.status}</span></p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
