import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, MapPin, Calendar, Users } from 'lucide-react';
import { PlayerGameCard } from '@/components/game-scoring/PlayerGameCard';
import { PitcherTracker } from '@/components/game-scoring/PitcherTracker';
import { SprayChart } from '@/components/game-scoring/SprayChart';
import { useGamePlays } from '@/hooks/useGamePlays';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface GameSession {
  id: string;
  sport: string;
  team_name: string;
  opponent_name: string;
  game_type: string;
  league_level: string;
  game_date: string;
  venue: string | null;
  total_innings: number;
  lineup: any;
  game_summary: any;
  game_mode: string | null;
  is_practice_game: boolean | null;
  status: string;
}

interface Props {
  session: GameSession | null;
  open: boolean;
  onClose: () => void;
}

export function GameSessionDetailDialog({ session, open, onClose }: Props) {
  if (!session) return null;

  const summary = session.game_summary as any;
  const lineup = Array.isArray(session.lineup) ? session.lineup : [];
  const hasRichData = summary?.batterStats && summary?.pitcherStats;
  const sport = (session.sport as 'baseball' | 'softball') || 'baseball';

  // Fallback: fetch raw plays for old games without rich summary
  const needsFallback = open && !hasRichData && session.status === 'completed';
  const { plays: rawPlays, loading: playsLoading } = useGamePlays(needsFallback ? session.id : null);
  const fallbackAnalytics = useGameAnalytics(needsFallback ? rawPlays : []);

  // Resolve data source
  const batterStats = hasRichData ? summary.batterStats : fallbackAnalytics.batterStats;
  const pitcherStats = hasRichData ? summary.pitcherStats : fallbackAnalytics.pitcherStats;
  const teamScore = hasRichData
    ? (summary.teamScore || { myRuns: summary.team_runs ?? 0, oppRuns: summary.opponent_runs ?? 0 })
    : fallbackAnalytics.teamScore;
  const sprayData = hasRichData
    ? (summary.sprayData || [])
    : rawPlays.filter((p: any) => p.spray_direction && p.batted_ball_type).map((p: any) => ({ direction: p.spray_direction, type: p.batted_ball_type }));

  // Pitch usage chart from pitcher stats
  const pitchUsageData = useMemo(() => {
    const counts: Record<string, number> = {};
    (pitcherStats || []).forEach((ps: any) => {
      if (ps.pitchTypeCounts) {
        Object.entries(ps.pitchTypeCounts).forEach(([type, count]) => {
          counts[type] = (counts[type] || 0) + (count as number);
        });
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [pitcherStats]);

  const isWin = teamScore.myRuns > teamScore.oppRuns;
  const isLoss = teamScore.myRuns < teamScore.oppRuns;
  const isTie = teamScore.myRuns === teamScore.oppRuns;

  const showAnalytics = session.status === 'completed' && (hasRichData || rawPlays.length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {session.team_name} vs {session.opponent_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">{session.sport}</Badge>
            <Badge variant="outline" className="capitalize">{session.game_type.replace(/_/g, ' ')}</Badge>
            <Badge variant="secondary">{session.league_level}</Badge>
            {session.is_practice_game && <Badge variant="secondary">Practice</Badge>}
            {session.status === 'completed' && (
              isWin ? <Badge className="bg-green-600 text-white">W</Badge> :
              isLoss ? <Badge className="bg-red-600 text-white">L</Badge> :
              <Badge variant="secondary">T</Badge>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(session.game_date).toLocaleDateString()}
            </span>
            {session.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {session.venue}
              </span>
            )}
            <span>{session.total_innings} innings</span>
          </div>

          {/* Score Card */}
          {session.status === 'completed' && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">{session.team_name}</p>
                  <p className="text-3xl font-bold tabular-nums">{teamScore.myRuns}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">{session.opponent_name}</p>
                  <p className="text-3xl font-bold tabular-nums">{teamScore.oppRuns}</p>
                </div>
              </div>
            </>
          )}

          {/* Loading state for fallback */}
          {needsFallback && playsLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {/* Rich Analytics Tabs */}
          {showAnalytics && !playsLoading && (
            <>
              <Separator />
              <Tabs defaultValue="batters">
                <TabsList className="w-full">
                  <TabsTrigger value="batters" className="flex-1 text-xs">Batters</TabsTrigger>
                  <TabsTrigger value="pitchers" className="flex-1 text-xs">Pitchers</TabsTrigger>
                  <TabsTrigger value="charts" className="flex-1 text-xs">Charts</TabsTrigger>
                  <TabsTrigger value="lineup" className="flex-1 text-xs">Lineup</TabsTrigger>
                </TabsList>

                <TabsContent value="batters" className="space-y-3 mt-3">
                  {(batterStats || []).length > 0 ? (
                    (batterStats || []).map((bs: any) => (
                      <PlayerGameCard key={bs.name} stats={bs} sport={sport} />
                    ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-6">No batter data</p>
                  )}
                </TabsContent>

                <TabsContent value="pitchers" className="space-y-3 mt-3">
                  {(pitcherStats || []).length > 0 ? (
                    (pitcherStats || []).map((ps: any) => (
                      <PitcherTracker key={ps.name} stats={ps} />
                    ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-6">No pitcher data</p>
                  )}
                </TabsContent>

                <TabsContent value="charts" className="space-y-4 mt-3">
                  {sprayData.length > 0 && (
                    <Card>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs">Team Spray Chart</CardTitle>
                      </CardHeader>
                      <CardContent className="flex justify-center pb-3">
                        <SprayChart data={sprayData} size={180} sport={sport} />
                      </CardContent>
                    </Card>
                  )}
                  {pitchUsageData.length > 0 && (
                    <Card>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs">Pitch Usage</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <ResponsiveContainer width="100%" height={140}>
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
                  {sprayData.length === 0 && pitchUsageData.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-6">No chart data available</p>
                  )}
                </TabsContent>

                <TabsContent value="lineup" className="mt-3">
                  {lineup.length > 0 ? (
                    <div className="space-y-1">
                      {lineup.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm p-1.5 rounded bg-muted/30">
                          <span className="font-medium">#{p.batting_order} {p.name}</span>
                          <Badge variant="outline" className="text-xs">{p.position}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-6">No lineup data</p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* Non-completed games: just show lineup */}
          {session.status !== 'completed' && lineup.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Lineup
                </h4>
                <div className="space-y-1">
                  {lineup.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm p-1.5 rounded bg-muted/30">
                      <span className="font-medium">#{p.batting_order} {p.name}</span>
                      <Badge variant="outline" className="text-xs">{p.position}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
