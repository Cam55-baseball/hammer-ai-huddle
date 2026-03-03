import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Building2, Users, Shield, Calendar, LogOut, Trophy, Megaphone, Pin, TrendingUp, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useTeamStats } from '@/hooks/useTeamStats';

interface Props {
  organizationId: string;
  roleInOrg: string;
  orgName?: string;
}

export function PlayerOrganizationView({ organizationId, roleInOrg, orgName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const { data: teamStats } = useTeamStats(organizationId);

  // Org details
  const { data: org } = useQuery({
    queryKey: ['player-org-details', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, sport, org_type')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Teammates
  const { data: teammates } = useQuery({
    queryKey: ['player-teammates', organizationId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('user_id, role_in_org')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      if (!members?.length) return [];

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name, avatar_url, position')
        .in('id', userIds);

      return members.map(m => ({
        ...m,
        profile: profiles?.find(p => p.id === m.user_id),
      }));
    },
  });

  // My latest MPI score
  const { data: myScore } = useQuery({
    queryKey: ['player-my-score', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('mpi_scores')
        .select('integrity_score, calculation_date')
        .eq('user_id', user.id)
        .order('calculation_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // My last session
  const { data: myLastSession } = useQuery({
    queryKey: ['player-my-last-session', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('session_date, module')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['team-announcements', organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('team_announcements')
        .select('*')
        .eq('organization_id', organizationId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as { id: string; title: string; body: string; pinned: boolean; created_at: string }[];
    },
  });

  // Recent coach-led sessions
  const { data: coachSessions = [] } = useQuery({
    queryKey: ['player-coach-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, session_date, module, session_type')
        .eq('user_id', user.id)
        .not('coach_id', 'is', null)
        .order('session_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const teammatesExcludingSelf = teammates?.filter(t => t.user_id !== user?.id) ?? [];
  const totalMembers = teammates?.length ?? 0;

  const handleLeave = async () => {
    if (!user) return;
    setLeaving(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['player-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['player-teammates'] });
      toast.success('You have left the organization');
    } catch {
      toast.error('Failed to leave organization');
    } finally {
      setLeaving(false);
    }
  };

  const myIntegrity = myScore?.integrity_score != null ? Math.round(myScore.integrity_score) : null;
  const teamAvg = teamStats?.avgIntegrity ?? null;

  return (
    <div className="space-y-6">
      {/* Team Info Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-primary/10 p-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{org?.name ?? orgName}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {org?.sport && <span className="capitalize">{org.sport}</span>}
              {org?.org_type && <span>• {org.org_type}</span>}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {totalMembers} member{totalMembers !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Your Role</span>
            <p className="font-semibold capitalize text-sm">{roleInOrg}</p>
          </div>
        </CardContent>
      </Card>

      {/* Pinned / Recent Announcements */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" /> Team Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className={`rounded-lg border p-3 ${a.pinned ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {a.pinned && <Pin className="h-3 w-3 text-primary" />}
                  <p className="text-sm font-medium">{a.title}</p>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(a.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Your Status + Team Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Your Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Your Integrity
              </p>
              <p className="text-lg font-bold">
                {myIntegrity != null ? `${myIntegrity}%` : '—'}
              </p>
              {myScore?.calculation_date && (
                <p className="text-xs text-muted-foreground">
                  as of {format(new Date(myScore.calculation_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Team Average
              </p>
              <p className="text-lg font-bold">
                {teamAvg != null && teamAvg > 0 ? `${teamAvg}%` : '—'}
              </p>
              {myIntegrity != null && teamAvg != null && teamAvg > 0 && (
                <p className={`text-xs font-medium ${myIntegrity >= teamAvg ? 'text-green-600' : 'text-amber-600'}`}>
                  {myIntegrity >= teamAvg
                    ? `+${myIntegrity - teamAvg}% above avg`
                    : `${myIntegrity - teamAvg}% below avg`}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Last Session
              </p>
              {myLastSession ? (
                <>
                  <p className="text-lg font-bold">{myLastSession.module ?? 'Practice'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(myLastSession.session_date), 'MMM d, yyyy')}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold">—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coach-Led Sessions */}
      {coachSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Recent Coach-Led Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coachSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{s.module ?? 'Session'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.session_type?.replace('_', ' ')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(s.session_date), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teammates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Teammates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teammatesExcludingSelf.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other teammates yet.</p>
          ) : (
            <div className="space-y-3">
              {teammatesExcludingSelf.map(t => (
                <div key={t.user_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={t.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {(t.profile?.full_name ?? '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.profile?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t.profile?.position ?? t.role_in_org}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Organization */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10">
            <LogOut className="h-4 w-4 mr-2" /> Leave Organization
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {org?.name ?? orgName}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be removed from the roster and will need a new invite code to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaving ? 'Leaving...' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
