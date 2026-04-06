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
    await completeGame(gameId, { completed_at: new Date().toISOString() });
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
