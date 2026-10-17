import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Check, X, Users, Star, UserPlus, Ban } from 'lucide-react';
import { useState } from 'react';
import { FollowRequestsPanel } from '@/components/FollowRequestsPanel';
import { CoachSearchConnect } from '@/components/connections/CoachSearchConnect';
import { FolderPermissionMatrix } from '@/components/connections/FolderPermissionMatrix';
import { BlockUserDialog } from '@/components/safety/BlockUserDialog';
import { describeRequest } from '@/pages/Requests';

type Req = {
  id: string; kind: string; incoming: boolean; can_answer: boolean; other_name: string;
  org_name: string | null; team_name: string | null; status: string; message: string | null; created_at: string;
  for_child?: boolean; child_name?: string | null;
};
type Coach = { coach_id: string; coach_name: string; via: string; is_head: boolean };

const KIND_LABEL: Record<string, string> = {
  coach_player: 'Coach connection',
  scout_player: 'Scout follow',
  org_coach: 'Join staff',
  org_player: 'Join team',
};

/** Small round profile photo, falling back to initials. */
function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (url) {
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {initials}
    </div>
  );
}

export default function MyConnections() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showSearch, setShowSearch] = useState(false);
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);

  const reqs = useQuery({
    queryKey: ['my-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('list_my_requests_v2');
      if (error) throw error;
      return (data ?? []) as Req[];
    },
  });

  // Avatars for the people on the request rows (the request list itself
  // returns names only, so photos come from profiles by request id).
  const avatars = useQuery({
    queryKey: ['my-request-avatars', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('connection_requests')
        .select('id, from_user, to_user')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const ids = new Set<string>();
      (rows ?? []).forEach((r: any) => {
        if (r.from_user !== user!.id) ids.add(r.from_user);
        if (r.to_user !== user!.id) ids.add(r.to_user);
      });
      if (ids.size === 0) return {} as Record<string, string | null>;
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', Array.from(ids));
      const byUser = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.avatar_url]));
      const byReq: Record<string, string | null> = {};
      (rows ?? []).forEach((r: any) => {
        const other = r.from_user === user!.id ? r.to_user : r.from_user;
        byReq[r.id] = byUser[other] ?? null;
      });
      return byReq;
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

  const coachAvatars = useQuery({
    queryKey: ['my-coach-avatars', user?.id],
    enabled: !!user && (coaches.data ?? []).length > 0,
    queryFn: async () => {
      const ids = (coaches.data ?? []).map((c) => c.coach_id);
      const { data } = await supabase.from('profiles').select('id, avatar_url').in('id', ids);
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p.avatar_url])) as Record<string, string | null>;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-requests'] });
    qc.invalidateQueries({ queryKey: ['my-coaches'] });
    qc.invalidateQueries({ queryKey: ['my-request-avatars'] });
    qc.invalidateQueries({ queryKey: ['coach-connections'] });
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
  const sent = list.filter((r) => r.status === 'pending' && !r.incoming && !r.for_child);
  const aboutChild = list.filter((r) => r.status === 'pending' && !r.incoming && r.for_child);
  const past = list.filter((r) => r.status !== 'pending').slice(0, 10);
  const coachList = coaches.data ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6 text-primary" /> My Connections
          </h1>
          <Button size="sm" variant="outline" onClick={() => setShowSearch(!showSearch)}>
            <UserPlus className="mr-1 h-4 w-4" /> Find Coach
          </Button>
        </div>

        {showSearch && (
          <CoachSearchConnect onRequestSent={() => { refresh(); setShowSearch(false); }} />
        )}

        {/* Scout follow requests (the old followers-module inbox) */}
        <FollowRequestsPanel />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Waiting for you ({waiting.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reqs.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : waiting.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests right now.</p>
            ) : waiting.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Avatar name={r.other_name} url={avatars.data?.[r.id]} />
                <div className="min-w-0 flex-1">
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
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">My coaches</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {coachList.length === 0 ? <p className="text-sm text-muted-foreground">No connected coaches yet.</p> : coachList.map((c) => (
              <div key={c.coach_id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={c.coach_name} url={coachAvatars.data?.[c.coach_id]} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.coach_name}</p>
                    <p className="text-xs text-muted-foreground">Connected: {c.via}</p>
                    {c.is_head && <Badge className="mt-1"><Star className="mr-1 h-3 w-3" /> Head coach</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {!c.is_head && <Button size="sm" variant="outline" onClick={() => setHead.mutate(c.coach_id)}>Make head coach</Button>}
                  {c.via === 'Direct' && <Button size="sm" variant="ghost" onClick={() => endConn.mutate(c.coach_id)}>End connection</Button>}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setBlockTarget({ id: c.coach_id, name: c.coach_name })}
                  >
                    <Ban className="mr-1 h-3.5 w-3.5" /> Block
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Your head coach gets your alerts first. It doesn't let them see anything more.</p>
          </CardContent>
        </Card>

        {/* What each coach can see (from the old followers module) */}
        {coachList.length > 0 && <FolderPermissionMatrix />}

        {aboutChild.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Notices about your athlete</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {aboutChild.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{KIND_LABEL[r.kind] ?? 'Request'} · waiting for your athlete's answer</p>
                  <p>{describeRequest(r)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {sent.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Sent by you</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.other_name} url={avatars.data?.[r.id]} />
                    <p className="truncate text-sm">{describeRequest(r)}</p>
                  </div>
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

        {blockTarget && (
          <BlockUserDialog
            open={!!blockTarget}
            onOpenChange={(open) => !open && setBlockTarget(null)}
            blockedUserId={blockTarget.id}
            displayName={blockTarget.name}
            onBlocked={() => { setBlockTarget(null); refresh(); }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
