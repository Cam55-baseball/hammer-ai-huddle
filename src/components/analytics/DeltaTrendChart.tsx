import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeltaAnalytics } from '@/hooks/useDeltaAnalytics';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export function DeltaTrendChart() {
  const { data: sessions, isLoading } = useDeltaAnalytics();

  const chartData = (sessions ?? []).slice(-50).map((s) => ({
    date: s.session_date,
    player: s.player_grade,
    coach: s.coach_grade,
    delta: s.delta,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Player vs Coach Grade Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Log graded sessions to see your trend</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis domain={[20, 80]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => [value?.toFixed(1), name === 'player' ? 'Player' : name === 'coach' ? 'Coach' : 'Delta']}
              />
              <Area type="monotone" dataKey="delta" fill="hsl(var(--primary) / 0.1)" stroke="none" />
              <Line type="monotone" dataKey="player" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="coach" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
