import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

type Cell = 'green' | 'yellow' | 'red' | 'grey';

const COLORS: Record<Cell, string> = {
  green:  'bg-emerald-500/80 hover:bg-emerald-500',
  yellow: 'bg-amber-500/80 hover:bg-amber-500',
  red:    'bg-rose-500/70 hover:bg-rose-500',
  grey:   'bg-muted hover:bg-muted/80',
};

const last7Days = (): string[] => {
  const out: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

export function CoachComplianceView() {
  const { user } = useAuth();
  const [drill, setDrill] = useState<{ playerId: string; date: string; name: string } | null>(null);

  const days = last7Days();
  const startDate = days[0];

  const { data, isLoading } = useQuery({
    queryKey: ['coach-compliance', user?.id, startDate],
    enabled: !!user,
    queryFn: async () => {
      const { data: follows } = await (supabase as any)
        .from('scout_follows')
        .select('player_id, profiles:player_id(id, full_name)')
        .eq('scout_id', user!.id)
        .eq('status', 'accepted')
        .in('relationship_type', ['linked', 'follow']);

      const players = (follows ?? []).map((f: any) => ({
        id: f.player_id,
        name: f.profiles?.full_name ?? 'Player',
      }));
      if (!players.length) return { players: [], grid: {} };

      const ids = players.map((p: any) => p.id);

      const [logsRes, plansRes] = await Promise.all([
        (supabase as any)
          .from('custom_activity_logs')
          .select('user_id, entry_date, completed')
          .in('user_id', ids)
          .gte('entry_date', startDate),
        (supabase as any)
          .from('game_plan_days')
          .select('user_id, date, is_completed')
          .in('user_id', ids)
          .gte('date', startDate),
      ]);

      const grid: Record<string, Record<string, Cell>> = {};
      for (const p of players) {
        grid[p.id] = {};
        for (const d of days) {
          const dayLogs = (logsRes.data ?? []).filter((l: any) => l.user_id === p.id && l.entry_date === d);
          const plan = (plansRes.data ?? []).find((g: any) => g.user_id === p.id && g.date === d);
          if (plan?.is_completed || dayLogs.filter((l: any) => l.completed).length >= 2) {
            grid[p.id][d] = 'green';
          } else if (dayLogs.length > 0) {
            grid[p.id][d] = 'yellow';
          } else if (plan) {
            grid[p.id][d] = 'red';
          } else {
            grid[p.id][d] = 'grey';
          }
        }
      }
      return { players, grid };
    },
  });

  const { data: dayDetail } = useQuery({
    queryKey: ['coach-compliance-day', drill?.playerId, drill?.date],
    enabled: !!drill,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('custom_activity_logs')
        .select('id, entry_date, completed, actual_duration_minutes, notes, performance_data')
        .eq('user_id', drill!.playerId)
        .eq('entry_date', drill!.date)
        .order('completed_at', { ascending: false });
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Roster Compliance — Last 7 Days
        </CardTitle>
        <CardDescription>Tap any cell to inspect that athlete’s day.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data?.players.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No linked athletes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">Athlete</th>
                  {days.map((d) => (
                    <th key={d} className="px-1 py-1.5 text-center font-medium">
                      {new Date(d).toLocaleDateString(undefined, { weekday: 'short' })[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.players.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="max-w-[140px] truncate px-2 py-1.5 font-medium">{p.name}</td>
                    {days.map((d) => {
                      const cell = data.grid[p.id][d];
                      return (
                        <td key={d} className="px-1 py-1">
                          <button
                            type="button"
                            onClick={() => setDrill({ playerId: p.id, date: d, name: p.name })}
                            className={cn('h-6 w-full rounded transition-colors', COLORS[cell])}
                            aria-label={`${p.name} ${d} ${cell}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Complete</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-500" /> Partial</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-rose-500" /> Missed</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted" /> No plan</span>
            </div>
          </div>
        )}

        <Sheet open={!!drill} onOpenChange={(b) => !b && setDrill(null)}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{drill?.name} — {drill?.date}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {!dayDetail?.length ? (
                <p className="text-sm text-muted-foreground">No logged activity for this day.</p>
              ) : (
                dayDetail.map((l: any) => (
                  <div key={l.id} className="rounded border p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{(l.performance_data?.module ?? 'Activity').toString()}</span>
                      <span className={l.completed ? 'text-emerald-500' : 'text-amber-500'}>
                        {l.completed ? 'Done' : 'Open'}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {l.actual_duration_minutes ? `${l.actual_duration_minutes}m` : ''}
                      {l.performance_data?.rpe ? ` · RPE ${l.performance_data.rpe}` : ''}
                    </p>
                    {l.notes && <p className="mt-1">{l.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
