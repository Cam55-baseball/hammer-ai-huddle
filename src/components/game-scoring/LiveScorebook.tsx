import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { AtBatPanel } from './AtBatPanel';
import { PitcherTracker } from './PitcherTracker';
import { DiamondVisual } from './DiamondVisual';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';
import { cn } from '@/lib/utils';
import type { GamePlay, LineupPlayer } from '@/hooks/useGameScoring';

interface LiveScorebookProps {
  gameId: string;
  sport: 'baseball' | 'softball';
  totalInnings: number;
  lineup: LineupPlayer[];
  startingPitcherName: string;
  onPlayRecorded: (plays: GamePlay[]) => void;
  allPlays: any[];
  onComplete: () => void;
}

const OUTCOME_ABBREVIATIONS: Record<string, string> = {
  single: '1B', double: '2B', triple: '3B', home_run: 'HR',
  walk: 'BB', strikeout: 'K', strikeout_looking: 'Kꓘ', hbp: 'HBP',
  ground_out: 'GO', fly_out: 'FO', line_out: 'LO', pop_out: 'PO',
  fielders_choice: 'FC', double_play: 'DP', sac_fly: 'SF', sac_bunt: 'SAC', error: 'E',
};

export function LiveScorebook({
  gameId, sport, totalInnings, lineup, startingPitcherName, onPlayRecorded, allPlays, onComplete,
}: LiveScorebookProps) {
  const [currentInning, setCurrentInning] = useState(1);
  const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>('bottom');
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [currentPitcher, setCurrentPitcher] = useState(startingPitcherName);
  const [runners, setRunners] = useState<{ first?: boolean; second?: boolean; third?: boolean }>({});
  const [outs, setOuts] = useState(0);
  const [activeAtBat, setActiveAtBat] = useState(true);

  const { pitcherStats, batterStats, teamScore } = useGameAnalytics(allPlays);
  const currentPitcherStats = pitcherStats.find(p => p.name === currentPitcher);

  const innings = Array.from({ length: totalInnings }, (_, i) => i + 1);
  const currentBatter = lineup[currentBatterIndex % lineup.length];

  // Get at-bat results for scorebook grid
  const getAtBatResult = (batterName: string, inning: number) => {
    const plays = allPlays.filter(p =>
      p.batter_name === batterName && p.inning === inning && p.half === 'bottom' && p.at_bat_outcome
    );
    return plays.length > 0 ? plays[plays.length - 1] : null;
  };

  const handleAtBatComplete = useCallback((plays: GamePlay[]) => {
    onPlayRecorded(plays);

    // Determine outcome
    const lastPlay = plays[plays.length - 1];
    const outcome = lastPlay?.at_bat_outcome;

    // Update outs
    const isOut = ['ground_out', 'fly_out', 'line_out', 'pop_out', 'strikeout', 'strikeout_looking', 'fielders_choice'].includes(outcome || '');
    const isDP = outcome === 'double_play';
    const newOuts = outs + (isDP ? 2 : isOut ? 1 : 0);

    if (newOuts >= 3) {
      // Half inning over
      setOuts(0);
      setRunners({});
      if (currentHalf === 'bottom') {
        if (currentInning >= totalInnings) {
          // Game could be over
        }
        setCurrentInning(prev => prev + 1);
        setCurrentHalf('top');
      } else {
        setCurrentHalf('bottom');
      }
    } else {
      setOuts(newOuts);
      // Simple runner advancement logic
      if (['single', 'walk', 'hbp', 'error', 'fielders_choice'].includes(outcome || '')) {
        setRunners(prev => ({
          first: true,
          second: prev.first || false,
          third: prev.second || false,
        }));
      } else if (outcome === 'double') {
        setRunners(prev => ({
          first: false,
          second: true,
          third: prev.first || false,
        }));
      } else if (outcome === 'triple') {
        setRunners({ first: false, second: false, third: true });
      } else if (outcome === 'home_run') {
        setRunners({});
      }
    }

    // Advance to next batter
    setCurrentBatterIndex(prev => prev + 1);
    setActiveAtBat(true);
  }, [outs, currentHalf, currentInning, totalInnings, onPlayRecorded]);

  return (
    <div className="space-y-4">
      {/* Game status bar */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-lg font-bold">{currentHalf === 'top' ? '▲' : '▼'} {currentInning}</div>
            <div className="text-[10px] text-muted-foreground">Inning</div>
          </div>
          <DiamondVisual runners={runners} size="md" />
          <div className="text-center">
            <div className="text-lg font-bold">{outs}</div>
            <div className="text-[10px] text-muted-foreground">Outs</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{teamScore.myRuns} - {teamScore.oppRuns}</div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} />
            <Label className="text-xs">Advanced</Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main scorebook grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-2">
              <ScrollArea className="w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1.5 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[120px]">Batter</th>
                      <th className="p-1 font-medium text-muted-foreground min-w-[40px]">Pos</th>
                      {innings.map(i => (
                        <th key={i} className={cn(
                          'p-1 font-medium min-w-[50px] text-center',
                          i === currentInning ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                        )}>{i}</th>
                      ))}
                      <th className="p-1 font-medium text-muted-foreground">AB</th>
                      <th className="p-1 font-medium text-muted-foreground">H</th>
                      <th className="p-1 font-medium text-muted-foreground">R</th>
                      <th className="p-1 font-medium text-muted-foreground">RBI</th>
                      <th className="p-1 font-medium text-muted-foreground">BB</th>
                      <th className="p-1 font-medium text-muted-foreground">K</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineup.map((player, idx) => {
                      const pStats = batterStats.find(b => b.name === player.name);
                      return (
                        <tr key={player.id} className={cn(
                          'border-b',
                          idx === currentBatterIndex % lineup.length && 'bg-primary/5'
                        )}>
                          <td className="p-1.5 font-medium sticky left-0 bg-card z-10">
                            <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                            {player.name}
                          </td>
                          <td className="p-1 text-center text-muted-foreground">{player.position}</td>
                          {innings.map(i => {
                            const result = getAtBatResult(player.name, i);
                            return (
                              <td key={i} className={cn(
                                'p-1 text-center font-bold',
                                i === currentInning ? 'bg-primary/5' : ''
                              )}>
                                {result ? (
                                  <span className={cn(
                                    'px-1 py-0.5 rounded text-[10px]',
                                    ['single', 'double', 'triple', 'home_run'].includes(result.at_bat_outcome)
                                      ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                      : ['walk', 'hbp'].includes(result.at_bat_outcome)
                                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                        : 'text-muted-foreground'
                                  )}>
                                    {OUTCOME_ABBREVIATIONS[result.at_bat_outcome] || result.at_bat_outcome}
                                  </span>
                                ) : null}
                              </td>
                            );
                          })}
                          <td className="p-1 text-center tabular-nums">{pStats?.ab || 0}</td>
                          <td className="p-1 text-center tabular-nums">{pStats?.hits || 0}</td>
                          <td className="p-1 text-center tabular-nums">—</td>
                          <td className="p-1 text-center tabular-nums">{pStats?.rbi || 0}</td>
                          <td className="p-1 text-center tabular-nums">{pStats?.walks || 0}</td>
                          <td className="p-1 text-center tabular-nums">{pStats?.strikeouts || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Active at-bat */}
          {activeAtBat && currentBatter && currentHalf === 'bottom' && (
            <div className="mt-4">
              <AtBatPanel
                batterName={currentBatter.name}
                batterOrder={currentBatter.batting_order}
                pitcherName={currentPitcher}
                inning={currentInning}
                half={currentHalf}
                gameId={gameId}
                sport={sport}
                advancedMode={advancedMode}
                runners={runners}
                onComplete={handleAtBatComplete}
              />
            </div>
          )}

          {currentHalf === 'top' && (
            <Card className="mt-4">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Top of inning — opponent batting</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setCurrentHalf('bottom')}>
                  Switch to Bottom
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — pitcher tracker */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Current Pitcher</Label>
            <Select value={currentPitcher} onValueChange={setCurrentPitcher}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {lineup.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <PitcherTracker stats={currentPitcherStats} />
          <Button variant="outline" onClick={onComplete} className="w-full">
            End Game
          </Button>
        </div>
      </div>
    </div>
  );
}
