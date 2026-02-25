import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { User, UserX, UserPlus } from 'lucide-react';

export interface CoachSelection {
  type: 'assigned' | 'external' | 'none';
  coach_id?: string;
  coach_name?: string;
  external_name?: string;
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

  const { data: coachName } = useQuery({
    queryKey: ['coach-name', mpiSettings?.primary_coach_id],
    queryFn: async () => {
      if (!mpiSettings?.primary_coach_id) return null;
      const { data } = await supabase
        .from('profiles_public')
        .select('full_name')
        .eq('id', mpiSettings.primary_coach_id)
        .maybeSingle();
      return data?.full_name ?? 'Coach';
    },
    enabled: !!mpiSettings?.primary_coach_id,
  });

  const options = [
    ...(mpiSettings?.primary_coach_id ? [{
      type: 'assigned' as const,
      label: coachName ?? 'Your Coach',
      icon: User,
      description: 'Primary coach',
    }] : []),
    {
      type: 'external' as const,
      label: 'External Coach',
      icon: UserPlus,
      description: 'Coach not on app',
    },
    {
      type: 'none' as const,
      label: 'Self-Directed',
      icon: UserX,
      description: 'No coach',
    },
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Coach</label>
      <div className="grid grid-cols-3 gap-2">
        {options.map(opt => (
          <button
            key={opt.type}
            type="button"
            onClick={() => {
              if (opt.type === 'assigned') {
                onChange({ type: 'assigned', coach_id: mpiSettings?.primary_coach_id, coach_name: coachName ?? undefined });
              } else if (opt.type === 'external') {
                onChange({ type: 'external', external_name: value.external_name ?? '' });
              } else {
                onChange({ type: 'none' });
              }
            }}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 transition-all text-center',
              value.type === opt.type
                ? 'bg-primary/10 border-primary ring-2 ring-primary'
                : 'bg-muted/20 border-border hover:bg-muted'
            )}
          >
            <opt.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{opt.label}</span>
            <span className="text-[10px] text-muted-foreground">{opt.description}</span>
          </button>
        ))}
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
