import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PitchEntry, type PitchData } from './PitchEntry';
import { SituationalPrompts } from './SituationalPrompts';
import { CatcherMetrics } from './CatcherMetrics';
import { DiamondVisual } from './DiamondVisual';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown } from 'lucide-react';
import type { GamePlay } from '@/hooks/useGameScoring';

const AT_BAT_OUTCOMES = [
  { value: 'single', label: '1B' },
  { value: 'double', label: '2B' },
  { value: 'triple', label: '3B' },
  { value: 'home_run', label: 'HR' },
  { value: 'walk', label: 'BB' },
  { value: 'strikeout', label: 'K' },
  { value: 'strikeout_looking', label: 'Kꓘ' },
  { value: 'hbp', label: 'HBP' },
  { value: 'ground_out', label: 'GO' },
  { value: 'fly_out', label: 'FO' },
  { value: 'line_out', label: 'LO' },
  { value: 'pop_out', label: 'PO' },
  { value: 'fielders_choice', label: 'FC' },
  { value: 'double_play', label: 'DP' },
  { value: 'sac_fly', label: 'SF' },
  { value: 'sac_bunt', label: 'SAC' },
  { value: 'error', label: 'E' },
];

const FIELDER_POSITIONS_BASEBALL = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const FIELDER_POSITIONS_SOFTBALL = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'FLEX'];

const SWING_DECISIONS = ['Take', 'Protect', 'Swing to Drive', 'Emergency Hack'];
const ADJUSTMENT_PRESETS = ['Sat back', 'Stayed inside', 'Loaded later', 'Opened up', 'Shortened swing', 'Two-strike approach'];
const DEFENSE_RESULTS = ['Clean Play', 'Error', 'Assist'];

interface AtBatPanelProps {
  batterName: string;
  batterOrder: number;
  pitcherName: string;
  inning: number;
  half: 'top' | 'bottom';
  gameId: string;
  sport: 'baseball' | 'softball';
  advancedMode: boolean;
  runners: { first?: boolean; second?: boolean; third?: boolean };
  batterPosition?: string;
  gameMode?: string;
  batterHand?: 'right' | 'left' | 'switch';
  pitcherHand?: 'R' | 'L';
  videoTimestamp?: number;
  onComplete: (plays: GamePlay[]) => void;
}

