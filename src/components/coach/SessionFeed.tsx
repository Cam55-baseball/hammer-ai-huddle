import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionDetailView } from './SessionDetailView';
import { Activity, Filter, ChevronRight, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface SessionSummary {
  id: string;
  user_id: string;
  coach_id: string | null;
  player_name: string;
  module: string;
  session_type: string;
  session_date: string;
  season_context: string;
  coach_override_applied: boolean;
  drill_blocks: any;
  fatigue_state_at_session: any;
  micro_layer_data: any;
  created_at: string;
}

interface SessionFeedProps {
  linkedPlayerIds: string[];
  playerNames: Record<string, string>;
}

export function SessionFeed({ linkedPlayerIds, playerNames }: SessionFeedProps) {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['coach-session-feed', linkedPlayerIds, playerFilter, moduleFilter, roleFilter],
    queryFn: async () => {
      if (linkedPlayerIds.length === 0) return [];

      const targetIds = playerFilter === 'all' ? linkedPlayerIds : [playerFilter];

      let query = supabase
        .from('performance_sessions')
        .select('id, user_id, coach_id, module, session_type, session_date, season_context, coach_override_applied, drill_blocks, fatigue_state_at_session, micro_layer_data, created_at')
        .in('user_id', targetIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (moduleFilter !== 'all') {
        query = query.eq('module', moduleFilter);
      }

      if (roleFilter === 'my_sessions') {
        query = query.eq('coach_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(s => ({
        ...s,
        player_name: playerNames[s.user_id] ?? 'Unknown',
      })) as SessionSummary[];

      // Sort coach-tagged sessions first when viewing all
      if (roleFilter === 'all') {
        mapped.sort((a, b) => {
          const aTagged = a.coach_id === user?.id ? 0 : 1;
          const bTagged = b.coach_id === user?.id ? 0 : 1;
          if (aTagged !== bTagged) return aTagged - bTagged;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      return mapped;
    },
    enabled: linkedPlayerIds.length > 0,
  });

  if (selectedSession) {
    return (
      <SessionDetailView
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Session Feed
        </CardTitle>
        <div className="flex gap-2 flex-wrap mt-2">
          <Select value={playerFilter} onValueChange={setPlayerFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All players" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              {linkedPlayerIds.map(id => (
                <SelectItem key={id} value={id}>{playerNames[id] ?? id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {['hitting', 'pitching', 'fielding', 'catching', 'baserunning'].map(m => (
                <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="my_sessions">My Sessions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No sessions found for your linked players.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const fatigue = s.fatigue_state_at_session as any;
              const repSource = fatigue?.rep_source;
              const distance = fatigue?.pitch_distance_ft;
              const repCount = Array.isArray(s.micro_layer_data) ? s.micro_layer_data.length : 0;

              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`w-full text-left p-3 border rounded-lg hover:bg-accent/50 transition-colors flex items-center justify-between ${s.coach_id === user?.id ? 'border-l-2 border-l-primary' : ''}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{s.player_name}</span>
                      <Badge variant="outline" className="text-[10px]">{s.module}</Badge>
                      {s.coach_id === user?.id && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                          Coach-Led
                        </Badge>
                      )}
                      {s.coach_override_applied && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(s.session_date), 'MMM d, yyyy')}</span>
                      {repSource && <span>• {repSource}</span>}
                      {distance && <span>• {distance}ft</span>}
                      {repCount > 0 && <span>• {repCount} reps</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
