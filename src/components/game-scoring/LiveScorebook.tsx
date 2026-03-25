import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { AtBatPanel } from './AtBatPanel';
import { PitcherTracker } from './PitcherTracker';
import { DiamondVisual } from './DiamondVisual';
import { SubstitutionDialog } from './SubstitutionDialog';
import { LinescoreBar } from './LinescoreBar';
import { OpponentScoringPanel } from './OpponentScoringPanel';
import { GameVideoPlayer } from './GameVideoPlayer';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';
import { cn } from '@/lib/utils';
import { ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { GamePlay, LineupPlayer, Substitution } from '@/hooks/useGameScoring';

interface LiveScorebookProps {
  gameId: string;
  sport: 'baseball' | 'softball';
  totalInnings: number;
  lineup: LineupPlayer[];
  startingPitcherName: string;
  onPlayRecorded: (plays: GamePlay[]) => void;
  allPlays: any[];
  onComplete: () => void;
  teamName: string;
  opponentName: string;
  gameMode?: string;
  playerPosition?: string;
  homeOrAway?: 'home' | 'away';
  batterHand?: 'right' | 'left' | 'switch';
  videoMode?: boolean;
}

const OUTCOME_ABBREVIATIONS: Record<string, string> = {
  single: '1B', double: '2B', triple: '3B', home_run: 'HR',
  walk: 'BB', strikeout: 'K', strikeout_looking: 'Kꓘ', hbp: 'HBP',
  ground_out: 'GO', fly_out: 'FO', line_out: 'LO', pop_out: 'PO',
  fielders_choice: 'FC', double_play: 'DP', sac_fly: 'SF', sac_bunt: 'SAC', error: 'E',
};

interface DisplayRow {
  player: LineupPlayer;
  slot: number;
  isSubbedOut: boolean;
  isSubstitute: boolean;
  subbedAtInning?: number;
}

interface LastABSummary {
  batterName: string;
  outcome: string;
  pitchCount: number;
  pitcherName: string;
  rbi: number;
}

function buildDisplayRows(lineup: LineupPlayer[], substitutions: Substitution[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  for (let slot = 0; slot < lineup.length; slot++) {
    const subsForSlot = substitutions.filter(s => s.slot === slot);
    if (subsForSlot.length === 0) {
      rows.push({ player: lineup[slot], slot, isSubbedOut: false, isSubstitute: false });
    } else {
      rows.push({ player: lineup[slot], slot, isSubbedOut: true, isSubstitute: false, subbedAtInning: subsForSlot[0].inning });
      for (let i = 0; i < subsForSlot.length; i++) {
        const isLast = i === subsForSlot.length - 1;
        rows.push({
          player: subsForSlot[i].inPlayer,
          slot,
          isSubbedOut: !isLast,
          isSubstitute: true,
          subbedAtInning: !isLast ? subsForSlot[i + 1]?.inning : undefined,
        });
      }
    }
  }
  return rows;
}

/** Calculate runs scored from at-bat outcome + current base runners */
function calculateRunsScored(
  outcome: string | undefined,
  runners: { first?: boolean; second?: boolean; third?: boolean },
): number {
  if (!outcome) return 0;
  const onFirst = runners.first ? 1 : 0;
  const onSecond = runners.second ? 1 : 0;
  const onThird = runners.third ? 1 : 0;
  const totalOnBase = onFirst + onSecond + onThird;

  switch (outcome) {
    case 'home_run':
      return 1 + totalOnBase;
    case 'triple':
      return totalOnBase; // all runners score
    case 'double':
      return onThird + onSecond + onFirst; // runners from 1st, 2nd, 3rd all score
    case 'single':
    case 'error':
    case 'fielders_choice':
      return onThird + onSecond; // runners from 2nd and 3rd score
    case 'sac_fly':
      return onThird;
    case 'walk':
    case 'hbp':
      return (onFirst && onSecond && onThird) ? 1 : 0;
    default:
      return 0;
  }
}

export function LiveScorebook({
  gameId, sport, totalInnings, lineup, startingPitcherName,
  onPlayRecorded, allPlays, onComplete, teamName, opponentName,
  gameMode, playerPosition, homeOrAway = 'home', batterHand, videoMode,
}: LiveScorebookProps) {
  const { user } = useAuth();
  const isSinglePlayer = gameMode === 'single_player';

  // Determine which half the player bats in based on home/away
  const playerBattingHalf: 'top' | 'bottom' = homeOrAway === 'away' ? 'top' : 'bottom';
  const opponentBattingHalf: 'top' | 'bottom' = homeOrAway === 'away' ? 'bottom' : 'top';

  const [currentInning, setCurrentInning] = useState(1);
  const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>('top');
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0);
  const [pitcherHand, setPitcherHand] = useState<'R' | 'L'>('R');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [currentPitcher, setCurrentPitcher] = useState(isSinglePlayer ? '' : startingPitcherName);
  const [recentPitchers, setRecentPitchers] = useState<string[]>([]);
  const [showPitcherSuggestions, setShowPitcherSuggestions] = useState(false);
  const [lastAB, setLastAB] = useState<LastABSummary | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState<number | undefined>(undefined);

  // Fetch recent opponent pitchers for autocomplete (single player mode)
  useEffect(() => {
    if (!isSinglePlayer || !user) return;
    supabase
      .from('game_opponents')
      .select('opponent_name')
      .eq('user_id', user.id)
      .eq('opponent_type', 'pitcher')
      .order('last_faced_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setRecentPitchers(data.map((d: any) => d.opponent_name));
      });
  }, [isSinglePlayer, user]);

  const filteredPitcherSuggestions = currentPitcher.trim()
    ? recentPitchers.filter(n => n.toLowerCase().includes(currentPitcher.toLowerCase()))
    : recentPitchers;
  const [runners, setRunners] = useState<{ first?: boolean; second?: boolean; third?: boolean }>({});
  const [outs, setOuts] = useState(0);
  const [activeAtBat, setActiveAtBat] = useState(true);

  const [inningRuns, setInningRuns] = useState<Record<string, number>>({});
  const [opponentHitsPerInning, setOpponentHitsPerInning] = useState<Record<number, number>>({});
  const [teamErrorsPerInning, setTeamErrorsPerInning] = useState<Record<number, number>>({});

  const [activeLineup, setActiveLineup] = useState<LineupPlayer[]>(() => [...lineup]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subTarget, setSubTarget] = useState<{ slot: number; player: LineupPlayer } | null>(null);

  const { pitcherStats, batterStats } = useGameAnalytics(allPlays);
  const currentPitcherStats = pitcherStats.find(p => p.name === currentPitcher);

  const innings = Array.from({ length: totalInnings }, (_, i) => i + 1);
  const currentBatter = activeLineup[currentBatterIndex % activeLineup.length];

  const activePlayerIds = new Set(activeLineup.map(p => p.player_user_id).filter(Boolean) as string[]);

  const allPlayersForPitcher = [
    ...lineup,
    ...substitutions.map(s => s.inPlayer),
  ].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

  const displayRows = buildDisplayRows(lineup, substitutions);

  const teamRunPrefix = playerBattingHalf === 'bottom' ? 'B' : 'T';
  const oppRunPrefix = opponentBattingHalf === 'bottom' ? 'B' : 'T';
  const totalTeamRuns = useMemo(() =>
    innings.reduce((sum, i) => sum + (inningRuns[`${teamRunPrefix}${i}`] ?? 0), 0),
    [inningRuns, innings, teamRunPrefix]
  );
  const totalOppRuns = useMemo(() =>
    innings.reduce((sum, i) => sum + (inningRuns[`${oppRunPrefix}${i}`] ?? 0), 0),
    [inningRuns, innings, oppRunPrefix]
  );
  const totalTeamHits = useMemo(() => batterStats.reduce((sum, b) => sum + b.hits, 0), [batterStats]);
  const totalOppHits = useMemo(() =>
    Object.values(opponentHitsPerInning).reduce((sum, h) => sum + h, 0),
    [opponentHitsPerInning]
  );
  const totalTeamErrors = useMemo(() =>
    Object.values(teamErrorsPerInning).reduce((sum, e) => sum + e, 0),
    [teamErrorsPerInning]
  );

  const getAtBatResult = (batterName: string, inning: number) => {
    const plays = allPlays.filter(p =>
      p.batter_name === batterName && p.inning === inning && p.half === playerBattingHalf && p.at_bat_outcome
    );
    return plays.length > 0 ? plays[plays.length - 1] : null;
  };

  const handleSubstitution = (slot: number, player: LineupPlayer) => {
    setSubTarget({ slot, player });
    setSubDialogOpen(true);
  };

  const confirmSubstitution = (inPlayerData: { name: string; position: string; player_user_id?: string }) => {
    if (!subTarget) return;
    const { slot, player: outPlayer } = subTarget;
    const inPlayer: LineupPlayer = {
      id: crypto.randomUUID(),
      name: inPlayerData.name,
      position: inPlayerData.position,
      batting_order: outPlayer.batting_order,
      player_user_id: inPlayerData.player_user_id,
    };
    const sub: Substitution = { slot, outPlayer, inPlayer, inning: currentInning, half: currentHalf };
    setSubstitutions(prev => [...prev, sub]);
    setActiveLineup(prev => {
      const next = [...prev];
      next[slot] = inPlayer;
      return next;
    });
    setSubDialogOpen(false);
    setSubTarget(null);
  };

  const handleOpponentRecordAndSwitch = useCallback((runs: number, hits: number, errors: number, outs: number, defensivePlays?: any[]) => {
    // Opponent runs key: use the half prefix for opponent batting
    const oppPrefix = opponentBattingHalf === 'top' ? 'T' : 'B';
    const key = `${oppPrefix}${currentInning}`;
    setInningRuns(prev => ({ ...prev, [key]: (prev[key] ?? 0) + runs }));
    setOpponentHitsPerInning(prev => ({ ...prev, [currentInning]: (prev[currentInning] ?? 0) + hits }));
    setTeamErrorsPerInning(prev => ({ ...prev, [currentInning]: (prev[currentInning] ?? 0) + errors }));

    // Save defensive plays as game plays
    if (defensivePlays && defensivePlays.length > 0) {
      const defPlays: GamePlay[] = defensivePlays.map((dp, idx) => ({
        game_id: gameId,
        inning: currentInning,
        half: opponentBattingHalf,
        pitch_number: idx + 1,
        pitch_result: 'in_play',
        defensive_data: {
          position: dp.position,
          play_type: dp.playType,
          result: dp.result,
          first_step: dp.firstStep,
          throw_accuracy: dp.throwAccuracy,
          note: dp.note,
        },
      }));
      onPlayRecorded(defPlays);
    }

    // Switch to player's batting half
    setCurrentHalf(playerBattingHalf);
  }, [currentInning, opponentBattingHalf, playerBattingHalf, gameId, onPlayRecorded]);

  const handleAtBatComplete = useCallback((plays: GamePlay[]) => {
    const lastPlay = plays[plays.length - 1];
    const outcome = lastPlay?.at_bat_outcome;

    const runsScored = calculateRunsScored(outcome, runners);

    if (runsScored > 0) {
      const teamPrefix = playerBattingHalf === 'bottom' ? 'B' : 'T';
      const key = `${teamPrefix}${currentInning}`;
      setInningRuns(prev => ({ ...prev, [key]: (prev[key] ?? 0) + runsScored }));
    }

    if (lastPlay && runsScored > 0) {
      lastPlay.rbi = runsScored;
    }

    // Store last AB summary
    setLastAB({
      batterName: lastPlay?.batter_name || currentBatter?.name || '',
      outcome: outcome || '',
      pitchCount: plays.length,
      pitcherName: currentPitcher || 'Unknown',
      rbi: lastPlay?.rbi || 0,
    });

    onPlayRecorded(plays);

    const isOut = ['ground_out', 'fly_out', 'line_out', 'pop_out', 'strikeout', 'strikeout_looking', 'fielders_choice', 'sac_fly', 'sac_bunt'].includes(outcome || '');
    const isDP = outcome === 'double_play';
    const newOuts = outs + (isDP ? 2 : isOut ? 1 : 0);

    if (newOuts >= 3) {
      setOuts(0);
      setRunners({});
      // After 3 outs, switch halves
      if (currentHalf === 'bottom') {
        // Bottom just ended → advance inning, go to top
        setCurrentInning(prev => prev + 1);
        setCurrentHalf('top');
      } else {
        // Top just ended → go to bottom (same inning)
        setCurrentHalf('bottom');
      }
    } else {
      setOuts(newOuts);
      if (['single', 'walk', 'hbp', 'error', 'fielders_choice'].includes(outcome || '')) {
        setRunners(prev => ({ first: true, second: prev.first || false, third: prev.second || false }));
      } else if (outcome === 'double') {
        setRunners(prev => ({ first: false, second: true, third: prev.first || false }));
      } else if (outcome === 'triple') {
        setRunners({ first: false, second: false, third: true });
      } else if (outcome === 'home_run') {
        setRunners({});
      }
    }

    setCurrentBatterIndex(prev => prev + 1);
    setActiveAtBat(true);
  }, [outs, currentHalf, currentInning, runners, onPlayRecorded, currentPitcher, currentBatter]);

  return (
    <div className="space-y-4">
      {/* Linescore bar */}
      <LinescoreBar
        totalInnings={totalInnings}
        currentInning={currentInning}
        inningRuns={inningRuns}
        teamName={teamName}
        opponentName={opponentName}
        teamHits={totalTeamHits}
        opponentHits={totalOppHits}
        teamErrors={totalTeamErrors}
        opponentErrors={0}
      />

      {/* Video + Logging Mode */}
      {videoMode && (
        <GameVideoPlayer
          onTimestamp={(sec) => setVideoTimestamp(sec)}
        />
      )}

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
            <div className="text-2xl font-bold tabular-nums">{totalTeamRuns} - {totalOppRuns}</div>
            <div className="text-[10px] text-muted-foreground">{teamName} vs {opponentName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} />
            <Label className="text-xs">Advanced</Label>
          </div>
        </div>
      </div>

      {/* Single player: prominent pitcher input — show during player's batting half */}
      {isSinglePlayer && currentHalf === playerBattingHalf && (
        <div className="bg-muted/20 border rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Who's pitching to you?</Label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Throws:</span>
              {(['R', 'L'] as const).map(h => (
                <button key={h} type="button" onClick={() => setPitcherHand(h)}
                  className={cn('px-2 py-0.5 rounded text-[10px] font-bold border transition-all',
                    pitcherHand === h ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                  )}>{h}HP</button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Input
              value={currentPitcher}
              onChange={e => { setCurrentPitcher(e.target.value); setShowPitcherSuggestions(true); }}
              onFocus={() => setShowPitcherSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPitcherSuggestions(false), 200)}
              placeholder="Enter pitcher name"
              className="h-9 text-sm"
            />
            {showPitcherSuggestions && filteredPitcherSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-md border border-border bg-popover shadow-md max-h-32 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Recent Pitchers</div>
                {filteredPitcherSuggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                    onMouseDown={() => { setCurrentPitcher(name); setShowPitcherSuggestions(false); }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!currentPitcher.trim() && (
            <p className="text-[10px] text-muted-foreground">Enter the pitcher's name for scouting data</p>
          )}
        </div>
      )}

      {/* Last At-Bat summary */}
      {lastAB && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg border text-xs">
          <span className="font-medium">Last AB:</span>
          <span className="font-bold">{lastAB.batterName}</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded font-bold',
            ['single', 'double', 'triple', 'home_run'].includes(lastAB.outcome)
              ? 'bg-green-500/20 text-green-700 dark:text-green-300'
              : ['walk', 'hbp'].includes(lastAB.outcome)
                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                : 'bg-muted text-muted-foreground'
          )}>
            {OUTCOME_ABBREVIATIONS[lastAB.outcome] || lastAB.outcome}
          </span>
          <span className="text-muted-foreground">({lastAB.pitchCount} pitches)</span>
          <span className="text-muted-foreground">vs {lastAB.pitcherName}</span>
          {lastAB.rbi > 0 && (
            <span className="text-primary font-bold">{lastAB.rbi} RBI</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main scorebook grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-2">
              <ScrollArea className="w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1.5 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[140px]">Batter</th>
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
                      <th className="p-1 font-medium text-muted-foreground w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row) => {
                      const pStats = batterStats.find(b => b.name === row.player.name);
                      const isCurrentBatter = !row.isSubbedOut && row.slot === currentBatterIndex % activeLineup.length;
                      return (
                        <tr key={`${row.slot}-${row.player.id}`} className={cn(
                          'border-b',
                          isCurrentBatter && 'bg-primary/5',
                          row.isSubbedOut && 'opacity-50'
                        )}>
                          <td className="p-1.5 font-medium sticky left-0 bg-card z-10">
                            {!row.isSubstitute ? (
                              <span className="text-muted-foreground mr-1">{row.slot + 1}.</span>
                            ) : (
                              <span className="text-muted-foreground mr-1 ml-3">↳</span>
                            )}
                            <span className={cn(row.isSubbedOut && 'line-through text-muted-foreground')}>
                              {row.player.name}
                            </span>
                          </td>
                          <td className="p-1 text-center text-muted-foreground">{row.player.position}</td>
                          {innings.map(i => {
                            const result = getAtBatResult(row.player.name, i);
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
                          <td className="p-1 text-center">
                            {!row.isSubbedOut && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                title="Substitute player"
                                onClick={() => handleSubstitution(row.slot, row.player)}
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Active at-bat — show when it's the player's batting half */}
          {activeAtBat && currentBatter && currentHalf === playerBattingHalf && (
            <div className="mt-4">
              <AtBatPanel
                key={`${currentInning}-${currentHalf}-${currentBatterIndex}`}
                batterName={currentBatter.name}
                batterOrder={currentBatter.batting_order}
                pitcherName={currentPitcher || 'Opponent Pitcher'}
                inning={currentInning}
                half={currentHalf}
                gameId={gameId}
                sport={sport}
                advancedMode={advancedMode}
                runners={runners}
                onComplete={handleAtBatComplete}
                gameMode={gameMode}
                batterPosition={currentBatter.position}
                batterHand={batterHand}
                pitcherHand={pitcherHand}
                videoTimestamp={videoTimestamp}
              />
            </div>
          )}

          {/* Opponent's batting half */}
          {currentHalf === opponentBattingHalf && (
            <OpponentScoringPanel
              inning={currentInning}
              opponentName={opponentName}
              half={opponentBattingHalf}
              onRecordAndSwitch={handleOpponentRecordAndSwitch}
            />
          )}
        </div>

        {/* Sidebar — pitcher tracker */}
        <div className="space-y-4">
          {!isSinglePlayer && (
            <div>
              <Label className="text-xs">Current Pitcher</Label>
              <Select value={currentPitcher} onValueChange={setCurrentPitcher}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allPlayersForPitcher.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <PitcherTracker stats={currentPitcherStats} />
          <Button variant="outline" onClick={onComplete} className="w-full">
            End Game
          </Button>
        </div>
      </div>

      {/* Substitution dialog */}
      {subTarget && (
        <SubstitutionDialog
          open={subDialogOpen}
          onOpenChange={setSubDialogOpen}
          outPlayer={subTarget.player}
          activePlayerIds={activePlayerIds}
          onConfirm={confirmSubstitution}
        />
      )}
    </div>
  );
}
