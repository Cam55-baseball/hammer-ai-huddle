import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { PitchMovementSelector } from '@/components/micro-layer/PitchMovementSelector';
import { normalizeDirections, deriveMovementKey, type MovementKey } from '@/lib/pitchMovementProfile';
import { SideToggle } from './SideToggle';
import { SessionIntentGate } from './SessionIntentGate';
import { TeeDepthGrid } from './TeeDepthGrid';
import { REQUIRES_THROWER_HAND, REQUIRES_VELOCITY, HIDES_VELOCITY, REQUIRES_PITCH_TYPE, HIDES_PITCH_TYPE } from './RepSourceSelector';
// CatchingRepFields removed — catcher defense now handled within fielding module
import { BaserunningRepFields } from './BaserunningRepFields';
import { BuntRepFields } from './BuntRepFields';
import { ThrowingRepFields } from './ThrowingRepFields';
import { FieldingPositionSelector } from './FieldingPositionSelector';
import { FieldingThrowFields } from './FieldingThrowFields';
import { InfieldRepTypeFields, INFIELD_POSITIONS } from './InfieldRepTypeFields';
import { PlayDirectionSelector } from './PlayDirectionSelector';
import { AITextBoxField } from './AITextBoxField';
import { FieldPositionDiagram } from '@/components/game-scoring/FieldPositionDiagram';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getContextFields } from '@/data/contextAppropriatenessEngine';
import { useSportConfig } from '@/hooks/useSportConfig';
import { cn } from '@/lib/utils';
import { Trash2, Check, Zap, Settings2, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionConfig } from './SessionConfigPanel';

export interface ScoredRep {
  // Mandatory
  rep_source?: string;
  execution_score?: number;
  batter_side?: 'L' | 'R';
  pitcher_hand?: 'L' | 'R';
  throwing_hand?: 'L' | 'R';
  // Session-level (inherited)
  session_distance_ft?: number;
  session_velocity_band?: string;
  session_rep_source?: string;
  custom_rep_source?: string;
  environment?: string;
  // Per-rep overrides
  override_distance_ft?: number;
  override_velocity_band?: string;
  // Existing category-dependent
  pitch_location?: { row: number; col: number };
  contact_quality?: string;
  exit_direction?: string;
  pitch_type?: string;
  pitch_result?: string;
  swing_decision?: string;
  intent?: string;
  depth_zone?: number;
  // Advanced micro
  in_zone?: boolean;
  hit_spot?: boolean;
  batted_ball_type?: string;
  spin_direction?: string;
  swing_intent?: string;
  machine_velocity_band?: string;
  bp_distance_ft?: number;
  velocity_band?: string;
  spin_efficiency_pct?: number;
  pitch_command_grade?: number;
  throw_included?: boolean;
  footwork_grade?: number;
  exchange_time_band?: string;
  throw_accuracy?: number;
  throw_spin_quality?: string;
  // Catching + baserunning
  pop_time_band?: string;
  transfer_grade?: number;
  block_success?: boolean;
  jump_grade?: number;
  read_grade?: number;
  time_to_base_band?: string;
  // Rep context
  thrower_hand?: 'L' | 'R' | 'N';
  goal_of_rep?: string;
  actual_outcome?: string;
  // Fielding
  play_type?: string;
  fielding_result?: string;
  fielding_position?: string;
  route_efficiency?: 'poor' | 'average' | 'elite';
  play_probability?: 'routine' | 'plus' | 'elite';
  receiving_quality?: 'poor' | 'average' | 'elite';
  // Machine mode
  machine_mode?: 'single' | 'mix';
  // Throwing
  throw_distance_band?: string;
  throw_accuracy_tag?: string;
  arm_feel?: string;
  carry_grade?: number;
  // Hitting advanced
  approach_quality?: string;
  count_situation?: string;
  adjustment_tag?: string;
  // Pitching contact type
  contact_type?: string;
  // Bunting mandatory fields
  bunt_ball_state?: string;
  bunt_direction?: string;
  bunt_contact_quality?: string;
  bunt_defense_result?: string;
  bunt_hit_or_out?: string;
  bunt_type?: string;
  bunt_runner_location?: string;
  bunt_spin_type?: string;
  // Baserunning
  drill_type?: string;
  baserunning_goal?: string;
  // Throwing new fields
  self_catch_quality?: string;
  exact_throw_distance_ft?: number;
  effort_level?: string;
  exact_velocity_mph?: number;
  // Baserunning new fields
  exact_time_to_base_sec?: number;
  exact_steps_to_base?: number;
  ai_baserunning_drill_description?: string;
  // Velocity
  exact_pitch_velocity_mph?: number;
  // Video binding
  video_id?: string;
  video_start_sec?: number;
  video_end_sec?: number;
  // Structured fields
  ai_drill_description?: string;
  ai_drill_clarification?: string;
  ai_custom_rep_description?: string;
  abs_guess?: { row: number; col: number };
  pitcher_spot_intent?: { row: number; col: number };
  // Throw tracking
  throw_accuracy_direction?: 'wide_left' | 'on_target' | 'dot' | 'wide_right';
  throw_arrival_quality?: 'long_hop' | 'short_hop' | 'perfect' | 'high';
  throw_strength?: 'strong' | 'good' | 'weak';
  // Catcher-specific
  catcher_pop_time_sec?: number;
  catcher_transfer_time_sec?: number;
  catcher_throw_base?: '2B' | '3B' | '1B';
  // Infield rep type
  infield_rep_type?: string;
  infield_rep_execution?: 'incomplete' | 'complete' | 'elite';
  // Play direction
  play_direction?: 'right' | 'left' | 'back' | 'in' | 'straight_up';
  // Fielding play type
  fielding_play_type?: string;
  // Catch type
  catch_type?: 'backhand' | 'forehand' | 'underhand' | 'overhand';
  // Hit type hardness
  hit_type_hardness?: 'soft' | 'average' | 'hard';
  // Tag play quality (infielders)
  tag_play_quality?: 'elite' | 'complete' | 'incomplete';
  // Live AB hitter tracking
  live_ab_swing_result?: 'take' | 'swing_miss' | 'foul' | 'in_play';
  live_ab_ball_result?: string;
  live_ab_outcome?: string;
  // === Outfield-specific ===
  relay_play?: boolean;
  relay_hit_cutoff?: 'complete' | 'incomplete' | 'elite';
  wall_play?: boolean;
  wall_play_quality?: 'poor' | 'well' | 'elite';
  // === Infield relay ===
  relay_lineup_spot?: 'off_line' | 'lined_up';
  // === Diving play (all defensive) ===
  diving_play?: boolean;
  // === Catcher defense (fielding module) ===
  catcher_rep_type?: string;
  pop_fly_direction?: 'backstop' | '3b_side' | '1b_side' | 'pitcher_area';
  tag_completion?: 'completed' | 'missed' | 'late';
  catcher_actual_pitch_location?: { row: number; col: number };
  // === Field diagram ===
  field_diagram_player_pos?: { x: number; y: number };
  field_diagram_ball_pos?: { x: number; y: number };
  // === Hitting metrics ===
  bat_speed_mph?: number;
  // === Pitch movement direction (hitting + pitching) ===
  pitch_movement?: { directions: ('up' | 'down' | 'left' | 'right')[]; key: MovementKey };
  exit_velo_mph?: number;
  hit_distance_ft?: number;
  // === Fielding metrics ===
  glove_to_glove_sec?: number;
  throwing_velo_mph?: number;
  // Custom pitch type
  custom_pitch_type?: string;
  // Hit distance raw input
  hit_distance_raw?: string;
}

interface RepScorerProps {
  module: string;
  drillType?: string;
  reps: ScoredRep[];
  onRepsChange: (reps: ScoredRep[]) => void;
  sessionConfig?: SessionConfig;
}

const LOGGING_MODE_KEY = 'repLogMode';

