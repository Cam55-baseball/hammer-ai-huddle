import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { AtBatPanel } from './AtBatPanel';
import { PitcherTracker } from './PitcherTracker';
import { DiamondVisual } from './DiamondVisual';
import { SubstitutionDialog } from './SubstitutionDialog';
import { LinescoreBar } from './LinescoreBar';
import { OpponentScoringPanel } from './OpponentScoringPanel';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';
import { cn } from '@/lib/utils';
import { ArrowRightLeft } from 'lucide-react';
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
      return 1 + totalOnBase; // batter + all runners
    case 'triple':
      return onSecond + onThird; // runners on 2nd & 3rd score
    case 'double':
      return onThird + onSecond; // runners on 2nd & 3rd score
    case 'single':
    case 'error':
      return onThird; // runner on 3rd scores
    case 'sac_fly':
      return onThird; // runner on 3rd scores
    case 'walk':
    case 'hbp':
      // Only scores if bases loaded (forced run)
      return (onFirst && onSecond && onThird) ? 1 : 0;
    case 'fielders_choice':
      return onThird; // typically runner on 3rd scores
    default:
      return 0;
  }
}

export function LiveScorebook({
  gameId, sport, totalInnings, lineup, startingPitcherName,
  onPlayRecorded, allPlays, onComplete, teamName, opponentName,
}: LiveScorebookProps) {
  const [currentInning, setCurrentInning] = useState(1);
  const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>('bottom');
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [currentPitcher, setCurrentPitcher] = useState(startingPitcherName);
  const [runners, setRunners] = useState<{ first?: boolean; second?: boolean; third?: boolean }>({});
  const [outs, setOuts] = useState(0);
  const [activeAtBat, setActiveAtBat] = useState(true);

  // Inning-by-inning run tracking: "T1", "B1", "T2", "B2", etc.
  const [inningRuns, setInningRuns] = useState<Record<string, number>>({});
  // Opponent hits/errors per inning for linescore
  const [opponentHitsPerInning, setOpponentHitsPerInning] = useState<Record<number, number>>({});
  const [teamErrorsPerInning, setTeamErrorsPerInning] = useState<Record<number, number>>({});

  // Substitution state
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

  // Derived score totals
  const totalTeamRuns = useMemo(() =>
    innings.reduce((sum, i) => sum + (inningRuns[`B${i}`] ?? 0), 0),
    [inningRuns, innings]
  );
  const totalOppRuns = useMemo(() =>
    innings.reduce((sum, i) => sum + (inningRuns[`T${i}`] ?? 0), 0),
    [inningRuns, innings]
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
      p.batter_name === batterName && p.inning === inning && p.half === 'bottom' && p.at_bat_outcome
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

  const handleOpponentRecordAndSwitch = useCallback((runs: number, hits: number, errors: number) => {
    const key = `T${currentInning}`;
    setInningRuns(prev => ({ ...prev, [key]: (prev[key] ?? 0) + runs }));
    setOpponentHitsPerInning(prev => ({ ...prev, [currentInning]: (prev[currentInning] ?? 0) + hits }));
    setTeamErrorsPerInning(prev => ({ ...prev, [currentInning]: (prev[currentInning] ?? 0) + errors }));
    setCurrentHalf('bottom');
  }, [currentInning]);

  const handleAtBatComplete = useCallback((plays: GamePlay[]) => {
    const lastPlay = plays[plays.length - 1];
    const outcome = lastPlay?.at_bat_outcome;

    // Auto-calculate runs scored from outcome + current base state
    const runsScored = calculateRunsScored(outcome, runners);

    // Update inning runs
    if (runsScored > 0) {
      const key = `B${currentInning}`;
      setInningRuns(prev => ({ ...prev, [key]: (prev[key] ?? 0) + runsScored }));
    }

    // Auto-populate RBI on the play (override whatever was manually set)
    if (lastPlay && runsScored > 0) {
      lastPlay.rbi = runsScored;
    }

    onPlayRecorded(plays);

    const isOut = ['ground_out', 'fly_out', 'line_out', 'pop_out', 'strikeout', 'strikeout_looking', 'fielders_choice', 'sac_fly', 'sac_bunt'].includes(outcome || '');
    const isDP = outcome === 'double_play';
    const newOuts = outs + (isDP ? 2 : isOut ? 1 : 0);

    if (newOuts >= 3) {
      setOuts(0);
      setRunners({});
      if (currentHalf === 'bottom') {
        setCurrentInning(prev => prev + 1);
        setCurrentHalf('top');
      } else {
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
  }, [outs, currentHalf, currentInning, runners, onPlayRecorded]);

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

          {/* Active at-bat */}
          {activeAtBat && currentBatter && currentHalf === 'bottom' && (
            <div className="mt-4">
              <AtBatPanel
                key={`${currentInning}-${currentHalf}-${currentBatterIndex}`}
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
            <OpponentScoringPanel
              inning={currentInning}
              opponentName={opponentName}
              onRecordAndSwitch={handleOpponentRecordAndSwitch}
            />
          )}
        </div>

        {/* Sidebar — pitcher tracker */}
        <div className="space-y-4">
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