export function AtBatPanel({
  batterName, batterOrder, pitcherName, inning, half, gameId, sport,
  advancedMode, runners, batterPosition, gameMode, batterHand, pitcherHand, videoTimestamp, onComplete,
}: AtBatPanelProps) {
  const { user } = useAuth();
  const [pitches, setPitches] = useState<PitchData[]>([]);
  const [outcome, setOutcome] = useState('');
  const [rbi, setRbi] = useState(0);
  const [situationalData, setSituationalData] = useState<Record<string, any>>({});
  const [catcherData, setCatcherData] = useState<Record<string, any>>({});
  const [defensiveData, setDefensiveData] = useState<Record<string, any>>({});
  const [baserunningData, setBaserunningData] = useState<Record<string, any>>({});
  const [showCatcher, setShowCatcher] = useState(false);
  const [fielderPosition, setFielderPosition] = useState(batterPosition || '');
  const [opponentName, setOpponentName] = useState('');
  const [recentOpponents, setRecentOpponents] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Defense logging (standard mode)
  const [madeDefensivePlay, setMadeDefensivePlay] = useState(false);
  const [defenseResult, setDefenseResult] = useState('');

  // Elite detail (advanced mode)
  const [eliteOpen, setEliteOpen] = useState(false);
  const [swingDecision, setSwingDecision] = useState('');
  const [adjustmentTag, setAdjustmentTag] = useState('');
  const [approachNotes, setApproachNotes] = useState('');

  const isPitcher = batterPosition === 'P';
  const isSinglePlayer = gameMode === 'single_player';
  // In single player hitter mode, pitcher is set at scorebook level — no need for input here
  const showOpponentInput = isPitcher;
  const opponentType = isPitcher ? 'hitter' : 'pitcher';

  // Determine matchup context from game type
  const matchupContext = 'game';

  // Fetch recent opponents (only for pitcher facing hitters)
  useEffect(() => {
    if (!user || !showOpponentInput) return;
    supabase
      .from('game_opponents')
      .select('opponent_name')
      .eq('user_id', user.id)
      .eq('opponent_type', opponentType)
      .order('last_faced_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setRecentOpponents(data.map((d: any) => d.opponent_name));
      });
  }, [user, opponentType, showOpponentInput]);

  const filteredSuggestions = opponentName.trim()
    ? recentOpponents.filter(n => n.toLowerCase().includes(opponentName.toLowerCase()))
    : recentOpponents;

  const balls = pitches.filter(p => p.pitch_result === 'ball').length;
  const strikes = pitches.filter(p => ['called_strike', 'swinging_strike', 'foul'].includes(p.pitch_result)).length;
  const lastPitch = pitches[pitches.length - 1];
  const isInPlay = lastPitch && ['in_play_out', 'in_play_hit'].includes(lastPitch.pitch_result);
  const runnersOn = runners.first || runners.second || runners.third;

  const handlePitch = (pitch: PitchData) => {
    setPitches(prev => {
      const updated = [...prev, pitch];
      // Auto-strikeout detection
      const newStrikes = updated.filter(p => ['called_strike', 'swinging_strike', 'foul'].includes(p.pitch_result)).length;
      const newBalls = updated.filter(p => p.pitch_result === 'ball').length;
      // Count only non-foul strikes for strikeout (fouls don't count after 2 strikes)
      const swingingStrikes = updated.filter(p => p.pitch_result === 'swinging_strike').length;
      const calledStrikes = updated.filter(p => p.pitch_result === 'called_strike').length;
      const fouls = updated.filter(p => p.pitch_result === 'foul').length;
      // Actual strike count: called + swinging + min(fouls, 2 - called - swinging that got to 2)
      const realStrikes = calledStrikes + swingingStrikes + Math.min(fouls, Math.max(0, 2 - calledStrikes - swingingStrikes));

      if (calledStrikes + swingingStrikes >= 3 || (realStrikes >= 3 && (pitch.pitch_result === 'swinging_strike' || pitch.pitch_result === 'called_strike'))) {
        // Auto-set strikeout
        const isLooking = pitch.pitch_result === 'called_strike';
        setOutcome(isLooking ? 'strikeout_looking' : 'strikeout');
      } else if (newBalls >= 4) {
        setOutcome('walk');
      }
      return updated;
    });
  };

  const upsertOpponent = async (name: string, type: string) => {
    if (!user || !name.trim()) return;
    try {
      const { data: existing } = await supabase
        .from('game_opponents')
        .select('id, times_faced')
        .eq('user_id', user.id)
        .eq('opponent_name', name.trim())
        .eq('opponent_type', type)
        .maybeSingle();
      if (existing) {
        await supabase.from('game_opponents').update({
          times_faced: ((existing as any).times_faced || 0) + 1,
          last_faced_at: new Date().toISOString(),
          matchup_context: matchupContext,
        }).eq('id', (existing as any).id);
      } else {
        await supabase.from('game_opponents').insert({
          user_id: user.id,
          opponent_name: name.trim(),
          opponent_type: type,
          matchup_context: matchupContext,
        });
      }
    } catch {}
  };

  const handleFinalize = () => {
    if (!outcome) return;

    // Upsert opponent based on context
    if (showOpponentInput && opponentName.trim()) {
      upsertOpponent(opponentName, opponentType);
    }
    // In single player hitter mode, upsert the pitcher from the scorebook
    if (isSinglePlayer && !isPitcher && pitcherName && pitcherName !== 'Opponent Pitcher') {
      upsertOpponent(pitcherName, 'pitcher');
    }

    // Build elite detail + defense data
    const eliteData: Record<string, any> = {};
    if (swingDecision) eliteData.swing_decision = swingDecision;
    if (adjustmentTag) eliteData.adjustment_tag = adjustmentTag;
    if (approachNotes) eliteData.approach_notes = approachNotes;
    if (batterHand) eliteData.batter_hand = batterHand;
    if (pitcherHand) eliteData.pitcher_hand = pitcherHand;

    const defData: Record<string, any> = { ...defensiveData };
    if (madeDefensivePlay) {
      defData.made_defensive_play = true;
      defData.defense_result = defenseResult;
      defData.defense_position = fielderPosition || batterPosition;
    }

    const plays: GamePlay[] = pitches.map((p, i) => ({
      game_id: gameId,
      inning,
      half,
      batter_order: batterOrder,
      batter_name: batterName,
      pitcher_name: pitcherName,
      pitch_number: i + 1,
      pitch_type: p.pitch_type,
      pitch_velocity_mph: p.pitch_velocity_mph,
      velocity_band: p.velocity_band,
      pitch_location: p.pitch_location,
      pitch_result: p.pitch_result,
      exit_velocity_mph: p.exit_velocity_mph,
      launch_angle: p.launch_angle,
      spray_direction: p.spray_direction,
      contact_quality: p.contact_quality,
      batted_ball_type: p.batted_ball_type,
      ...(i === pitches.length - 1 ? {
        at_bat_outcome: outcome,
        rbi,
        situational_data: {
          ...situationalData,
          ...eliteData,
          opponent_name: (showOpponentInput ? opponentName.trim() : pitcherName) || undefined,
        },
        defensive_data: defData,
        catcher_data: catcherData,
        baserunning_data: baserunningData,
        ...(videoTimestamp !== undefined ? { video_start_sec: videoTimestamp } : {}),
      } : {}),
    }));
    onComplete(plays);
  };

  return (
    <div className="space-y-3">
      {/* Batter info + count + handedness badges */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{batterName}</h3>
            {batterHand && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted border border-border">
                {batterHand === 'switch' ? 'S' : batterHand === 'left' ? 'L' : 'R'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              vs {pitcherName || 'Opponent Pitcher'}
            </span>
            {pitcherHand && (
              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-muted border border-border">
                {pitcherHand}HP
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DiamondVisual runners={runners} size="sm" />
          <div className="text-center">
            <div className="text-lg font-bold tabular-nums">{balls}-{Math.min(strikes, 2)}</div>
            <div className="text-[10px] text-muted-foreground">{pitches.length} pitches</div>
          </div>
        </div>
      </div>

      {/* Opponent input — only for pitchers facing hitters */}
      {showOpponentInput && (
        <div className="relative">
          <Label className="text-xs font-medium">Facing Hitter</Label>
          <Input
            value={opponentName}
            onChange={e => { setOpponentName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Enter hitter name"
            className="h-8 text-xs mt-0.5"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 rounded-md border border-border bg-popover shadow-md max-h-32 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Recent Hitters</div>
              {filteredSuggestions.map(name => (
                <button
                  key={name}
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                  onMouseDown={() => { setOpponentName(name); setShowSuggestions(false); }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pitch sequence badges */}
      {pitches.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pitches.map((p, i) => (
            <span key={i} className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              p.pitch_result === 'ball' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' :
              ['called_strike', 'swinging_strike'].includes(p.pitch_result) ? 'bg-red-500/20 text-red-700 dark:text-red-300' :
              p.pitch_result === 'foul' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
              'bg-green-500/20 text-green-700 dark:text-green-300'
            )}>
              {i + 1}: {p.pitch_result.replace('_', ' ')}
              {p.pitch_velocity_mph ? ` ${p.pitch_velocity_mph}mph` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Pitch entry */}
      <PitchEntry
        onSubmit={handlePitch}
        advancedMode={advancedMode}
        pitchNumber={pitches.length + 1}
        sport={sport}
      />

      {/* At-bat outcome — show after first pitch */}
      {pitches.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">At-Bat Outcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3">
            <div className="grid grid-cols-6 gap-1">
              {AT_BAT_OUTCOMES.map(o => (
                <button key={o.value} type="button" onClick={() => setOutcome(o.value)}
                  className={cn(
                    'px-1 py-1.5 rounded text-xs font-bold border transition-all',
                    outcome === o.value ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                  )}
                >{o.label}</button>
              ))}
            </div>

            {/* RBI */}
            <div className="flex items-center gap-3">
              <Label className="text-xs">RBI</Label>
              <Input type="number" className="h-7 w-16 text-xs" min={0} max={4} value={rbi} onChange={e => setRbi(Number(e.target.value))} />
            </div>

            {/* Quick Defense Logging — always available after outcome selection */}
            {outcome && (
              <div className="border border-border rounded-md p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={madeDefensivePlay} onCheckedChange={setMadeDefensivePlay} />
                  <Label className="text-xs font-medium">🧤 Made a defensive play?</Label>
                </div>
                {madeDefensivePlay && (
                  <div className="space-y-2 pl-1">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Play Result</Label>
                      <div className="flex gap-1 mt-0.5">
                        {DEFENSE_RESULTS.map(r => (
                          <button key={r} type="button" onClick={() => setDefenseResult(r)}
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium border transition-all',
                              defenseResult === r ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                            )}
                          >{r}</button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Position: <span className="font-medium text-foreground">{fielderPosition || batterPosition || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced: Situational Prompts + Elite Detail — after outcome */}
            {advancedMode && outcome && (
              <>
                {/* Fielder Position selector */}
                <div>
                  <Label className="text-xs font-medium">Fielder Position</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(sport === 'softball' ? FIELDER_POSITIONS_SOFTBALL : FIELDER_POSITIONS_BASEBALL).map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setFielderPosition(pos)}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium border transition-all',
                          fielderPosition === pos ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                        )}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <SituationalPrompts
                  pitchResult={lastPitch?.pitch_result || ''}
                  runnersOn={!!runnersOn}
                  isInPlay={!!isInPlay}
                  sport={sport}
                  fielderPosition={fielderPosition || undefined}
                  onUpdate={(d) => {
                    setSituationalData(prev => ({ ...prev, ...d }));
                    setDefensiveData(prev => ({ ...prev, ...d }));
                    setBaserunningData(prev => ({ ...prev, ...d }));
                  }}
                />

                {/* Elite Detail — practice-level fields */}
                <Collapsible open={eliteOpen} onOpenChange={setEliteOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronDown className={cn('h-3 w-3 transition-transform', eliteOpen && 'rotate-180')} />
                    Elite Detail
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 border border-border rounded-md p-2">
                    {/* Swing Decision */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Swing Decision</Label>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {SWING_DECISIONS.map(sd => (
                          <button key={sd} type="button" onClick={() => setSwingDecision(sd)}
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium border transition-all',
                              swingDecision === sd ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                            )}
                          >{sd}</button>
                        ))}
                      </div>
                    </div>

                    {/* Adjustment Tag */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Adjustment Tag</Label>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {ADJUSTMENT_PRESETS.map(tag => (
                          <button key={tag} type="button" onClick={() => setAdjustmentTag(tag)}
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all',
                              adjustmentTag === tag ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                            )}
                          >{tag}</button>
                        ))}
                      </div>
                      <Input
                        value={adjustmentTag}
                        onChange={e => setAdjustmentTag(e.target.value)}
                        placeholder="Or type custom..."
                        className="h-7 text-xs mt-1"
                      />
                    </div>

                    {/* Approach Notes */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Approach Notes</Label>
                      <Textarea
                        value={approachNotes}
                        onChange={e => setApproachNotes(e.target.value)}
                        placeholder="What was the plan? What worked?"
                        className="text-xs min-h-[50px] mt-0.5"
                        rows={2}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Catcher Metrics toggle */}
                <div className="flex items-center gap-2">
                  <Switch checked={showCatcher} onCheckedChange={setShowCatcher} />
                  <Label className="text-xs">Catcher Metrics</Label>
                </div>
                {showCatcher && <CatcherMetrics onUpdate={setCatcherData} />}
              </>
            )}

            {/* Detail nudge — gentle prompt to add more data */}
            {outcome && !advancedMode && !swingDecision && !madeDefensivePlay && (
              <p className="text-[10px] text-muted-foreground italic text-center">
                💡 Tap "Advanced" for elite detail: swing decision, adjustments, & more
              </p>
            )}

            <Button onClick={handleFinalize} disabled={!outcome} size="sm" className="w-full">
              Finalize At-Bat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
