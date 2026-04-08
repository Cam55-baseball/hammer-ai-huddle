import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GameSetupForm } from '@/components/game-scoring/GameSetupForm';
import { LiveScorebook } from '@/components/game-scoring/LiveScorebook';
import { GameSummaryView } from '@/components/game-scoring/GameSummaryView';
import { useGameScoring, type GameSetup, type GamePlay } from '@/hooks/useGameScoring';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { dispatchSportChange } from '@/contexts/SportThemeContext';

type GamePhase = 'setup' | 'scoring' | 'summary';

export default function GameScoring() {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [gameData, setGameData] = useState<GameSetup | null>(null);
  const [allPlays, setAllPlays] = useState<any[]>([]);
  const { gameId, saving, createGame, addPlay, getPlays, completeGame, syncGameToPlayerStats } = useGameScoring();

  const handleSetup = useCallback(async (setup: GameSetup) => {
    dispatchSportChange(setup.sport);
    const id = await createGame(setup);
    if (id) {
      setGameData(setup);
      setPhase('scoring');
    }
  }, [createGame]);

  const handlePlayRecorded = useCallback(async (plays: GamePlay[]) => {
    if (!gameId) return;
    for (const play of plays) {
      await addPlay({ ...play, game_id: gameId });
    }
    const updated = await getPlays(gameId);
    setAllPlays(updated);
  }, [gameId, addPlay, getPlays]);

  const handleComplete = useCallback(async () => {
    if (!gameId || !gameData) return;
    const plays = await getPlays(gameId);
    setAllPlays(plays);

    // Compute rich analytics for persistence
    const finalPitches = plays.filter((p: any) => p.at_bat_outcome && p.batter_name);
    const batterMap = new Map<string, any>();
    for (const p of finalPitches) {
      const name = p.batter_name!;
      if (!batterMap.has(name)) {
        batterMap.set(name, { name, pa: 0, ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, walks: 0, strikeouts: 0, hbp: 0, avg: 0, obp: 0, slg: 0, ops: 0, kPct: 0, bbPct: 0, sprayData: [], pitchLocationHits: [] });
      }
      const s = batterMap.get(name)!;
      if (p.at_bat_outcome) s.pa++;
      if (p.at_bat_outcome && !['walk', 'hbp', 'sac_fly', 'sac_bunt', 'catcher_interference'].includes(p.at_bat_outcome)) s.ab++;
      if (['single', 'double', 'triple', 'home_run'].includes(p.at_bat_outcome)) {
        s.hits++;
        if (p.at_bat_outcome === 'single') s.singles++;
        if (p.at_bat_outcome === 'double') s.doubles++;
        if (p.at_bat_outcome === 'triple') s.triples++;
        if (p.at_bat_outcome === 'home_run') s.hr++;
      }
      if (p.at_bat_outcome === 'walk') s.walks++;
      if (p.at_bat_outcome === 'strikeout' || p.at_bat_outcome === 'strikeout_looking') s.strikeouts++;
      if (p.at_bat_outcome === 'hbp') s.hbp++;
      s.rbi += p.rbi ?? 0;
      if (p.spray_direction && p.batted_ball_type) s.sprayData.push({ direction: p.spray_direction, type: p.batted_ball_type });
    }
    for (const s of batterMap.values()) {
      s.avg = s.ab > 0 ? s.hits / s.ab : 0;
      const tb = s.singles + s.doubles * 2 + s.triples * 3 + s.hr * 4;
      s.slg = s.ab > 0 ? tb / s.ab : 0;
      s.obp = s.pa > 0 ? (s.hits + s.walks + s.hbp) / s.pa : 0;
      s.ops = s.obp + s.slg;
      s.kPct = s.pa > 0 ? (s.strikeouts / s.pa) * 100 : 0;
      s.bbPct = s.pa > 0 ? (s.walks / s.pa) * 100 : 0;
    }

    const pitcherPlays = plays.filter((p: any) => p.pitcher_name);
    const pitcherMap = new Map<string, any>();
    for (const p of pitcherPlays) {
      const name = p.pitcher_name!;
      if (!pitcherMap.has(name)) {
        pitcherMap.set(name, { name, pitchCount: 0, strikes: 0, balls: 0, velocityAvg: 0, velocityPeak: 0, pitchTypeCounts: {}, velocityTrend: [] });
      }
      const s = pitcherMap.get(name)!;
      s.pitchCount++;
      if (['called_strike', 'swinging_strike', 'foul', 'in_play_out', 'in_play_hit'].includes(p.pitch_result)) s.strikes++;
      else s.balls++;
      if (p.pitch_velocity_mph) {
        s.velocityTrend.push(p.pitch_velocity_mph);
        if (p.pitch_velocity_mph > s.velocityPeak) s.velocityPeak = p.pitch_velocity_mph;
      }
      if (p.pitch_type) s.pitchTypeCounts[p.pitch_type] = (s.pitchTypeCounts[p.pitch_type] || 0) + 1;
    }
    for (const s of pitcherMap.values()) {
      if (s.velocityTrend.length > 0) s.velocityAvg = s.velocityTrend.reduce((a: number, b: number) => a + b, 0) / s.velocityTrend.length;
    }

    const myRuns = plays.filter((p: any) => p.half === 'bottom' && p.rbi).reduce((sum: number, p: any) => sum + (p.rbi ?? 0), 0);
    const oppRuns = plays.filter((p: any) => p.half === 'top' && p.rbi).reduce((sum: number, p: any) => sum + (p.rbi ?? 0), 0);

    const sprayData = plays.filter((p: any) => p.spray_direction && p.batted_ball_type).map((p: any) => ({ direction: p.spray_direction, type: p.batted_ball_type }));

    const richSummary = {
      completed_at: new Date().toISOString(),
      team_runs: myRuns,
      opponent_runs: oppRuns,
      batterStats: Array.from(batterMap.values()),
      pitcherStats: Array.from(pitcherMap.values()),
      teamScore: { myRuns, oppRuns },
      sprayData,
    };

    await completeGame(gameId, richSummary);
    await syncGameToPlayerStats(gameId, gameData);
    setPhase('summary');
  }, [gameId, gameData, getPlays, completeGame, syncGameToPlayerStats]);

  if (ownerLoading || adminLoading) {
    return (
      <DashboardLayout>
        <div className="container max-w-5xl mx-auto py-6 px-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isOwner && !isAdmin) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto mt-20 text-center p-8">
          <Construction className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">Game Hub Locked</h2>
          <p className="text-muted-foreground mt-2">
            Closed temporarily for renovations.
          </p>
        </Card>
      </DashboardLayout>
    );
  }

  const startingPitcherName = gameData?.lineup.find(p => p.id === gameData.starting_pitcher_id)?.name || gameData?.lineup[0]?.name || '';

  return (
    <DashboardLayout>
      <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-3">
          {phase !== 'setup' && (
            <Button variant="ghost" size="icon" onClick={() => {
              if (phase === 'summary') setPhase('scoring');
              else setPhase('setup');
            }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">🎯 Game Scoring</h1>
            <p className="text-sm text-muted-foreground">
              {phase === 'setup' ? 'Set up your game' : phase === 'scoring' ? 'Live scoring' : 'Game Summary'}
            </p>
          </div>
        </div>

        {phase === 'setup' && (
          <GameSetupForm onSubmit={handleSetup} saving={saving} />
        )}

        {phase === 'scoring' && gameId && gameData && (
          <LiveScorebook
            gameId={gameId}
            sport={gameData.sport}
            totalInnings={gameData.total_innings}
            lineup={gameData.lineup}
            startingPitcherName={startingPitcherName}
            onPlayRecorded={handlePlayRecorded}
            allPlays={allPlays}
            onComplete={handleComplete}
            teamName={gameData.team_name}
            opponentName={gameData.opponent_name}
            gameMode={gameData.game_mode}
            playerPosition={gameData.lineup[0]?.position}
            homeOrAway={gameData.home_or_away}
            batterHand={gameData.batter_hand}
            videoMode={gameData.video_mode}
          />
        )}

        {phase === 'summary' && gameData && (
          <GameSummaryView
            plays={allPlays}
            teamName={gameData.team_name}
            opponentName={gameData.opponent_name}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
