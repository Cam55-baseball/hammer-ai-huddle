import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GameSetupForm } from '@/components/game-scoring/GameSetupForm';
import { LiveScorebook } from '@/components/game-scoring/LiveScorebook';
import { GameSummaryView } from '@/components/game-scoring/GameSummaryView';
import { useGameScoring, type GameSetup, type GamePlay } from '@/hooks/useGameScoring';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dispatchSportChange } from '@/contexts/SportThemeContext';

type GamePhase = 'setup' | 'scoring' | 'summary';

export default function GameScoring() {
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [gameData, setGameData] = useState<GameSetup | null>(null);
  const [allPlays, setAllPlays] = useState<any[]>([]);
  const { gameId, saving, createGame, addPlay, getPlays, completeGame, syncGameToPlayerStats } = useGameScoring();

  const handleSetup = useCallback(async (setup: GameSetup) => {
    // Override global sport context to match the game being scored
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
    // Refresh plays
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
