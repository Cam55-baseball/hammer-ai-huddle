import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Check, X, Users, Star, UserPlus, Ban, Link2Off, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCoachConnections, COACH_CONNECTIONS_KEY } from '@/hooks/useCoachConnections';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  // Old links land on the matching section: /my-followers → Followers, /requests → Requests.
  const defaultTab = location.pathname === '/my-followers' ? 'followers' : 'requests';
  const tab = params.get('tab') ?? defaultTab;
  const setTab = (v: string) => { const n = new URLSearchParams(params); n.set('tab', v); setParams(n, { replace: true }); };

  // Followers (the old My Followers module): scouts/coaches linked through follows.
  const followers = useCoachConnections();
  // Following: people this account follows (for scouts and coaches).
  const following = useQuery({
    queryKey: ['my-following', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scout_follows')
        .select('id, player_id, status, created_at')
        .eq('scout_id', user!.id)
        .in('status', ['accepted', 'pending'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((r: any) => r.player_id);
      if (ids.length === 0) return [] as { id: string; name: string; avatar: string | null; status: string }[];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
      const m = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((r: any) => ({
        id: r.id,
        name: (m.get(r.player_id) as any)?.full_name ?? 'Player',
        avatar: (m.get(r.player_id) as any)?.avatar_url ?? null,
        status: r.status as string,
      }));
    },
  });
  // A follow approved on the Requests tab must show up here right away.
  useEffect(() => {
    if (tab === 'followers') { followers.refetch(); following.refetch(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  const removeFollower = useMutation({
    mutationFn: async (followId: string) => {
      const { error } = await supabase.from('scout_follows').update({ status: 'rejected' }).eq('id', followId).eq('player_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Removed — their access is off now'); qc.invalidateQueries({ queryKey: [COACH_CONNECTIONS_KEY] }); },
    onError: () => toast.error('Could not remove'),
  });

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

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests">Requests{waiting.length > 0 ? ` (${waiting.length})` : ''}</TabsTrigger>
            <TabsTrigger value="connections">Coaches</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
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

          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-4">

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
          </TabsContent>

          <TabsContent value="followers" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Followers ({(followers.data ?? []).filter((f) => f.status === 'accepted').length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {followers.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
                  (followers.data ?? []).filter((f) => f.status === 'accepted').length === 0 ? (
                  <p className="text-sm text-muted-foreground">No followers yet.</p>
                ) : (followers.data ?? []).filter((f) => f.status === 'accepted').map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={f.coach_name} url={f.coach_avatar} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{f.coach_name}</p>
                        <p className="text-xs text-muted-foreground">{f.relationship_type === 'linked' ? 'Linked coach' : 'Follower'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" onClick={() => removeFollower.mutate(f.id)} disabled={removeFollower.isPending}>
                        <Link2Off className="mr-1 h-3.5 w-3.5" /> Remove
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setBlockTarget({ id: f.coach_id, name: f.coach_name })}>
                        <Ban className="mr-1 h-3.5 w-3.5" /> Block
                      </Button>
                    </div>
                  </div>
                ))}
                {(followers.data ?? []).filter((f) => f.status === 'pending' && f.initiated_by === 'player').map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Avatar name={f.coach_name} url={f.coach_avatar} />
                    <p className="flex-1 truncate text-sm">{f.coach_name}</p>
                    <Badge variant="outline">Waiting for answer</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {(following.data ?? []).length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Following ({following.data!.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {following.data!.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar name={f.name} url={f.avatar} />
                      <p className="flex-1 truncate font-medium">{f.name}</p>
                      <Badge variant={f.status === 'accepted' ? 'secondary' : 'outline'}>{f.status === 'accepted' ? 'Following' : 'Waiting for answer'}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate('/relationships/settings')}>
              <Settings className="mr-1 h-4 w-4" /> Manage who has access
            </Button>
          </TabsContent>
        </Tabs>

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
