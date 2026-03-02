import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Link2, LinkIcon, Unlink, Eye, LayoutGrid, List, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RosterPlayer {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  mpiPosition: string | null;
  gradYear: number | null;
  linkStatus: 'linked' | 'follow' | 'none';
  lastSessionDate: string | null;
  lastSessionModule: string | null;
  integrityScore: number | null;
}

const POSITION_GROUPS: Record<string, string[]> = {
  Pitchers: ['P', 'SP', 'RP', 'CP', 'pitcher', 'Pitcher'],
  Catchers: ['C', 'catcher', 'Catcher'],
  Infielders: ['1B', '2B', '3B', 'SS', 'IF', 'infield', 'Infield'],
  Outfielders: ['LF', 'CF', 'RF', 'OF', 'outfield', 'Outfield'],
};

function getPositionGroup(pos: string | null): string {
  if (!pos) return 'Unassigned';
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if (positions.some(p => pos.toLowerCase().includes(p.toLowerCase()))) return group;
  }
  return 'Utility';
}

export function TeamRosterView({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [positionFilter, setPositionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['team-roster', orgId, user?.id],
    queryFn: async (): Promise<RosterPlayer[]> => {
      if (!user) return [];

      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('status', 'active');
      const memberIds = (members ?? []).map(m => m.user_id);
      if (memberIds.length === 0) return [];

      const [profilesRes, mpiRes, followsRes, sessionsRes, scoresRes] = await Promise.all([
        supabase.from('profiles_public').select('id, full_name, avatar_url, position').in('id', memberIds),
        supabase.from('athlete_mpi_settings').select('user_id, primary_position, graduation_year:date_of_birth').in('user_id', memberIds),
        supabase.from('scout_follows').select('player_id, status, relationship_type').eq('scout_id', user.id).in('player_id', memberIds),
        supabase.from('performance_sessions').select('user_id, session_date, module').in('user_id', memberIds).order('session_date', { ascending: false }),
        supabase.from('mpi_scores').select('user_id, integrity_score').in('user_id', memberIds).order('calculation_date', { ascending: false }),
      ]);

      const profiles = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
      const mpiSettings = new Map((mpiRes.data ?? []).map(m => [m.user_id, m]));
      const followMap = new Map((followsRes.data ?? []).map(f => [f.player_id, f]));

      // Latest session per user
      const lastSession = new Map<string, { date: string; module: string | null }>();
      for (const s of sessionsRes.data ?? []) {
        if (!lastSession.has(s.user_id)) {
          lastSession.set(s.user_id, { date: s.session_date, module: s.module });
        }
      }

      // Latest integrity per user
      const latestScore = new Map<string, number>();
      for (const s of scoresRes.data ?? []) {
        if (s.integrity_score != null && !latestScore.has(s.user_id)) {
          latestScore.set(s.user_id, s.integrity_score);
        }
      }

      return memberIds.map(uid => {
        const profile = profiles.get(uid);
        const mpi = mpiSettings.get(uid);
        const follow = followMap.get(uid);
        const session = lastSession.get(uid);
        const linkStatus: RosterPlayer['linkStatus'] =
          follow?.status === 'accepted' && follow.relationship_type === 'linked' ? 'linked'
          : follow?.status === 'accepted' ? 'follow'
          : 'none';

        return {
          userId: uid,
          fullName: profile?.full_name ?? 'Unknown',
          avatarUrl: profile?.avatar_url ?? null,
          position: profile?.position ?? null,
          mpiPosition: mpi?.primary_position ?? null,
          gradYear: null, // date_of_birth doesn't directly give grad year
          linkStatus,
          lastSessionDate: session?.date ?? null,
          lastSessionModule: session?.module ?? null,
          integrityScore: latestScore.get(uid) ?? null,
        };
      });
    },
    enabled: !!orgId && !!user,
  });

  const displayPosition = (p: RosterPlayer) => p.mpiPosition || p.position || 'N/A';

  const filtered = useMemo(() => {
    let result = roster;
    if (positionFilter !== 'all') {
      result = result.filter(p => getPositionGroup(displayPosition(p)) === positionFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.linkStatus === statusFilter);
    }
    return result;
  }, [roster, positionFilter, statusFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, RosterPlayer[]> = {};
    for (const p of filtered) {
      const group = getPositionGroup(displayPosition(p));
      if (!groups[group]) groups[group] = [];
      groups[group].push(p);
    }
    // Sort within groups by name
    for (const g of Object.values(groups)) {
      g.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }
    return groups;
  }, [filtered]);

  const linkBadge = (status: RosterPlayer['linkStatus']) => {
    switch (status) {
      case 'linked': return <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20"><Link2 className="h-3 w-3 mr-0.5" />Linked</Badge>;
      case 'follow': return <Badge className="text-[10px] bg-secondary text-secondary-foreground border-border"><LinkIcon className="h-3 w-3 mr-0.5" />Following</Badge>;
      default: return <Badge variant="outline" className="text-[10px] text-muted-foreground"><Unlink className="h-3 w-3 mr-0.5" />Not Connected</Badge>;
    }
  };

  if (isLoading) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">Loading roster...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Position" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            <SelectItem value="Pitchers">Pitchers</SelectItem>
            <SelectItem value="Catchers">Catchers</SelectItem>
            <SelectItem value="Infielders">Infielders</SelectItem>
            <SelectItem value="Outfielders">Outfielders</SelectItem>
            <SelectItem value="Utility">Utility</SelectItem>
            <SelectItem value="Unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="linked">Linked</SelectItem>
            <SelectItem value="follow">Following</SelectItem>
            <SelectItem value="none">Not Connected</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1">
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} player{filtered.length !== 1 ? 's' : ''}</p>

      {Object.entries(grouped).map(([group, players]) => (
        <div key={group} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4" /> {group} ({players.length})
          </h3>

          {viewMode === 'list' ? (
            <div className="space-y-1">
              {players.map(p => (
                <div key={p.userId} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{p.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{p.fullName}</span>
                      <Badge variant="outline" className="text-[10px]">{displayPosition(p)}</Badge>
                      {linkBadge(p.linkStatus)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {p.lastSessionDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(p.lastSessionDate), 'MMM d')} • {p.lastSessionModule ?? 'Session'}
                        </span>
                      )}
                      {p.integrityScore != null && <span>MPI: {p.integrityScore}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/player/${p.userId}`)}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {players.map(p => (
                <Card key={p.userId} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/player/${p.userId}`)}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">{p.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground">{displayPosition(p)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {linkBadge(p.linkStatus)}
                      {p.integrityScore != null && <Badge variant="secondary" className="text-[10px]">MPI: {p.integrityScore}</Badge>}
                    </div>
                    {p.lastSessionDate && (
                      <p className="text-xs text-muted-foreground">
                        Last: {format(new Date(p.lastSessionDate), 'MMM d')} • {p.lastSessionModule ?? 'Session'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No players match the current filters.</CardContent></Card>
      )}
    </div>
  );
}
