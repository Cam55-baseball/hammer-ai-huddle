import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Construction } from 'lucide-react';

interface Gate {
  label: string;
  met: boolean;
}

export function DataBuildingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['mpi-settings-gate', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('athlete_mpi_settings')
        .select('games_minimum_met, integrity_threshold_met, coach_validation_met, data_span_met, ranking_eligible, primary_coach_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return null;

  const hasCoach = !!settings?.primary_coach_id;

  const gates: Gate[] = [
    { label: '60+ sessions logged', met: !!settings?.games_minimum_met },
    { label: '80+ integrity score', met: !!settings?.integrity_threshold_met },
    {
      label: hasCoach
        ? '40%+ coach validation'
        : 'Coach validation (auto-passed — no coach assigned)',
      met: !!settings?.coach_validation_met,
    },
    { label: '14+ day data span', met: !!settings?.data_span_met },
  ];

  const allMet = gates.every(g => g.met);

  if (allMet) return <>{children}</>;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Construction className="h-5 w-5 text-amber-500" /> Data Building Phase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground mb-3">
          Complete these requirements to unlock your full analytics dashboard.
        </p>
        {gates.map((g) => (
          <div key={g.label} className="flex items-center gap-2 text-sm">
            {g.met ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={g.met ? 'text-foreground' : 'text-muted-foreground'}>{g.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