const contactOptions = [
  { value: 'barrel', label: '🔥 Barrel', color: 'bg-primary/20 text-primary border-primary/30' },
  { value: 'solid', label: '💪 Solid', color: 'bg-green-500/20 text-green-700 border-green-300' },
  { value: 'flare_burner', label: '✨ Flare/Burner', color: 'bg-emerald-500/20 text-emerald-700 border-emerald-300' },
  { value: 'misshit_clip', label: '🔸 Miss-hit/Clip', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
  { value: 'weak', label: '⚠️ Weak', color: 'bg-orange-500/20 text-orange-700 border-orange-300' },
  { value: 'missed', label: '🚫 Missed', color: 'bg-slate-500/20 text-slate-700 border-slate-300' },
  { value: 'whiff', label: '❌ Whiff', color: 'bg-red-500/20 text-red-700 border-red-300' },
];

const directionOptions = [
  { value: 'pull', label: 'Pull' },
  { value: 'middle', label: 'Middle' },
  { value: 'oppo', label: 'Oppo' },
];

const pitchResultOptions = [
  { value: 'strike', label: '⚡ Strike', color: 'bg-green-500/20 text-green-700 border-green-300' },
  { value: 'ball', label: '⚾ Ball', color: 'bg-red-500/20 text-red-700 border-red-300' },
  { value: 'hit', label: '💥 Hit', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
  { value: 'out', label: '✅ Out', color: 'bg-primary/20 text-primary border-primary/30' },
];

const playTypeOptions = [
  { value: 'ground_ball', label: 'Ground Ball' },
  { value: 'fly_ball', label: 'Fly Ball' },
  { value: 'line_drive', label: 'Line Drive' },
  { value: 'bunt', label: 'Bunt' },
  { value: 'slap', label: 'Slap' },
  { value: 'pop_up', label: 'Pop Up' },
  { value: 'slow_roller', label: 'Slow Roller' },
  { value: 'one_hopper', label: 'One Hopper' },
  { value: 'chopper', label: 'Chopper' },
];

const fieldingResultOptions = [
  { value: 'clean', label: '✅ Clean' },
  { value: 'error', label: '❌ Error' },
  { value: 'assist', label: '🤝 Assist' },
];

const SelectGrid = ({ options, value, onChange, cols = 3 }: {
  options: { value: string; label: string; color?: string }[];
  value?: string;
  onChange: (v: string) => void;
  cols?: number;
}) => (
  <div className={cn('grid gap-1.5', `grid-cols-${cols}`)}>
    {options.map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={cn(
          'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
          value === opt.value
            ? (opt.color ?? 'bg-primary/20 border-primary text-primary') + ' ring-1 ring-primary'
            : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// Sources that require pitching velo to be always visible (not just advanced)
const PITCHING_ALWAYS_VELO = ['live_bp', 'game', 'flat_ground_vs_hitter'];

export function RepScorer({ module, drillType, reps, onRepsChange, sessionConfig }: RepScorerProps) {
  const { pitchTypes, machineVelocityBands, pitchingVelocityBands, bpDistanceRange, sport } = useSportConfig();

  // Commit animation state
  const [showCommitCheck, setShowCommitCheck] = useState(false);

  // Module flags
  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';
  const isFielding = module === 'fielding';
  const isCatching = false;
  const isBaserunning = module === 'baserunning';
  const isThrowing = module === 'throwing';
  const isBunting = module === 'bunting';

  // Session intent — side mode for this session (the ONLY source of truth)
  const [sideMode, setSideMode] = useState<'R' | 'L' | 'BOTH' | null>(null);

  // Switch hitter per-rep side override
  const [switchSide, setSwitchSide] = useState<'L' | 'R'>('R');
  const [switchThrowSide, setSwitchThrowSide] = useState<'L' | 'R'>('R');

  // Fielding position per-rep (defaults from session config)
  const [repFieldingPosition, setRepFieldingPosition] = useState<string | undefined>(sessionConfig?.fielding_position);

  // Logging mode
  const [mode, setMode] = useState<'quick' | 'advanced'>(() => {
    try {
      return (localStorage.getItem(LOGGING_MODE_KEY) as 'quick' | 'advanced') || 'quick';
    } catch { return 'quick'; }
  });

  useEffect(() => {
    try { localStorage.setItem(LOGGING_MODE_KEY, mode); } catch {}
  }, [mode]);

  // Current rep being built
  const [current, setCurrent] = useState<ScoredRep>({});
  const [showOverrides, setShowOverrides] = useState(false);

  // Machine mode state (1 Pitch vs Mix)
  const [machineMode, setMachineMode] = useState<'single' | 'mix'>('single');
  const [machinePitchType, setMachinePitchType] = useState<string | undefined>();
  const [machineVeloBand, setMachineVeloBand] = useState<string | undefined>();


  // Side derived from sideMode — single source of truth, no DB fallback
  const effectiveBatterSide = sideMode === 'BOTH' ? switchSide : (sideMode as 'L' | 'R' | undefined);
  const effectivePitcherHand = sideMode === 'BOTH' ? switchThrowSide : (sideMode as 'L' | 'R' | undefined);
  const effectiveThrowingHand = sideMode === 'BOTH' ? switchThrowSide : (sideMode as 'L' | 'R' | undefined);

  // Session-level defaults
  const repSource = sessionConfig?.rep_source ?? current.rep_source;
  const isTee = repSource === 'tee';
  const isMachine = repSource === 'machine_bp';

  // Context appropriateness engine
  const ctx = getContextFields(module, repFieldingPosition, sport, sessionConfig?.season_context, repSource);

  const updateField = (field: string, val: any) => {
    setCurrent(prev => ({ ...prev, [field]: val }));
  };

  // === Field validation ===
  const isDrill = repSource === 'drill';
  const isOther = repSource === 'other';

  // Catching + (drill|other) → ai_drill_description required (≥15)
  const needsCatchingAIDrillDesc = isCatching && (isDrill || isOther);
  const catchingAIDrillDescValid = !needsCatchingAIDrillDesc || (current.ai_drill_description?.length ?? 0) >= 15;

  // Non-catching + drill → ai_drill_clarification required (≥15)
  const needsDrillClarification = !isCatching && !isBaserunning && isDrill;
  const drillClarificationValid = !needsDrillClarification || (current.ai_drill_clarification?.length ?? 0) >= 15;

  // Non-catching + other → ai_custom_rep_description required (≥15)
  const needsCustomRepDesc = !isCatching && isOther;
  const customRepDescValid = !needsCustomRepDesc || (current.ai_custom_rep_description?.length ?? 0) >= 15;

  // ABS Guess: required for ALL pitching reps; optional for hitting/catching (only when pitch_location set)
  const hasPitchLocation = !!current.pitch_location;
  const needsAbsGuess = isPitching || (hasPitchLocation && (isHitting || isCatching));
  const absGuessValid = !needsAbsGuess || !!current.abs_guess;

  // Pitcher Intent: required for pitching before pitch_location can be set (optional per spec — required when pitch_location is set)
  const needsPitcherIntent = isPitching;
  const pitcherIntentValid = !needsPitcherIntent || !!current.pitcher_spot_intent;

  // Throwing: require self_catch_quality and effort_level
  const needsThrowingRequired = isThrowing;
  const throwingRequiredValid = !needsThrowingRequired || (!!current.self_catch_quality && !!current.effort_level);

  // Baserunning: drill_type required per rep
  const baserunningDrillValid = !isBaserunning || !!current.drill_type;

  // Validation
  const execScore = current.execution_score;
  const hasRepSource = !!repSource;
  const needsDepthZone = isTee && isHitting;
  const needsFieldingPosition = isFielding && !repFieldingPosition;
  const contactQualityValid = !isHitting || current.contact_quality != null;

  // Module-specific mandatory validations
  const buntMandatoryValid = !isBunting || (!!current.bunt_ball_state && !!current.bunt_direction && !!current.bunt_contact_quality);
  const pitchLocationValid = !isPitching || !!current.pitch_location;
  const fieldingMandatoryValid = !isFielding || (!!current.play_type && !!current.catch_type && !!current.fielding_result);
  const needsExecScore = !isFielding;

  const canConfirm = hasRepSource && (!needsExecScore || (execScore != null && execScore >= 1))
    && (!needsDepthZone || current.depth_zone != null)
    && !needsFieldingPosition
    && catchingAIDrillDescValid
    && drillClarificationValid
    && customRepDescValid
    && absGuessValid
    && pitcherIntentValid
    && throwingRequiredValid
    && baserunningDrillValid
    && contactQualityValid
    && buntMandatoryValid
    && pitchLocationValid
    && fieldingMandatoryValid
    ;

  const needsThrowerHand = repSource && REQUIRES_THROWER_HAND.includes(repSource);
  const needsVelocity = repSource && REQUIRES_VELOCITY.includes(repSource);
  const hidesVelocity = repSource && HIDES_VELOCITY.includes(repSource);
  const needsPitchType = repSource && REQUIRES_PITCH_TYPE.includes(repSource);
  const hidesPitchType = repSource && HIDES_PITCH_TYPE.includes(repSource);

  // For machine in single mode, apply pre-set values to every rep
  const commitRep = useCallback(() => {
    if (!canConfirm) return;
    const rep: ScoredRep = {
      ...current,
      rep_source: repSource,
      session_distance_ft: sessionConfig?.pitch_distance_ft,
      session_velocity_band: sessionConfig?.velocity_band,
      session_rep_source: sessionConfig?.rep_source,
      custom_rep_source: sessionConfig?.custom_rep_source,
      environment: sessionConfig?.environment,
      ...((isHitting || isBunting) && { batter_side: effectiveBatterSide }),
      ...(isPitching && { pitcher_hand: effectivePitcherHand }),
      ...((isFielding || isCatching) && { throwing_hand: effectiveThrowingHand }),
      ...(isThrowing && { throwing_hand: effectiveThrowingHand }),
      ...(isFielding && { fielding_position: repFieldingPosition }),
      // Apply machine single-mode presets
      ...(isHitting && isMachine && machineMode === 'single' && {
        pitch_type: machinePitchType,
        velocity_band: machineVeloBand,
        machine_mode: 'single' as const,
      }),
      ...(isHitting && isMachine && machineMode === 'mix' && {
        machine_mode: 'mix' as const,
      }),
      ...((isHitting || isPitching) && {
        pitch_movement: current.pitch_movement ?? {
          directions: [],
          key: deriveMovementKey([]),
        },
      }),
    };
    onRepsChange([...reps, rep]);
    // Show commit animation
    setShowCommitCheck(true);
    setTimeout(() => setShowCommitCheck(false), 700);
    // Reset current but keep execution_score for speed
    setCurrent({ execution_score: current.execution_score });
    setShowOverrides(false);
  }, [current, effectiveBatterSide, effectivePitcherHand, effectiveThrowingHand, canConfirm, reps, onRepsChange, isHitting, isPitching, isFielding, isCatching, isThrowing, isBunting, repSource, sessionConfig, isMachine, machineMode, machinePitchType, machineVeloBand, repFieldingPosition]);

  const removeRep = useCallback((index: number) => {
    onRepsChange(reps.filter((_, i) => i !== index));
  }, [reps, onRepsChange]);

  // Session intent gate — shown once at start for ALL modules except baserunning
  if (!isBaserunning && sideMode === null) {
    return (
      <SessionIntentGate
        module={module}
        onSelect={(mode) => {
          setSideMode(mode);
          if (mode !== 'BOTH') {
            if (isHitting || isBunting) setSwitchSide(mode as 'L' | 'R');
            else setSwitchThrowSide(mode as 'L' | 'R');
          }
        }}
      />
    );
  }

  // Whether the pitcher intent grid should be locked (after pitch location is logged)
  const pitcherIntentLocked = isPitching && !!current.pitch_location;

  return (
    <div className="space-y-3">
      {/* Rep feed */}
      <AnimatePresence>
        {reps.length > 0 && (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {reps.map((rep, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="group"
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer h-8 gap-1 transition-all group-hover:bg-destructive/20"
                  onClick={() => removeRep(i)}
                >
                  <span className="text-xs font-medium">#{i + 1}</span>
                  {rep.contact_quality && <span className="text-xs">{rep.contact_quality}</span>}
                  {rep.pitch_result && <span className="text-xs">{rep.pitch_result}</span>}
                  {rep.execution_score && <span className="text-xs opacity-60">E{rep.execution_score}</span>}
                  <Trash2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-destructive" />
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Mode toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {mode === 'quick' ? <Zap className="h-3.5 w-3.5 text-amber-500" /> : <Settings2 className="h-3.5 w-3.5 text-primary" />}
          <span className="text-xs font-medium">{mode === 'quick' ? 'Quick Log' : 'Advanced'}</span>
        </div>
        <Switch
          checked={mode === 'advanced'}
          onCheckedChange={(v) => setMode(v ? 'advanced' : 'quick')}
        />
      </div>

      {/* Inline side toggle — only when session mode is BOTH */}
      {(isHitting || isBunting) && sideMode === 'BOTH' && (
        <SideToggle value={switchSide} onChange={setSwitchSide} label="Batting Side" />
      )}
      {(isPitching || isFielding || isThrowing) && sideMode === 'BOTH' && (
        <SideToggle value={switchThrowSide} onChange={setSwitchThrowSide} label="Throwing Hand" />
      )}

      {isHitting && isMachine && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Machine Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMachineMode('single')}
                className={cn(
                  'rounded-md border p-2.5 text-xs font-medium transition-all text-center',
                  machineMode === 'single'
                    ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                    : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                )}
              >
                🎯 1 Pitch
              </button>
              <button
                type="button"
                onClick={() => setMachineMode('mix')}
                className={cn(
                  'rounded-md border p-2.5 text-xs font-medium transition-all text-center',
                  machineMode === 'mix'
                    ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                    : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                )}
              >
                🔀 Mix
              </button>
            </div>
          </div>

          {/* 1 Pitch pre-set fields (session-level, applied to all reps) */}
          {machineMode === 'single' && (
            <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[10px] text-muted-foreground">Pre-set pitch type & velocity — applied to all reps</p>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Pitch Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {pitchTypes.map(pt => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setMachinePitchType(pt.id)}
                      className={cn(
                        'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                        machinePitchType === pt.id
                          ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      {pt.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMachinePitchType('preset_pattern')}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                      machinePitchType === 'preset_pattern'
                        ? 'bg-accent border-accent-foreground/30 text-accent-foreground ring-1 ring-accent'
                        : 'bg-muted/30 border-border hover:bg-muted'
                    )}
                  >
                    🔄 Preset
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Velocity Band</Label>
                <div className="flex flex-wrap gap-1.5">
                  {machineVelocityBands.map((vb: { value: string; label: string }) => (
                    <button
                      key={vb.value}
                      type="button"
                      onClick={() => setMachineVeloBand(machineVeloBand === vb.value ? undefined : vb.value)}
                      className={cn(
                        'rounded-md border px-2 py-1 text-[11px] font-medium transition-all',
                        machineVeloBand === vb.value
                          ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {vb.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current rep input */}
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Rep #{reps.length + 1}
            </p>
            {reps.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {reps.length} reps logged
              </Badge>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Rep will be recorded manually once you confirm all required fields.
          </p>

          {/* === DRILL / CUSTOM FIELDS (per-rep, directly under rep source context) === */}
          {needsCatchingAIDrillDesc && (
            <AITextBoxField
              label="Drill Description"
              value={current.ai_drill_description ?? ''}
              onChange={v => updateField('ai_drill_description', v)}
              minChars={15}
              required
              placeholder="Describe the drill (min 15 characters)..."
            />
          )}
          {needsDrillClarification && (
            <AITextBoxField
              label="Drill Clarification"
              value={current.ai_drill_clarification ?? ''}
              onChange={v => updateField('ai_drill_clarification', v)}
              minChars={15}
              required
              placeholder="Clarify the drill (min 15 characters)..."
            />
          )}
          {needsCustomRepDesc && (
            <AITextBoxField
              label="Custom Rep Description"
              value={current.ai_custom_rep_description ?? ''}
              onChange={v => updateField('ai_custom_rep_description', v)}
              minChars={15}
              required
              placeholder="Describe this custom rep source (min 15 characters)..."
            />
          )}

          {/* Mandatory: Execution Score — number line (hidden for fielding) */}
          {!isFielding && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Execution Score <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-0 overflow-x-auto py-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n, i, arr) => (
                <div key={n} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => updateField('execution_score', n)}
                    className="relative flex flex-col items-center gap-0.5 group"
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center text-[9px] font-bold',
                      current.execution_score === n
                        ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-md'
                        : (current.execution_score ?? 0) > n
                          ? 'bg-primary/30 border-primary/50 text-primary'
                          : 'bg-muted border-border text-muted-foreground group-hover:border-primary/50'
                    )}>
                      {n}
                    </div>
                  </button>
                  {i < arr.length - 1 && (
                    <div className={cn(
                      'h-0.5 w-2 sm:w-3 mx-px',
                      (current.execution_score ?? 0) > n ? 'bg-primary/40' : 'bg-border'
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Pitcher hand (hitting) / Batter side (pitching) sub-field — non-machine */}
          {needsThrowerHand && !isMachine && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                {isPitching ? 'Batter Side (L/R)' : 'Pitcher Hand (L/R)'} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(['L', 'R'] as const).map(h => {
                  const selected = isPitching ? current.batter_side === h : current.thrower_hand === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        if (isPitching) {
                          updateField('batter_side', h);
                        } else {
                          updateField('thrower_hand', h);
                          updateField('pitcher_hand', h);
                        }
                      }}
                      className={cn(
                        'rounded-md border p-2 text-xs font-medium transition-all',
                        selected
                          ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      {h === 'L' ? 'Left' : 'Right'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Machine throwing hand: RH / LH / Neutral */}
          {isHitting && isMachine && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Machine Throwing Hand</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'R' as const, label: 'RH' },
                  { value: 'L' as const, label: 'LH' },
                  { value: 'N' as const, label: 'Neutral' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('thrower_hand', opt.value)}
                    className={cn(
                      'rounded-md border p-2 text-xs font-medium transition-all',
                      current.thrower_hand === opt.value
                        ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                        : 'bg-muted/30 border-border hover:bg-muted'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Per-rep override section */}
          <button
            type="button"
            onClick={() => setShowOverrides(!showOverrides)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOverrides ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Override session defaults
          </button>
          {showOverrides && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
              {(isHitting || isPitching) && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Override Distance: {current.override_distance_ft ?? 'Session default'} ft
                  </Label>
                  <Slider
                    min={15} max={80} step={1}
                    value={[current.override_distance_ft ?? sessionConfig?.pitch_distance_ft ?? 60]}
                    onValueChange={([v]) => updateField('override_distance_ft', v)}
                  />
                </div>
              )}
              {(isHitting || isPitching) && !hidesVelocity && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Override Velocity Band</Label>
                  <SelectGrid
                    options={isHitting ? machineVelocityBands : pitchingVelocityBands}
                    value={current.override_velocity_band}
                    onChange={v => updateField('override_velocity_band', v)}
                    cols={4}
                  />
                </div>
              )}
            </div>
          )}

          {/* ===== HITTING FIELDS ===== */}
          {isHitting && (
            <>
              {/* Pitch Type for hitting — hidden when machine is in "single" mode (pre-set above) */}
              {!hidesPitchType && needsPitchType && !(isMachine && machineMode === 'single') && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Pitch Type <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {pitchTypes.map(pt => (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => updateField('pitch_type', pt.id)}
                        className={cn(
                          'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                          current.pitch_type === pt.id
                            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                            : 'bg-muted/30 border-border hover:bg-muted'
                        )}
                      >
                        {pt.name}
                      </button>
                    ))}
                    {repSource === 'machine_bp' && (
                      <button
                        type="button"
                        onClick={() => updateField('pitch_type', 'preset_pattern')}
                        className={cn(
                          'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                          current.pitch_type === 'preset_pattern'
                            ? 'bg-accent border-accent-foreground/30 text-accent-foreground ring-1 ring-accent'
                            : 'bg-muted/30 border-border hover:bg-muted'
                        )}
                      >
                        🔄 Preset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => updateField('pitch_type', 'custom')}
                      className={cn(
                        'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                        current.pitch_type === 'custom'
                          ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      ✏️ Custom
                    </button>
                  </div>
                  {current.pitch_type === 'custom' && (
                    <Input
                      value={current.custom_pitch_type ?? ''}
                      onChange={e => updateField('custom_pitch_type', e.target.value)}
                      placeholder="Enter custom pitch type..."
                      className="mt-2 h-8 text-xs"
                    />
                  )}
                </div>
              )}

              {/* Per-rep velocity band for machine Mix mode */}
              {isMachine && machineMode === 'mix' && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Velocity Band</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {machineVelocityBands.map((vb: { value: string; label: string }) => (
                      <button
                        key={vb.value}
                        type="button"
                        onClick={() => updateField('velocity_band', current.velocity_band === vb.value ? undefined : vb.value)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[11px] font-medium transition-all',
                          current.velocity_band === vb.value
                            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                            : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {vb.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Exact Pitch Velocity (MPH) — hitting competitive contexts */}
              {isHitting && repSource && ['live_bp', 'live_abs', 'game'].includes(repSource) && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Exact Pitch Velocity (MPH)</Label>
                  <Input
                    type="number"
                    placeholder="Optional — overrides velocity band"
                    value={current.exact_pitch_velocity_mph ?? ''}
                    onChange={e => updateField('exact_pitch_velocity_mph', e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-xs"
                    min={0}
                    step="any"
                  />
                </div>
              )}

              {isTee && (
                <div className="flex justify-center">
                  <TeeDepthGrid
                    value={current.depth_zone}
                    onChange={v => updateField('depth_zone', v)}
                    sport={sport as 'baseball' | 'softball'}
                    batterSide={effectiveBatterSide}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1">
                  <PitchLocationGrid
                    value={current.pitch_location}
                    onSelect={v => updateField('pitch_location', v)}
                    batterSide={effectiveBatterSide}
                    sport={sport as 'baseball' | 'softball'}
                  />
                </div>
              </div>

              {/* ABS Guess — required after pitch location is logged (Hitting) */}
              {hasPitchLocation && isHitting && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    ABS Guess (Select 5×5 Zone) <span className="text-destructive">*</span>
                  </Label>
                  <PitchLocationGrid
                    value={current.abs_guess}
                    onSelect={v => updateField('abs_guess', v)}
                    batterSide={effectiveBatterSide}
                    sport={sport as 'baseball' | 'softball'}
                  />
                </div>
              )}

              {/* Movement Direction (arrow grid) — always visible for hitting */}
              <div>
                <PitchMovementSelector
                  value={current.pitch_movement?.directions ?? []}
                  onChange={(v) =>
                    updateField('pitch_movement', {
                      directions: normalizeDirections(v),
                      key: deriveMovementKey(v),
                    })
                  }
                />
              </div>

              {/* Swing Decision - always visible (most valuable self-assessment) */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Swing Decision</Label>
                <SelectGrid
                  options={[
                    { value: 'best_a_swing', label: '🔥 Best A-Swing', color: 'bg-green-500/20 text-green-700 border-green-300' },
                    { value: 'swung', label: '🏏 Swung', color: 'bg-blue-500/20 text-blue-700 border-blue-300' },
                    { value: 'good_take', label: '✅ Good Take', color: 'bg-primary/20 text-primary border-primary/30' },
                    { value: 'should_have_swung', label: '😤 Should\'ve Swung', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
                    { value: 'chased', label: '❌ Chased', color: 'bg-red-500/20 text-red-700 border-red-300' },
                    { value: 'bunt', label: '🤲 Bunt', color: 'bg-cyan-500/20 text-cyan-700 border-cyan-300' },
                    ...(sport === 'softball' ? [{ value: 'slap', label: '👋 Slap', color: 'bg-violet-500/20 text-violet-700 border-violet-300' }] : []),
                  ]}
                  value={current.swing_decision}
                  onChange={v => updateField('swing_decision', v)}
                  cols={5}
                />
              </div>

              {/* Hit Distance — always visible for hitting */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Distance (ft)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 350, >400, 400+"
                  value={current.hit_distance_raw ?? (current.hit_distance_ft != null ? String(current.hit_distance_ft) : '')}
                  onChange={e => {
                    const raw = e.target.value;
                    updateField('hit_distance_raw', raw || undefined);
                    const cleaned = raw.replace(/[>+]/g, '').trim();
                    const num = parseFloat(cleaned);
                    updateField('hit_distance_ft', !isNaN(num) && num > 0 ? num : undefined);
                  }}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Enter exact or use &gt;, + (e.g. &gt;400 or 400+)</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Contact Quality <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {contactOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('contact_quality', opt.value)}
                      className={cn(
                        'rounded-md border p-2 text-center text-[10px] font-medium transition-all',
                        current.contact_quality === opt.value
                          ? opt.color + ' ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'advanced' && (
                <>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Exit Direction</Label>
                    <SelectGrid options={directionOptions} value={current.exit_direction} onChange={v => updateField('exit_direction', v)} />
                  </div>

                  {/* Hitting Metrics: Bat Speed, Exit Velo */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Bat Speed (mph)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 68"
                        value={current.bat_speed_mph ?? ''}
                        onChange={e => updateField('bat_speed_mph', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Exit Velo (mph)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 92"
                        value={current.exit_velo_mph ?? ''}
                        onChange={e => updateField('exit_velo_mph', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Swing Intent</Label>
                    <SelectGrid
                      options={[
                        { value: 'mechanical', label: 'Mech' },
                        { value: 'game_intent', label: 'Game' },
                        { value: 'situational', label: 'Situ' },
                        { value: 'hr_derby', label: 'HR' },
                      ]}
                      value={current.swing_intent}
                      onChange={v => updateField('swing_intent', v)}
                      cols={4}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Batted Ball Type</Label>
                    <SelectGrid
                      options={[
                        { value: 'ground', label: 'Ground' },
                        { value: 'line', label: 'Line' },
                        { value: 'fly', label: 'Fly' },
                        ...(sport === 'softball' ? [{ value: 'slap', label: 'Slap' }] : []),
                        { value: 'one_hopper', label: 'One Hopper' },
                      ]}
                      value={current.batted_ball_type}
                      onChange={v => updateField('batted_ball_type', v)}
                      cols={4}
                    />
                  </div>

                  {/* Spin Direction — restored for hitting (hitter contact analytics) */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Spin Direction</Label>
                    <SelectGrid
                      options={[
                        { value: 'topspin', label: 'Topspin' },
                        { value: 'backspin', label: 'Backspin' },
                        { value: 'knuckle', label: 'Knuckle' },
                        { value: 'backspin_tail', label: 'Backspin Tail' },
                      ]}
                      value={current.spin_direction}
                      onChange={v => updateField('spin_direction', v)}
                      cols={4}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Approach Quality</Label>
                    <SelectGrid
                      options={[
                        { value: 'patient', label: 'Patient' },
                        { value: 'aggressive', label: 'Aggressive' },
                        { value: 'neutral', label: 'Neutral' },
                      ]}
                      value={current.approach_quality}
                      onChange={v => updateField('approach_quality', v)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Count Situation</Label>
                    <SelectGrid
                      options={[
                        { value: 'first_pitch', label: '1st Pitch' },
                        { value: 'ahead', label: 'Ahead' },
                        { value: 'even', label: 'Even' },
                        { value: 'behind', label: 'Behind' },
                      ]}
                      value={current.count_situation}
                      onChange={v => updateField('count_situation', v)}
                      cols={4}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Adjustment Tag</Label>
                    <SelectGrid
                      options={[
                        { value: 'stayed_back', label: 'Stayed Back' },
                        { value: 'got_on_top', label: 'Got On Top' },
                        { value: 'shortened_up', label: 'Shortened' },
                        { value: 'extended', label: 'Extended' },
                        { value: 'none', label: 'None' },
                      ]}
                      value={current.adjustment_tag}
                      onChange={v => updateField('adjustment_tag', v)}
                      cols={3}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== PITCHING FIELDS ===== */}
          {isPitching && (
            <>
              {(needsPitchType || mode === 'advanced') && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Pitch Type {needsPitchType && <span className="text-destructive">*</span>}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {pitchTypes.map(pt => (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => updateField('pitch_type', pt.id)}
                        className={cn(
                          'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                          current.pitch_type === pt.id
                            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                            : 'bg-muted/30 border-border hover:bg-muted'
                        )}
                      >
                        {pt.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateField('pitch_type', 'custom')}
                      className={cn(
                        'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                        current.pitch_type === 'custom'
                          ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      ✏️ Custom
                    </button>
                  </div>
                  {current.pitch_type === 'custom' && (
                    <Input
                      value={current.custom_pitch_type ?? ''}
                      onChange={e => updateField('custom_pitch_type', e.target.value)}
                      placeholder="Enter custom pitch type..."
                      className="mt-2 h-8 text-xs"
                    />
                  )}
                </div>
              )}

              {/* Hitter Side for live pitching reps — advanced only */}
              {mode === 'advanced' && ['live_bp', 'game', 'flat_ground_vs_hitter', 'bullpen_vs_hitter', 'sim_game'].includes(repSource) && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Hitter Side (L/R)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['L', 'R'] as const).map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => updateField('batter_side', h)}
                        className={cn(
                          'rounded-md border p-2 text-xs font-medium transition-all',
                          current.batter_side === h
                            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                            : 'bg-muted/30 border-border hover:bg-muted'
                        )}
                      >
                        {h === 'L' ? 'Left' : 'Right'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-rep velocity band — advanced only */}
              {mode === 'advanced' && !hidesVelocity && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Velocity Band</Label>
                  <SelectGrid
                    options={pitchingVelocityBands}
                    value={current.velocity_band}
                    onChange={v => updateField('velocity_band', v)}
                    cols={4}
                  />
                </div>
              )}

              {/* Exact Pitch Velocity (MPH) — advanced only */}
              {mode === 'advanced' && !hidesVelocity && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Exact Pitch Velocity (MPH)</Label>
                  <Input
                    type="number"
                    placeholder="Optional — overrides velocity band"
                    value={current.exact_pitch_velocity_mph ?? ''}
                    onChange={e => updateField('exact_pitch_velocity_mph', e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-xs"
                    min={0}
                    step="any"
                  />
                </div>
              )}

              {/* Pitcher Spot Intent — BEFORE pitch location, required for pitching */}
              <div className={cn(pitcherIntentLocked && 'pointer-events-none opacity-60')}>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Pitcher Spot Intent (Pre-Pitch Target) <span className="text-destructive">*</span>
                  {pitcherIntentLocked && <span className="ml-1 text-[10px] text-muted-foreground">(locked)</span>}
                </Label>
                <PitchLocationGrid
                  value={current.pitcher_spot_intent}
                  onSelect={v => updateField('pitcher_spot_intent', v)}
                  batterSide={(current.batter_side as 'L' | 'R') || 'R'}
                  sport={sport as 'baseball' | 'softball'}
                />
              </div>

              {/* Actual Pitch Location — only shown after intent is set */}
              {current.pitcher_spot_intent && (
                <PitchLocationGrid
                  value={current.pitch_location}
                  onSelect={v => updateField('pitch_location', v)}
                  batterSide={(current.batter_side as 'L' | 'R') || 'R'}
                  sport={sport as 'baseball' | 'softball'}
                />
              )}

              {/* ABS Guess — mandatory for pitching (Quick Log) */}
              {isPitching && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    ABS Guess (Select 5×5 Zone) <span className="text-destructive">*</span>
                  </Label>
                  <PitchLocationGrid
                    value={current.abs_guess}
                    onSelect={v => updateField('abs_guess', v)}
                    batterSide={(current.batter_side as 'L' | 'R') || 'R'}
                    sport={sport as 'baseball' | 'softball'}
                  />
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Result</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {pitchResultOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('pitch_result', opt.value)}
                      className={cn(
                        'rounded-md border p-2 text-center text-[10px] font-medium transition-all',
                        current.pitch_result === opt.value
                          ? opt.color + ' ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Type — advanced only */}
              {mode === 'advanced' && ctx.showContactType && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Contact Type</Label>
                  <SelectGrid
                    options={[
                      { value: 'swing_miss', label: 'Swing & Miss', color: 'bg-green-500/20 text-green-700 border-green-300' },
                      { value: 'foul', label: 'Foul', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
                      { value: 'weak_contact', label: 'Weak Contact', color: 'bg-orange-500/20 text-orange-700 border-orange-300' },
                      { value: 'hard_contact', label: 'Hard Contact', color: 'bg-red-500/20 text-red-700 border-red-300' },
                    ]}
                    value={current.contact_type}
                    onChange={v => updateField('contact_type', v)}
                    cols={4}
                  />
                </div>
              )}

              {/* Live AB Hitter Tracking — advanced only */}
              {mode === 'advanced' && ctx.showLiveAbHitterFields && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Swing Result</Label>
                    <SelectGrid
                      options={[
                        { value: 'take', label: 'Take' },
                        { value: 'swing_miss', label: 'Swing & Miss' },
                        { value: 'foul', label: 'Foul' },
                        { value: 'in_play', label: 'In Play' },
                        { value: 'bunt', label: 'Bunt' },
                      ]}
                      value={current.live_ab_swing_result}
                      onChange={v => updateField('live_ab_swing_result', v)}
                      cols={4}
                    />
                  </div>

                  {current.live_ab_swing_result === 'in_play' && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Ball In Play Result</Label>
                      <SelectGrid
                        options={[
                          { value: 'single', label: 'Single' },
                          { value: 'double', label: 'Double' },
                          { value: 'triple', label: 'Triple' },
                          { value: 'hr', label: 'HR' },
                          { value: 'out', label: 'Out' },
                          { value: 'fc', label: 'FC' },
                          { value: 'error', label: 'Error' },
                        ]}
                        value={current.live_ab_ball_result}
                        onChange={v => updateField('live_ab_ball_result', v)}
                        cols={4}
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">At-Bat Outcome</Label>
                    <SelectGrid
                      options={[
                        { value: 'strikeout', label: 'Strikeout' },
                        { value: 'walk', label: 'Walk' },
                        { value: 'hbp', label: 'HBP' },
                        { value: 'in_play', label: 'In Play' },
                      ]}
                      value={current.live_ab_outcome}
                      onChange={v => updateField('live_ab_outcome', v)}
                      cols={4}
                    />
                  </div>
                </>
              )}

              {/* ===== PITCHER HITTER OUTCOME DETAILS — advanced only ===== */}
              {mode === 'advanced' && ctx.showPitcherHitterOutcomes && (
                <div className="space-y-3 p-3 rounded-lg border border-accent/30 bg-accent/5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hitter Outcome Details</p>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Swing Decision</Label>
                    <SelectGrid
                      options={[
                        { value: 'correct', label: '✅ Correct' },
                        { value: 'incorrect', label: '❌ Incorrect' },
                      ]}
                      value={current.swing_decision}
                      onChange={v => updateField('swing_decision', v)}
                      cols={2}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Contact Quality</Label>
                    <SelectGrid
                      options={contactOptions}
                      value={current.contact_quality}
                      onChange={v => updateField('contact_quality', v)}
                      cols={3}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Exit Direction</Label>
                    <SelectGrid
                      options={[
                        { value: 'pull', label: 'Pull' },
                        { value: 'middle', label: 'Middle' },
                        { value: 'oppo', label: 'Oppo' },
                        { value: 'slap_side', label: 'Slap Side' },
                      ]}
                      value={current.exit_direction}
                      onChange={v => updateField('exit_direction', v)}
                      cols={4}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Batted Ball Type</Label>
                    <SelectGrid
                      options={[
                        { value: 'ground', label: 'Ground' },
                        { value: 'line', label: 'Line' },
                        { value: 'fly', label: 'Fly' },
                        ...(sport === 'softball' ? [{ value: 'slap', label: 'Slap' }] : []),
                        { value: 'one_hopper', label: 'One Hopper' },
                      ]}
                      value={current.batted_ball_type}
                      onChange={v => updateField('batted_ball_type', v)}
                      cols={3}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Spin Direction</Label>
                    <SelectGrid
                      options={[
                        { value: 'topspin', label: 'Topspin' },
                        { value: 'backspin', label: 'Backspin' },
                        { value: 'knuckle', label: 'Knuckle' },
                        { value: 'backspin_tail', label: 'Backspin Tail' },
                      ]}
                      value={current.spin_direction}
                      onChange={v => updateField('spin_direction', v)}
                      cols={4}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Adjustment Tag</Label>
                    <SelectGrid
                      options={[
                        { value: 'stayed_back', label: 'Stayed Back' },
                        { value: 'got_on_top', label: 'Got On Top' },
                        { value: 'shortened_up', label: 'Shortened' },
                        { value: 'extended', label: 'Extended' },
                        { value: 'none', label: 'None' },
                      ]}
                      value={current.adjustment_tag}
                      onChange={v => updateField('adjustment_tag', v)}
                      cols={3}
                    />
                  </div>
                </div>
              )}

              {mode === 'advanced' && (
              <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Hit Spot?</Label>
                <SelectGrid
                  options={[
                    { value: 'yes', label: '✅ Yes', color: 'bg-green-500/20 text-green-700 border-green-300' },
                    { value: 'no', label: '❌ No', color: 'bg-red-500/20 text-red-700 border-red-300' },
                  ]}
                  value={current.hit_spot ? 'yes' : current.hit_spot === false ? 'no' : undefined}
                  onChange={v => updateField('hit_spot', v === 'yes')}
                  cols={2}
                />
              </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Pitch Command: {current.pitch_command_grade ?? 50}
                    </Label>
                    <Slider
                      min={20} max={80} step={5}
                      value={[current.pitch_command_grade ?? 50]}
                      onValueChange={([v]) => updateField('pitch_command_grade', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">In Zone?</Label>
                    <Switch
                      checked={current.in_zone ?? false}
                      onCheckedChange={v => updateField('in_zone', v)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Spin Direction</Label>
                    <SelectGrid
                      options={[
                        { value: 'topspin', label: 'Topspin' },
                        { value: 'backspin', label: 'Backspin' },
                        { value: 'knuckle', label: 'Knuckle' },
                        { value: 'backspin_tail', label: 'Backspin Tail' },
                      ]}
                      value={current.spin_direction}
                      onChange={v => updateField('spin_direction', v)}
                      cols={4}
                    />
                  </div>
              </>
              )}
            </>
          )}

          {/* ===== Movement Direction (pitching only — hitting renders inside its own block above) ===== */}
          {isPitching && (
            <div>
              <PitchMovementSelector
                value={current.pitch_movement?.directions ?? []}
                onChange={(v) =>
                  updateField('pitch_movement', {
                    directions: normalizeDirections(v),
                    key: deriveMovementKey(v),
                  })
                }
              />
            </div>
          )}

          {/* ===== FIELDING FIELDS ===== */}
          {isFielding && (
            <>
              <FieldingPositionSelector
                value={repFieldingPosition}
                onChange={setRepFieldingPosition}
                label="Position"
                required
              />

              {/* Hit Type Hardness moved to advanced section below */}

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Batted Ball Type <span className="text-destructive">*</span></Label>
                <SelectGrid
                  options={playTypeOptions}
                  value={current.play_type}
                  onChange={v => updateField('play_type', v)}
                  cols={3}
                />
              </div>

              {/* Catch Type — mandatory */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Catch Type <span className="text-destructive">*</span></Label>
                <SelectGrid
                  options={[
                    { value: 'backhand', label: '🤚 Backhand' },
                    { value: 'forehand', label: '✋ Forehand' },
                    { value: 'underhand', label: '⬇️ Underhand' },
                    { value: 'overhand', label: '⬆️ Overhand' },
                  ]}
                  value={current.catch_type}
                  onChange={v => updateField('catch_type', v)}
                  cols={4}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Fielding Result <span className="text-destructive">*</span></Label>
                <SelectGrid
                  options={fieldingResultOptions}
                  value={current.fielding_result}
                  onChange={v => updateField('fielding_result', v)}
                />
              </div>

              {/* === ADVANCED FIELDING FIELDS === */}
              {mode === 'advanced' && (
              <>

              {/* Hit Type Hardness — was above, now advanced */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Exit Velocity</Label>
                <SelectGrid
                  options={[
                    { value: 'soft', label: '🟢 Soft' },
                    { value: 'average', label: '🟡 Average' },
                    { value: 'hard', label: '🔴 Hard' },
                  ]}
                  value={current.hit_type_hardness}
                  onChange={v => updateField('hit_type_hardness', v)}
                />
              </div>

              {/* Diving Play — all defensive positions */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Diving Play</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[{ value: true, label: '✅ Yes' }, { value: false, label: '❌ No' }].map(opt => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => updateField('diving_play', opt.value)}
                      className={cn(
                        'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
                        current.diving_play === opt.value
                          ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Route Efficiency</Label>
                <SelectGrid
                   options={[
                     { value: 'poor', label: '❌ Poor' },
                     { value: 'average', label: '🟡 Average' },
                     { value: 'elite', label: '👑 Elite' },
                   ]}
                  value={current.route_efficiency}
                  onChange={v => updateField('route_efficiency', v)}
                />
              </div>

              {/* Glove-to-Glove Time — infielders */}
              {repFieldingPosition && INFIELD_POSITIONS.includes(repFieldingPosition) && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    From Glove to Glove (seconds)
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 1.85"
                    value={current.glove_to_glove_sec ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) {
                        updateField('glove_to_glove_sec', v === '' ? undefined : v.endsWith('.') ? v : parseFloat(v));
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {sport === 'baseball'
                      ? 'Optimal: < 2.0s standard • < 1.5s for double play turns'
                      : 'Optimal: < 1.8s standard • < 1.4s for double play turns'}
                  </p>
                </div>
              )}

              {/* Throwing Velocity */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Throwing Velocity (mph)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 78"
                  value={current.throwing_velo_mph ?? ''}
                  onChange={e => updateField('throwing_velo_mph', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Play Probability</Label>
                <SelectGrid
                  options={[
                    { value: 'routine', label: '✅ Routine' },
                    { value: 'plus', label: '🔥 Plus' },
                    { value: 'elite', label: '👑 Elite' },
                  ]}
                  value={current.play_probability}
                  onChange={v => updateField('play_probability', v)}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Receiving Quality</Label>
                <SelectGrid
                  options={[
                    { value: 'poor', label: '❌ Poor' },
                    { value: 'average', label: '✅ Average' },
                    { value: 'elite', label: '👑 Elite' },
                  ]}
                  value={current.receiving_quality}
                  onChange={v => updateField('receiving_quality', v)}
                />
              </div>

              {/* Catch Type — moved to mandatory section above */}

              {/* Play Direction + Play Type (infielders get play type) */}
              <PlayDirectionSelector
                value={current}
                onChange={updateField}
                showPlayType={!!repFieldingPosition && INFIELD_POSITIONS.includes(repFieldingPosition)}
              />

              {/* ===== OUTFIELD-SPECIFIC FIELDS ===== */}
              {repFieldingPosition && ['LF', 'CF', 'RF'].includes(repFieldingPosition) && (
                <>
                  {/* Relay Play Yes/No */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Relay Play</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[{ value: true, label: '✅ Yes' }, { value: false, label: '❌ No' }].map(opt => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => updateField('relay_play', opt.value)}
                          className={cn(
                            'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
                            current.relay_play === opt.value
                              ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                              : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {current.relay_play === true && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Hit Cutoff Man?</Label>
                      <SelectGrid
                        options={[
                          { value: 'complete', label: '✅ Complete' },
                          { value: 'incomplete', label: '❌ Incomplete' },
                          { value: 'elite', label: '👑 Elite' },
                        ]}
                        value={current.relay_hit_cutoff}
                        onChange={v => updateField('relay_hit_cutoff', v)}
                      />
                    </div>
                  )}

                  {/* Wall Play Yes/No */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Played Ball Off the Wall</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[{ value: true, label: '✅ Yes' }, { value: false, label: '❌ No' }].map(opt => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => updateField('wall_play', opt.value)}
                          className={cn(
                            'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
                            current.wall_play === opt.value
                              ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                              : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {current.wall_play === true && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">How Well Was the Ball Played Off the Wall</Label>
                      <SelectGrid
                        options={[
                          { value: 'poor', label: '❌ Poor' },
                          { value: 'well', label: '✅ Well' },
                          { value: 'elite', label: '👑 Elite' },
                        ]}
                        value={current.wall_play_quality}
                        onChange={v => updateField('wall_play_quality', v)}
                      />
                    </div>
                  )}
                </>
              )}

              {/* ===== INFIELD-SPECIFIC FIELDS ===== */}
              {repFieldingPosition && INFIELD_POSITIONS.includes(repFieldingPosition) && (
                <>
                  <InfieldRepTypeFields value={current} onChange={updateField} />

                  {/* Tag Play Quality */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Tag Play Quality</Label>
                    <SelectGrid
                      options={[
                        { value: 'elite', label: '👑 Elite' },
                        { value: 'complete', label: '✅ Complete' },
                        { value: 'incomplete', label: '❌ Incomplete' },
                      ]}
                      value={current.tag_play_quality}
                      onChange={v => updateField('tag_play_quality', v)}
                    />
                  </div>

                  {/* Infield Relay Yes/No */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Relay Play</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[{ value: true, label: '✅ Yes' }, { value: false, label: '❌ No' }].map(opt => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => updateField('relay_play', opt.value)}
                          className={cn(
                            'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
                            current.relay_play === opt.value
                              ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                              : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {current.relay_play === true && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Got to Correct Lineup Spot?</Label>
                      <SelectGrid
                        options={[
                          { value: 'off_line', label: '❌ Off Line' },
                          { value: 'lined_up', label: '✅ Lined Up' },
                        ]}
                        value={current.relay_lineup_spot}
                        onChange={v => updateField('relay_lineup_spot', v)}
                        cols={2}
                      />
                    </div>
                  )}
                </>
              )}

              {/* ===== CATCHER DEFENSE FIELDS ===== */}
              {repFieldingPosition === 'C' && (
                <div className="space-y-3">
                  {/* Catcher Rep Type */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Catcher Rep Type <span className="text-destructive">*</span></Label>
                    <SelectGrid
                      options={[
                        { value: 'back_pick_1b', label: 'Back Pick → 1B' },
                        { value: 'back_pick_3b', label: 'Back Pick → 3B' },
                        { value: 'throw_down_2b', label: 'Throw Down → 2B' },
                        { value: 'throw_down_3b', label: 'Throw Down → 3B' },
                        { value: 'pop_fly', label: 'Pop Fly' },
                        { value: 'bunt_1b', label: 'Bunt → 1B' },
                        { value: 'bunt_3b', label: 'Bunt → 3B' },
                        
                        { value: 'tag_play_home', label: 'Tag Play at Home' },
                        { value: 'live_catching', label: 'Live Catching' },
                      ]}
                      value={current.catcher_rep_type}
                      onChange={v => updateField('catcher_rep_type', v)}
                      cols={2}
                    />
                  </div>

                  {/* Pop Fly Direction sub-question */}
                  {current.catcher_rep_type === 'pop_fly' && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Pop Fly Direction</Label>
                      <SelectGrid
                        options={[
                          { value: 'backstop', label: 'Backstop' },
                          { value: '3b_side', label: '3B Side' },
                          { value: '1b_side', label: '1B Side' },
                          { value: 'pitcher_area', label: 'Pitcher Area' },
                        ]}
                        value={current.pop_fly_direction}
                        onChange={v => updateField('pop_fly_direction', v)}
                        cols={2}
                      />
                    </div>
                  )}

                  {/* Tag Completion sub-question */}
                  {current.catcher_rep_type === 'tag_play_home' && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Tag Completion</Label>
                      <SelectGrid
                        options={[
                          { value: 'completed', label: '✅ Completed' },
                          { value: 'missed', label: '❌ Missed' },
                          { value: 'late', label: '⏱️ Late' },
                        ]}
                        value={current.tag_completion}
                        onChange={v => updateField('tag_completion', v)}
                      />
                    </div>
                  )}

                  {/* Live Catching pitch tracking */}
                  {current.catcher_rep_type === 'live_catching' && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          ABS Guess (Your Call) <span className="text-destructive">*</span>
                        </Label>
                        <PitchLocationGrid
                          value={current.abs_guess}
                          onSelect={v => updateField('abs_guess', v)}
                          batterSide={effectiveBatterSide}
                          sport={sport as 'baseball' | 'softball'}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          Actual Pitch Location <span className="text-destructive">*</span>
                        </Label>
                        <PitchLocationGrid
                          value={current.catcher_actual_pitch_location}
                          onSelect={v => updateField('catcher_actual_pitch_location', v)}
                          batterSide={effectiveBatterSide}
                          sport={sport as 'baseball' | 'softball'}
                        />
                      </div>
                    </>
                  )}

                  {/* Always-visible catcher metrics */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Pop Time (sec)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 1.95"
                      value={current.catcher_pop_time_sec ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          updateField('catcher_pop_time_sec', v === '' ? undefined : v.endsWith('.') ? v : parseFloat(v));
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Transfer Time (sec)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 0.75"
                      value={current.catcher_transfer_time_sec ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          updateField('catcher_transfer_time_sec', v === '' ? undefined : v.endsWith('.') ? v : parseFloat(v));
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Throw Base</Label>
                    <SelectGrid
                      options={[
                        { value: '2B', label: '2B' },
                        { value: '3B', label: '3B' },
                        { value: '1B', label: '1B Pickoff' },
                      ]}
                      value={current.catcher_throw_base}
                      onChange={v => updateField('catcher_throw_base', v)}
                    />
                  </div>
                </div>
              )}

              {/* Throw tracking — all fielding reps */}
              <FieldingThrowFields value={current} onChange={updateField} />

              {/* Footwork, Exchange Time, Throw Spin — ALWAYS VISIBLE (promoted from advanced) */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Footwork Grade: {current.footwork_grade ?? 50}
                </Label>
                <Slider
                  min={20} max={80} step={5}
                  value={[current.footwork_grade ?? 50]}
                  onValueChange={([v]) => updateField('footwork_grade', v)}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Exchange Time</Label>
                <SelectGrid
                  options={[
                    { value: 'fast', label: 'Fast' },
                    { value: 'average', label: 'Avg' },
                    { value: 'slow', label: 'Slow' },
                  ]}
                  value={current.exchange_time_band}
                  onChange={v => updateField('exchange_time_band', v)}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Throw Spin Quality</Label>
                <SelectGrid
                  options={[
                    { value: 'carry', label: 'Carry' },
                    { value: 'tail', label: 'Tail' },
                    { value: 'cut', label: 'Cut' },
                    { value: 'neutral', label: 'Neutral' },
                  ]}
                  value={current.throw_spin_quality}
                  onChange={v => updateField('throw_spin_quality', v)}
                  cols={4}
                />
              </div>

              </>
              )}

              {/* Field Position Diagram — always available, collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  📍 Mark Field Position
                  <ChevronDown className="h-3 w-3 ml-auto" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <FieldPositionDiagram
                    sport={sport as 'baseball' | 'softball'}
                    position={repFieldingPosition}
                    onUpdate={({ playerPos, ballPos }) => {
                      updateField('field_diagram_player_pos', playerPos);
                      updateField('field_diagram_ball_pos', ballPos);
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* ===== BASERUNNING FIELDS ===== */}
          {isBaserunning && (
            <BaserunningRepFields value={current} onChange={updateField} sport={sport} mode={mode} />
          )}

           {/* ===== THROWING FIELDS ===== */}
           {isThrowing && (
             <ThrowingRepFields value={current} onChange={updateField} mode={mode} sport={sport} />
           )}

           {/* ===== BUNTING FIELDS ===== */}
           {isBunting && (
             <BuntRepFields value={current} onChange={updateField} sport={sport} batterSide={effectiveBatterSide} mode={mode} />
           )}

          {/* Goal of Rep & Actual Outcome (per-rep) */}
          <AITextBoxField
            label="Goal of Rep"
            value={current.goal_of_rep ?? ''}
            onChange={(v) => updateField('goal_of_rep', v)}
            minChars={0}
            required={false}
            placeholder="What was your goal for this rep? (optional)..."
          />
          <AITextBoxField
            label="Actual Outcome"
            value={current.actual_outcome ?? ''}
            onChange={(v) => updateField('actual_outcome', v)}
            minChars={0}
            required={false}
            placeholder="What actually happened? (optional)..."
          />

          {/* CONFIRM REP */}
          <div className="relative">
            <Button
              onClick={commitRep}
              disabled={!canConfirm}
              className="w-full"
              size="sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm Rep
            </Button>
            <AnimatePresence>
              {showCommitCheck && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-md pointer-events-none"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.2 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <Check className="h-8 w-8 text-green-600" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!canConfirm && (
            <p className="text-[10px] text-destructive text-center">
              {!hasRepSource ? 'Configure session rep source first' :
                needsFieldingPosition ? 'Select fielding position' :
                needsDepthZone && !current.depth_zone ? 'Select tee depth zone' :
                !catchingAIDrillDescValid ? 'Drill Description requires min 15 characters' :
                !drillClarificationValid ? 'Drill Clarification requires min 15 characters' :
                !customRepDescValid ? 'Custom Rep Description requires min 15 characters' :
                !pitcherIntentValid ? 'Select Pitcher Spot Intent before logging pitch' :
                !pitchLocationValid ? 'Select pitch location' :
                !absGuessValid ? 'Select ABS Guess zone' :
                !throwingRequiredValid ? 'Self-Catch Quality and Effort Level are required' :
                !baserunningDrillValid ? 'Select drill type' :
                !contactQualityValid ? 'Select contact quality' :
                !buntMandatoryValid ? 'Select ball state, direction, and contact quality' :
                !fieldingMandatoryValid ? 'Select batted ball type, catch type, and fielding result' :
                  needsExecScore ? 'Set execution score (1-10) to confirm rep' : ''}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
