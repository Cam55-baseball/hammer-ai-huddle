import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Clock, CheckCircle, XCircle, Link2Off, Crown } from 'lucide-react';
import { CoachSearchConnect } from './CoachSearchConnect';
import { FolderPermissionMatrix } from './FolderPermissionMatrix';

interface CoachConnection {
  id: string;
  coach_id: string;
  coach_name: string;
  coach_avatar: string | null;
  status: string;
  initiated_by: string;
  relationship_type: string;
  confirmed_at: string | null;
  created_at: string;
}

export function ConnectionsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSearch, setShowSearch] = useState(false);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['coach-connections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-coach-connections');
      if (error) throw error;
      return (data?.results ?? []) as CoachConnection[];
    },
    enabled: !!user,
  });

  const { data: headCoachId } = useQuery({
    queryKey: ['head-coach', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_mpi_settings')
        .select('primary_coach_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.primary_coach_id ?? null;
    },
    enabled: !!user,
  });

  const setHeadCoachMutation = useMutation({
    mutationFn: async (coachId: string | null) => {
      const { error } = await supabase
        .from('athlete_mpi_settings')
        .upsert(
          { user_id: user!.id, primary_coach_id: coachId, sport: 'baseball' },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_, coachId) => {
      queryClient.invalidateQueries({ queryKey: ['head-coach'] });
      queryClient.invalidateQueries({ queryKey: ['coach-connections'] });
      queryClient.invalidateQueries({ queryKey: ['athlete-mpi-settings'] });
      queryClient.invalidateQueries({ queryKey: ['folder-permission-matrix'] });
      toast({ title: coachId ? 'Head Coach updated' : 'Head Coach removed' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update Head Coach', variant: 'destructive' });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ connectionId, accept }: { connectionId: string; accept: boolean }) => {
      const updatePayload: Record<string, unknown> = {
        status: accept ? 'accepted' : 'rejected',
        confirmed_at: accept ? new Date().toISOString() : null,
      };
      if (accept) {
        updatePayload.relationship_type = 'linked';
      }
      const { error } = await supabase
        .from('scout_follows')
        .update(updatePayload)
        .eq('id', connectionId)
        .eq('player_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coach-connections'] });
      toast({ title: vars.accept ? 'Coach linked!' : 'Request declined' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to respond to request', variant: 'destructive' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('scout_follows')
        .update({ status: 'revoked' })
        .eq('id', connectionId)
        .eq('player_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-connections'] });
      toast({ title: 'Coach connection revoked' });
    },
  });

  const activeCoaches = connections.filter(c => c.status === 'accepted');
  const pendingIncoming = connections.filter(c => c.status === 'pending' && c.initiated_by === 'coach');
  const pendingOutgoing = connections.filter(c => c.status === 'pending' && c.initiated_by === 'player');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading connections...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Connections
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowSearch(!showSearch)}>
          <UserPlus className="h-4 w-4 mr-1" />
          Find Coach
        </Button>
      </div>

      {showSearch && (
        <CoachSearchConnect onRequestSent={() => {
          queryClient.invalidateQueries({ queryKey: ['coach-connections'] });
          setShowSearch(false);
        }} />
      )}

      {/* Pending incoming */}
      {pendingIncoming.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Requests ({pendingIncoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingIncoming.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{c.coach_name}</p>
                  <p className="text-xs text-muted-foreground">Wants to {c.relationship_type === 'linked' ? 'link' : 'follow'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondMutation.mutate({ connectionId: c.id, accept: true })}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respondMutation.mutate({ connectionId: c.id, accept: false })}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending outgoing */}
      {pendingOutgoing.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Sent Requests ({pendingOutgoing.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingOutgoing.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{c.coach_name}</p>
                  <Badge variant="outline" className="text-xs">Pending</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active coaches */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            My Coaches ({activeCoaches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeCoaches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No linked coaches yet. Use "Find Coach" to connect.
            </p>
          ) : (
            <div className="space-y-2">
              {activeCoaches.map(c => {
                const isHeadCoach = c.coach_id === headCoachId;
                const isLinked = c.relationship_type === 'linked';
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {c.coach_avatar ? (
                        <img src={c.coach_avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          {c.coach_name}
                          {isHeadCoach && (
                            <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />
                              Head Coach
                            </Badge>
                          )}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {isLinked ? 'Linked' : 'Following'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isHeadCoach && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                          onClick={() => setHeadCoachMutation.mutate(c.coach_id)}
                          disabled={setHeadCoachMutation.isPending}
                        >
                          <Crown className="h-3.5 w-3.5 mr-1" /> Set Head Coach
                        </Button>
                      )}
                      {isHeadCoach && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setHeadCoachMutation.mutate(null)}
                          disabled={setHeadCoachMutation.isPending}
                        >
                          Remove
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => revokeMutation.mutate(c.id)}
                      >
                        <Link2Off className="h-3.5 w-3.5 mr-1" /> Revoke
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Folder Permissions Matrix */}
      {activeCoaches.length > 0 && <FolderPermissionMatrix />}
    </div>
  );
}
