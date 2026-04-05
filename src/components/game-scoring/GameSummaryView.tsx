import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerGameCard } from './PlayerGameCard';
import { PitcherTracker } from './PitcherTracker';
import { SprayChart } from './SprayChart';
import { HeatMapGrid } from './HeatMapGrid';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface GameSummaryViewProps {
  plays: any[];
  teamName: string;
  opponentName: string;
  sport?: 'baseball' | 'softball';
}

export function GameSummaryView({ plays, teamName, opponentName, sport = 'baseball' }: GameSummaryViewProps) {
  const { batterStats, pitcherStats, teamScore, heatMapData, contactHeatMap } = useGameAnalytics(plays);

  const allSpray = plays
    .filter(p => p.spray_direction && p.batted_ball_type)
    .map(p => ({ direction: p.spray_direction, type: p.batted_ball_type }));

  // Build pitch usage chart data
  const pitchUsage = plays.filter(p => p.pitch_type).reduce((acc: Record<string, number>, p: any) => {
    acc[p.pitch_type] = (acc[p.pitch_type] || 0) + 1;
    return acc;
  }, {});
  const pitchUsageData = Object.entries(pitchUsage).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      {/* Final Score */}
      <Card>
        <CardContent className="py-6 text-center">
          <div className="text-3xl font-bold tabular-nums">{teamScore.myRuns} — {teamScore.oppRuns}</div>
          <div className="text-sm text-muted-foreground mt-1">{teamName} vs {opponentName}</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="batters">
        <TabsList className="w-full">
          <TabsTrigger value="batters" className="flex-1">Batters</TabsTrigger>
          <TabsTrigger value="pitchers" className="flex-1">Pitchers</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="batters" className="space-y-3 mt-3">
          {batterStats.map(bs => (
            <PlayerGameCard key={bs.name} stats={bs} sport={sport} />
          ))}
          {batterStats.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No batter data recorded</p>
          )}
        </TabsContent>

        <TabsContent value="pitchers" className="space-y-3 mt-3">
          {pitcherStats.map(ps => (
            <PitcherTracker key={ps.name} stats={ps} />
          ))}
          {pitcherStats.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No pitcher data recorded</p>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-4 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Pitch Location Heat Map</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pb-3">
                <HeatMapGrid grid={heatMapData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Contact Heat Map</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pb-3">
                <HeatMapGrid grid={contactHeatMap} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Team Spray Chart</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center pb-3">
                <SprayChart data={allSpray} size={200} sport={sport} />
              </CardContent>
            </Card>

            {pitchUsageData.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">Pitch Usage</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={pitchUsageData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {pitcherStats.length > 0 && pitcherStats[0].velocityTrend.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">Velocity Trend — {pitcherStats[0].name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={pitcherStats[0].velocityTrend.map((v, i) => ({ pitch: i + 1, mph: v }))}>
                      <XAxis dataKey="pitch" tick={{ fontSize: 10 }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="mph" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
