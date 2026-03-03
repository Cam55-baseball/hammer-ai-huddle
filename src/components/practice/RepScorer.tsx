import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { HandednessGate } from './HandednessGate';
import { TeeDepthGrid } from './TeeDepthGrid';
import { REQUIRES_THROWER_HAND, REQUIRES_VELOCITY, HIDES_VELOCITY, REQUIRES_PITCH_TYPE, HIDES_PITCH_TYPE } from './RepSourceSelector';
import { CatchingRepFields } from './CatchingRepFields';
import { BaserunningRepFields } from './BaserunningRepFields';
import { useSportConfig } from '@/hooks/useSportConfig';
import { cn } from '@/lib/utils';
import { Trash2, Check, Zap, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
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
  depth_zone?: number; // 1-5, required for tee
  // Advanced micro
  in_zone?: boolean;
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
  thrower_hand?: 'L' | 'R';
  goal_of_rep?: string;
  actual_outcome?: string;
  // Fielding
  play_type?: string;
  fielding_result?: string;
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
  { value: 'miss', label: '❌ Miss', color: 'bg-red-500/20 text-red-700 border-red-300' },
  { value: 'foul', label: '⚠️ Foul', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
  { value: 'weak', label: '🔸 Weak', color: 'bg-orange-500/20 text-orange-700 border-orange-300' },
  { value: 'hard', label: '💪 Hard', color: 'bg-green-500/20 text-green-700 border-green-300' },
  { value: 'barrel', label: '🔥 Barrel', color: 'bg-primary/20 text-primary border-primary/30' },
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
  { value: 'pop_up', label: 'Pop Up' },
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

export function RepScorer({ module, drillType, reps, onRepsChange, sessionConfig }: RepScorerProps) {
  const { pitchTypes, machineVelocityBands, pitchingVelocityBands, bpDistanceRange, sport } = useSportConfig();

  // Commit animation state
  const [showCommitCheck, setShowCommitCheck] = useState(false);

  // Handedness gate
  const [handedness, setHandedness] = useState<'L' | 'R' | undefined>();

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

  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';
  const isFielding = module === 'fielding';
  const isCatching = module === 'catching';
  const isBaserunning = module === 'baserunning';

  // Session-level defaults
  const repSource = sessionConfig?.rep_source ?? current.rep_source;
  const isTee = repSource === 'tee';

  const updateField = (field: string, val: any) => {
    setCurrent(prev => ({ ...prev, [field]: val }));
  };

  // Validation
  const execScore = current.execution_score;
  const hasRepSource = !!repSource;
  const needsDepthZone = isTee && isHitting;
  const canConfirm = hasRepSource && execScore != null && execScore >= 1
    && (!needsDepthZone || current.depth_zone != null);

  const needsThrowerHand = repSource && REQUIRES_THROWER_HAND.includes(repSource);
  const needsVelocity = repSource && REQUIRES_VELOCITY.includes(repSource);
  const hidesVelocity = repSource && HIDES_VELOCITY.includes(repSource);
  const needsPitchType = repSource && REQUIRES_PITCH_TYPE.includes(repSource);
  const hidesPitchType = repSource && HIDES_PITCH_TYPE.includes(repSource);

  const commitRep = useCallback(() => {
    if (!canConfirm) return;
    const rep: ScoredRep = {
      ...current,
      rep_source: repSource,
      session_distance_ft: sessionConfig?.pitch_distance_ft,
      session_velocity_band: sessionConfig?.velocity_band,
      session_rep_source: sessionConfig?.rep_source,
      environment: sessionConfig?.environment,
      ...(isHitting && { batter_side: handedness }),
      ...(isPitching && { pitcher_hand: handedness }),
      ...((isFielding || isCatching) && { throwing_hand: handedness }),
      ...(isBaserunning && { throwing_hand: handedness }),
    };
    onRepsChange([...reps, rep]);
    // Show commit animation
    setShowCommitCheck(true);
    setTimeout(() => setShowCommitCheck(false), 700);
    // Reset current but keep execution_score for speed
    setCurrent({ execution_score: current.execution_score });
    setShowOverrides(false);
  }, [current, handedness, canConfirm, reps, onRepsChange, isHitting, isPitching, isFielding, isCatching, isBaserunning, repSource, sessionConfig]);

  const removeRep = useCallback((index: number) => {
    onRepsChange(reps.filter((_, i) => i !== index));
  }, [reps, onRepsChange]);

  // If no handedness selected, show gate
  if (!handedness) {
    return <HandednessGate module={module} value={handedness} onChange={setHandedness} />;
  }

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

          {/* Mandatory: Execution Score — number line */}
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

          {/* Thrower handedness sub-field */}
          {needsThrowerHand && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Thrower Hand <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {(['L', 'R'] as const).map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => updateField('thrower_hand', h)}
                    className={cn(
                      'rounded-md border p-2 text-xs font-medium transition-all',
                      current.thrower_hand === h
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
              {/* Pitch Type for hitting (context-aware) */}
              {!hidesPitchType && needsPitchType && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Pitch Type <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {pitchTypes.slice(0, 10).map(pt => (
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
                        {pt.abbreviation ?? pt.name}
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
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1">
                  <PitchLocationGrid
                    value={current.pitch_location}
                    onSelect={v => updateField('pitch_location', v)}
                    batterSide={handedness}
                    sport={sport as 'baseball' | 'softball'}
                  />
                </div>
                {isTee && (
                  <TeeDepthGrid
                    value={current.depth_zone}
                    onChange={v => updateField('depth_zone', v)}
                    sport={sport as 'baseball' | 'softball'}
                    batterSide={handedness}
                  />
                )}
              </div>

              {/* Swing Decision - always visible (most valuable self-assessment) */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Swing Decision</Label>
                <SelectGrid
                  options={[
                    { value: 'barreled', label: '🔥 Barreled', color: 'bg-green-500/20 text-green-700 border-green-300' },
                    { value: 'good_take', label: '✅ Good Take', color: 'bg-primary/20 text-primary border-primary/30' },
                    { value: 'should_have_swung', label: '😤 Should\'ve Swung', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
                    { value: 'chased', label: '❌ Chased', color: 'bg-red-500/20 text-red-700 border-red-300' },
                  ]}
                  value={current.swing_decision}
                  onChange={v => updateField('swing_decision', v)}
                  cols={4}
                />
              </div>

              {mode === 'advanced' && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Contact Quality</Label>
                    <div className="grid grid-cols-5 gap-1.5">
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

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Exit Direction</Label>
                    <SelectGrid options={directionOptions} value={current.exit_direction} onChange={v => updateField('exit_direction', v)} />
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
                        { value: 'barrel', label: 'Barrel' },
                      ]}
                      value={current.batted_ball_type}
                      onChange={v => updateField('batted_ball_type', v)}
                      cols={4}
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
                    {pitchTypes.slice(0, 8).map(pt => (
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
                  </div>
                </div>
              )}

              <PitchLocationGrid
                value={current.pitch_location}
                onSelect={v => updateField('pitch_location', v)}
                batterSide={handedness}
                sport={sport as 'baseball' | 'softball'}
              />

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

              {/* Hit Spot? - always visible for pitching quick mode */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Hit Spot?</Label>
                <SelectGrid
                  options={[
                    { value: 'yes', label: '✅ Yes', color: 'bg-green-500/20 text-green-700 border-green-300' },
                    { value: 'no', label: '❌ No', color: 'bg-red-500/20 text-red-700 border-red-300' },
                  ]}
                  value={current.in_zone ? 'yes' : current.in_zone === false ? 'no' : undefined}
                  onChange={v => updateField('in_zone', v === 'yes')}
                  cols={2}
                />
              </div>

              {mode === 'advanced' && (
                <>
                  {!hidesVelocity && (
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
                        { value: 'topspin', label: 'Top' },
                        { value: 'backspin', label: 'Back' },
                        { value: 'sidespin', label: 'Side' },
                      ]}
                      value={current.spin_direction}
                      onChange={v => updateField('spin_direction', v)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== FIELDING FIELDS ===== */}
          {isFielding && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Play Type</Label>
                <SelectGrid
                  options={playTypeOptions}
                  value={current.play_type}
                  onChange={v => updateField('play_type', v)}
                  cols={3}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Fielding Result</Label>
                <SelectGrid
                  options={fieldingResultOptions}
                  value={current.fielding_result}
                  onChange={v => updateField('fielding_result', v)}
                />
              </div>

              {mode === 'advanced' && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Throw Accuracy: {current.throw_accuracy ?? 50}
                    </Label>
                    <Slider
                      min={20} max={80} step={5}
                      value={[current.throw_accuracy ?? 50]}
                      onValueChange={([v]) => updateField('throw_accuracy', v)}
                    />
                  </div>

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
            </>
          )}

          {/* ===== CATCHING FIELDS ===== */}
          {isCatching && (
            <CatchingRepFields value={current} onChange={updateField} />
          )}

          {/* ===== BASERUNNING FIELDS ===== */}
          {isBaserunning && (
            <BaserunningRepFields value={current} onChange={updateField} />
          )}

          {/* Goal / Outcome (advanced only) - structured presets */}
          {mode === 'advanced' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Goal of Rep</Label>
                <SelectGrid
                  options={[
                    { value: 'oppo_drive', label: 'Oppo Drive' },
                    { value: 'pull_power', label: 'Pull Power' },
                    { value: 'up_middle', label: 'Up Middle' },
                    { value: 'adjust_offspeed', label: 'Adj. Off-Speed' },
                    { value: 'two_strike', label: '2-Strike Battle' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                  value={current.goal_of_rep}
                  onChange={v => updateField('goal_of_rep', v)}
                  cols={3}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Actual Outcome</Label>
                <SelectGrid
                  options={[
                    { value: 'oppo_drive', label: 'Oppo Drive' },
                    { value: 'pull_power', label: 'Pull Power' },
                    { value: 'up_middle', label: 'Up Middle' },
                    { value: 'ground_out', label: 'Ground Out' },
                    { value: 'fly_out', label: 'Fly Out' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                  value={current.actual_outcome}
                  onChange={v => updateField('actual_outcome', v)}
                  cols={3}
                />
              </div>
            </div>
          )}

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
                needsDepthZone && !current.depth_zone ? 'Select tee depth zone' :
                  'Set execution score (1-10) to confirm rep'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
