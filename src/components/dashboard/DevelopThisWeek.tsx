import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { Button } from '@/components/ui/button';
import { savedWeek } from './savedWeek';

export function DevelopThisWeek() {
  const { user } = useAuth();
  const { sport } = useSportTheme();
  const today = new Date().toLocaleDateString('en-CA');
  const { start, end } = savedWeek([], sport, today);
  const query = useQuery({ queryKey: ['saved-development-week', user?.id, sport, start], enabled: !!user, queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('athlete_plan_snapshots').select('plan_date,sport,payload').eq('user_id', user.id).eq('sport', sport).gte('plan_date', start).lte('plan_date', end).order('plan_date');
    if (error) throw error;
    return savedWeek(data ?? [], sport, today);
  } });
  if (query.isPending) return null;
  return <section aria-label="Develop This Week" className="space-y-3 border-t border-border pt-4">
    <h2 className="text-base font-semibold">Develop This Week</h2>
    <p className="text-xs text-muted-foreground">Saved plans · {start} – {end}</p>
    {query.isError ? <div role="alert">Your saved week couldn’t be loaded.<Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></div> : !query.data?.days.length ? <p className="text-sm text-muted-foreground">No saved plans this week yet.</p> : query.data.days.map(day => <details key={day.date} className="border-b border-border pb-2"><summary className="cursor-pointer text-sm font-medium">{day.date} · {day.activities.length} saved activities</summary><ul className="mt-2 space-y-2 text-sm">{day.activities.map((activity,index) => <li key={`${activity.name}-${index}`} className="break-words"><span className="text-xs text-muted-foreground">{activity.category}</span><p>{activity.name} · {activity.dosage}</p></li>)}</ul></details>)}
  </section>;
}