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
import { Building2, Users, Shield, Calendar, LogOut, Trophy } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  organizationId: string;
  roleInOrg: string;
  orgName?: string;
}

export function PlayerOrganizationView({ organizationId, roleInOrg, orgName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);

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

      {/* Your Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Your Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Integrity Score
              </p>
              <p className="text-lg font-bold">
                {myScore?.integrity_score != null ? `${Math.round(myScore.integrity_score)}%` : '—'}
              </p>
              {myScore?.calculation_date && (
                <p className="text-xs text-muted-foreground">
                  as of {format(new Date(myScore.calculation_date), 'MMM d, yyyy')}
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
