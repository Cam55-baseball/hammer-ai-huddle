import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { computeStreaks } from '@/utils/consistencyIndex';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, CheckCircle } from 'lucide-react';

export function DualStreakDisplay() {
  const { user } = useAuth();

  const { data: streaks } = useQuery({
    queryKey: ['dual-streaks', user?.id],
    queryFn: async () => {
      if (!user) return { performanceStreak: 0, disciplineStreak: 0 };
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('athlete_daily_log')
        .select('entry_date, day_status')
        .eq('user_id', user.id)
        .gte('entry_date', thirtyDaysAgo)
        .order('entry_date', { ascending: true });
      return computeStreaks(data ?? []);
    },
    enabled: !!user,
  });

  if (!streaks) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-lg font-bold text-foreground">{streaks.performanceStreak}</p>
            <p className="text-[10px] text-muted-foreground">Performance</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-lg font-bold text-foreground">{streaks.disciplineStreak}</p>
            <p className="text-[10px] text-muted-foreground">Discipline</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
