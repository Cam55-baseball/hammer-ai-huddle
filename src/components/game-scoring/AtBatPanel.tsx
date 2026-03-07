import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PitchEntry, type PitchData } from './PitchEntry';
import { SituationalPrompts } from './SituationalPrompts';
import { CatcherMetrics } from './CatcherMetrics';
import { DiamondVisual } from './DiamondVisual';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  onComplete: (plays: GamePlay[]) => void;
}

export function AtBatPanel({
  batterName, batterOrder, pitcherName, inning, half, gameId, sport,
  advancedMode, runners, batterPosition, onComplete,
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
  const [fielderPosition, setFielderPosition] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [recentOpponents, setRecentOpponents] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isPitcher = batterPosition === 'P';
  const opponentLabel = isPitcher ? 'Facing Hitter' : 'Opponent Pitcher';
  const opponentType = isPitcher ? 'hitter' : 'pitcher';

  // Fetch recent opponents
  useEffect(() => {
    if (!user) return;
    supabase
      .from('game_opponents' as any)
      .select('opponent_name')
      .eq('user_id', user.id)
      .eq('opponent_type', opponentType)
      .order('last_faced_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setRecentOpponents((data as any[]).map((d: any) => d.opponent_name));
      });
  }, [user, opponentType]);

  const filteredSuggestions = opponentName.trim()
    ? recentOpponents.filter(n => n.toLowerCase().includes(opponentName.toLowerCase()))
    : recentOpponents;
  const runnersOn = runners.first || runners.second || runners.third;

  const handlePitch = (pitch: PitchData) => {
    setPitches(prev => [...prev, pitch]);
  };

  const handleFinalize = () => {
    if (!outcome) return;
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
      // Only set outcome on last pitch
      ...(i === pitches.length - 1 ? {
        at_bat_outcome: outcome,
        rbi,
        situational_data: situationalData,
        defensive_data: defensiveData,
        catcher_data: catcherData,
        baserunning_data: baserunningData,
      } : {}),
    }));
    onComplete(plays);
  };

  return (
    <div className="space-y-3">
      {/* Batter info + count */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{batterName}</h3>
          <span className="text-xs text-muted-foreground">vs {pitcherName}</span>
        </div>
        <div className="flex items-center gap-3">
          <DiamondVisual runners={runners} size="sm" />
          <div className="text-center">
            <div className="text-lg font-bold tabular-nums">{balls}-{Math.min(strikes, 2)}</div>
            <div className="text-[10px] text-muted-foreground">{pitches.length} pitches</div>
          </div>
        </div>
      </div>

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

      {/* Advanced situational prompts */}
      {advancedMode && pitches.length > 0 && (
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
          <div className="flex items-center gap-2">
            <Switch checked={showCatcher} onCheckedChange={setShowCatcher} />
            <Label className="text-xs">Catcher Metrics</Label>
          </div>
          {showCatcher && <CatcherMetrics onUpdate={setCatcherData} />}
        </>
      )}

      {/* At-bat outcome */}
      {pitches.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">At-Bat Outcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
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
            <div className="flex items-center gap-3">
              <Label className="text-xs">RBI</Label>
              <Input type="number" className="h-7 w-16 text-xs" min={0} max={4} value={rbi} onChange={e => setRbi(Number(e.target.value))} />
            </div>
            <Button onClick={handleFinalize} disabled={!outcome} size="sm" className="w-full">
              Finalize At-Bat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
