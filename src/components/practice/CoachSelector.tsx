import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { User, UserPlus, UserX, Crown } from 'lucide-react';

export interface CoachSelection {
  type: 'assigned' | 'external' | 'none';
  coach_id?: string;
  coach_name?: string;
  external_name?: string;
}

interface ConnectedCoach {
  id: string;
  full_name: string;
  is_head_coach: boolean;
}

interface CoachSelectorProps {
  value: CoachSelection;
  onChange: (selection: CoachSelection) => void;
}

export function CoachSelector({ value, onChange }: CoachSelectorProps) {
  const { user } = useAuth();

  const { data: mpiSettings } = useQuery({
    queryKey: ['mpi-settings-coach', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('athlete_mpi_settings')
        .select('primary_coach_id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: connectedCoaches = [] } = useQuery({
    queryKey: ['connected-coaches', user?.id, mpiSettings?.primary_coach_id],
    queryFn: async () => {
      if (!user) return [];
      const { data: follows } = await supabase
        .from('scout_follows')
        .select('scout_id')
        .eq('player_id', user.id)
        .eq('status', 'accepted')
        .eq('relationship_type', 'linked');
      if (!follows?.length) return [];
      const coachIds = follows.map(f => f.scout_id);
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', coachIds);
      if (!profiles) return [];
      const headCoachId = mpiSettings?.primary_coach_id;
      return profiles.map(p => ({
        id: p.id,
        full_name: p.full_name ?? 'Coach',
        is_head_coach: p.id === headCoachId,
      })).sort((a, b) => (b.is_head_coach ? 1 : 0) - (a.is_head_coach ? 1 : 0)) as ConnectedCoach[];
    },
    enabled: !!user,
  });

  const hasCoaches = connectedCoaches.length > 0;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Coach</label>

      {/* Connected coaches list */}
      {hasCoaches && (
        <ScrollArea className={connectedCoaches.length > 3 ? 'h-48' : ''}>
          <div className="space-y-1.5">
            {connectedCoaches.map(coach => (
              <button
                key={coach.id}
                type="button"
                onClick={() => onChange({ type: 'assigned', coach_id: coach.id, coach_name: coach.full_name })}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg border p-2.5 transition-all text-left',
                  value.type === 'assigned' && value.coach_id === coach.id
                    ? 'bg-primary/10 border-primary ring-2 ring-primary'
                    : 'bg-muted/20 border-border hover:bg-muted'
                )}
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{coach.full_name}</span>
                {coach.is_head_coach && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                    <Crown className="h-2.5 w-2.5" />
                    Head
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* External + Self-Directed */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ type: 'external', external_name: value.external_name ?? '' })}
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border p-3 transition-all text-center',
            value.type === 'external'
              ? 'bg-primary/10 border-primary ring-2 ring-primary'
              : 'bg-muted/20 border-border hover:bg-muted'
          )}
        >
          <UserPlus className="h-4 w-4" />
          <span className="text-xs font-medium">External Coach</span>
          <span className="text-[10px] text-muted-foreground">Not on app</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ type: 'none' })}
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border p-3 transition-all text-center',
            value.type === 'none'
              ? 'bg-primary/10 border-primary ring-2 ring-primary'
              : 'bg-muted/20 border-border hover:bg-muted'
          )}
        >
          <UserX className="h-4 w-4" />
          <span className="text-xs font-medium">Self-Directed</span>
          <span className="text-[10px] text-muted-foreground">No coach</span>
        </button>
      </div>

      {value.type === 'external' && (
        <Input
          placeholder="Coach / trainer name"
          value={value.external_name ?? ''}
          onChange={e => onChange({ ...value, external_name: e.target.value })}
          className="mt-2 h-9 text-sm"
        />
      )}
    </div>
  );
}
