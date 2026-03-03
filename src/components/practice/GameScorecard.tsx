import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { useSportConfig } from '@/hooks/useSportConfig';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, RotateCcw, ChevronDown, ChevronUp, User, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface GamePitch {
  pitch_location?: { row: number; col: number };
  pitch_type?: string;
  result: 'strike_looking' | 'strike_swinging' | 'ball' | 'foul' | 'in_play_out' | 'in_play_hit';
  swing_decision?: 'correct' | 'incorrect';
  contact_quality?: string;
  exit_direction?: string;
}

export interface InningEntry {
  inning: number;
  // Hitting
  at_bat_result?: string;
  pitch_count?: number;
  rbi?: number;
  runs?: number;
  stolen_bases?: number;
  pitches?: GamePitch[];
  // Pitching
  ip?: number;
  hits_allowed?: number;
  runs_allowed?: number;
  earned_runs?: number;
  strikeouts?: number;
  walks?: number;
  pitches_thrown?: number;
  // Fielding
  plays_made?: number;
  errors?: number;
  assists?: number;
  putouts?: number;
}

export interface AtBat {
  pitches: GamePitch[];
  outcome: string;
  rbi?: number;
}

interface GameScorecardProps {
  module: string;
  atBats: AtBat[];
  onAtBatsChange: (atBats: AtBat[]) => void;
  sport?: string;
}

const resultOptions = [
  { value: 'strike_looking', label: 'Called Strike', short: 'K👀' },
  { value: 'strike_swinging', label: 'Swing & Miss', short: 'K🌀' },
  { value: 'ball', label: 'Ball', short: '⚾' },
  { value: 'foul', label: 'Foul', short: '⚠️' },
  { value: 'in_play_out', label: 'In Play (Out)', short: '🔴' },
  { value: 'in_play_hit', label: 'In Play (Hit)', short: '🟢' },
];

const hittingOutcomes = ['K', 'BB', '1B', '2B', '3B', 'HR', 'GO', 'FO', 'LO', 'PO', 'FC', 'E', 'SAC', 'HBP'];

export function GameScorecard({ module, atBats, onAtBatsChange, sport = 'baseball' }: GameScorecardProps) {
  const { pitchTypes } = useSportConfig();
  const navigate = useNavigate();
  const maxInnings = sport === 'softball' ? 7 : 9;
  
  const [currentInning, setCurrentInning] = useState(1);
  const [innings, setInnings] = useState<InningEntry[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Hitting at-bat flow
  const [currentPitches, setCurrentPitches] = useState<GamePitch[]>([]);
  const [currentPitch, setCurrentPitch] = useState<Partial<GamePitch>>({});
  const [pitchStep, setPitchStep] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);

  // Pitching inning entry
  const [pitchingEntry, setPitchingEntry] = useState<Partial<InningEntry>>({});
  // Fielding inning entry
  const [fieldingEntry, setFieldingEntry] = useState<Partial<InningEntry>>({});

  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';
  const isFielding = module === 'fielding';

  // Derive counts
  const balls = currentPitches.filter(p => p.result === 'ball').length;
  const strikes = currentPitches.filter(p => ['strike_looking', 'strike_swinging'].includes(p.result)).length
    + Math.min(2, currentPitches.filter(p => p.result === 'foul').length);

  // Stats
  const totalABs = atBats.length;
  const hits = atBats.filter(ab => ['1B', '2B', '3B', 'HR'].includes(ab.outcome)).length;
  const walks = atBats.filter(ab => ['BB', 'HBP'].includes(ab.outcome)).length;
  const ks = atBats.filter(ab => ab.outcome === 'K').length;
  const qualifiedABs = atBats.filter(ab => !['BB', 'HBP', 'SAC'].includes(ab.outcome)).length;
  const avg = qualifiedABs > 0 ? (hits / qualifiedABs).toFixed(3) : '.000';
  const obp = totalABs > 0 ? ((hits + walks) / totalABs).toFixed(3) : '.000';

  // Pitching stats
  const totalIP = innings.reduce((s, i) => s + (i.ip ?? 0), 0);
  const totalK = innings.reduce((s, i) => s + (i.strikeouts ?? 0), 0);
  const totalBB = innings.reduce((s, i) => s + (i.walks ?? 0), 0);
  const totalHA = innings.reduce((s, i) => s + (i.hits_allowed ?? 0), 0);
  const totalER = innings.reduce((s, i) => s + (i.earned_runs ?? 0), 0);

  // Fielding stats
  const totalPO = innings.reduce((s, i) => s + (i.putouts ?? 0), 0);
  const totalA = innings.reduce((s, i) => s + (i.assists ?? 0), 0);
  const totalE = innings.reduce((s, i) => s + (i.errors ?? 0), 0);

  const commitPitch = useCallback((result: string) => {
    const pitch: GamePitch = { ...currentPitch as GamePitch, result: result as GamePitch['result'] };
    const updated = [...currentPitches, pitch];
    setCurrentPitches(updated);
    setCurrentPitch({});
    setPitchStep(0);

    const newBalls = updated.filter(p => p.result === 'ball').length;
    const newStrikes = updated.filter(p => ['strike_looking', 'strike_swinging'].includes(p.result)).length;
    const fouls = updated.filter(p => p.result === 'foul').length;
    const effectiveStrikes = newStrikes + Math.min(2, fouls);

    if (newBalls >= 4 || effectiveStrikes >= 3 || ['in_play_out', 'in_play_hit'].includes(result)) {
      setShowOutcome(true);
    }
  }, [currentPitch, currentPitches]);

  const finalizeAtBat = (outcome: string) => {
    const atBat: AtBat = { pitches: currentPitches, outcome };
    onAtBatsChange([...atBats, atBat]);
    setCurrentPitches([]);
    setCurrentPitch({});
    setShowOutcome(false);
    setPitchStep(0);
  };

  const resetAtBat = () => {
    setCurrentPitches([]);
    setCurrentPitch({});
    setShowOutcome(false);
    setPitchStep(0);
  };

  const commitPitchingInning = () => {
    const entry: InningEntry = { inning: currentInning, ...pitchingEntry };
    setInnings(prev => [...prev, entry]);
    setPitchingEntry({});
    setCurrentInning(prev => prev + 1);
  };

  const commitFieldingInning = () => {
    const entry: InningEntry = { inning: currentInning, ...fieldingEntry };
    setInnings(prev => [...prev, entry]);
    setFieldingEntry({});
    setCurrentInning(prev => prev + 1);
  };

  const NumberInput = ({ label, value, onChange, min = 0 }: { label: string; value: number | undefined; onChange: (v: number) => void; min?: number }) => (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(min, (value ?? 0) - 1))} className="w-7 h-7 rounded border border-border bg-muted/30 text-xs font-bold hover:bg-muted">−</button>
        <span className="w-8 text-center text-sm font-medium">{value ?? 0}</span>
        <button type="button" onClick={() => onChange((value ?? 0) + 1)} className="w-7 h-7 rounded border border-border bg-muted/30 text-xs font-bold hover:bg-muted">+</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Profile link */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-xs gap-1">
          <User className="h-3 w-3" /> View Profile <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      {/* Innings row */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {Array.from({ length: Math.max(maxInnings, currentInning) }, (_, i) => i + 1).map(inn => {
          const hasData = innings.some(e => e.inning === inn) || atBats.length > 0;
          return (
            <button
              key={inn}
              type="button"
              onClick={() => setCurrentInning(inn)}
              className={cn(
                'shrink-0 w-9 h-9 rounded-md border text-xs font-bold transition-all',
                currentInning === inn
                  ? 'bg-primary text-primary-foreground border-primary'
                  : hasData
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground'
              )}
            >
              {inn}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCurrentInning(prev => prev + 1)}
          className="shrink-0 w-9 h-9 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
        >
          +
        </button>
      </div>

      {/* ===== HITTING STAT LINE ===== */}
      {isHitting && totalABs > 0 && (
        <div className="flex gap-4 justify-center">
          <div className="text-center"><p className="text-2xl font-bold">{avg}</p><p className="text-xs text-muted-foreground">AVG</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{obp}</p><p className="text-xs text-muted-foreground">OBP</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{hits}</p><p className="text-xs text-muted-foreground">H</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{ks}</p><p className="text-xs text-muted-foreground">K</p></div>
        </div>
      )}

      {/* ===== PITCHING STAT LINE ===== */}
      {isPitching && innings.length > 0 && (
        <div className="flex gap-4 justify-center">
          <div className="text-center"><p className="text-2xl font-bold">{totalIP.toFixed(1)}</p><p className="text-xs text-muted-foreground">IP</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{totalK}</p><p className="text-xs text-muted-foreground">K</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{totalBB}</p><p className="text-xs text-muted-foreground">BB</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{totalHA}</p><p className="text-xs text-muted-foreground">H</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{totalER}</p><p className="text-xs text-muted-foreground">ER</p></div>
        </div>
      )}

      {/* ===== FIELDING STAT LINE ===== */}
      {isFielding && innings.length > 0 && (
        <div className="flex gap-4 justify-center">
          <div className="text-center"><p className="text-2xl font-bold">{totalPO}</p><p className="text-xs text-muted-foreground">PO</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{totalA}</p><p className="text-xs text-muted-foreground">A</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{totalE}</p><p className="text-xs text-muted-foreground">E</p></div>
        </div>
      )}

      {/* Previous at-bats / innings feed */}
      {(atBats.length > 0 || innings.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {atBats.map((ab, i) => (
            <Badge key={i} variant={['1B', '2B', '3B', 'HR'].includes(ab.outcome) ? 'default' : 'secondary'}>
              AB{i + 1}: {ab.outcome} ({ab.pitches.length}P)
            </Badge>
          ))}
          {innings.map((inn, i) => (
            <Badge key={`inn-${i}`} variant="outline">
              Inn {inn.inning}: {isPitching ? `${inn.ip ?? 0}IP ${inn.strikeouts ?? 0}K` : `${inn.putouts ?? 0}PO ${inn.assists ?? 0}A`}
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">Advanced Detail</span>
        <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
      </div>

      {/* ===== HITTING: AT-BAT ENTRY ===== */}
      {isHitting && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                At-Bat #{totalABs + 1} — Inn {currentInning}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono">{balls}-{Math.min(2, strikes)}</span>
                {currentPitches.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetAtBat} className="h-7 px-2">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showOutcome ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">At-Bat Result</label>
                <div className="grid grid-cols-4 gap-2">
                  {hittingOutcomes.map(outcome => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => finalizeAtBat(outcome)}
                      className={cn(
                        'rounded-lg border p-3 text-center text-sm font-bold transition-all hover:scale-105',
                        ['1B', '2B', '3B', 'HR'].includes(outcome)
                          ? 'bg-green-500/20 border-green-300 text-green-700 hover:bg-green-500/30'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      {outcome}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <>
                {currentPitches.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {currentPitches.map((p, i) => {
                      const opt = resultOptions.find(r => r.value === p.result);
                      return <span key={i} className="text-sm">{opt?.short ?? '?'}</span>;
                    })}
                  </div>
                )}

                {showAdvanced ? (
                  <>
                    <PitchLocationGrid
                      value={currentPitch.pitch_location}
                      onSelect={v => { setCurrentPitch(prev => ({ ...prev, pitch_location: v })); setPitchStep(1); }}
                      batterSide="R"
                    />
                    {pitchStep >= 1 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Result</label>
                        <div className="grid grid-cols-3 gap-2">
                          {resultOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => commitPitch(opt.value)}
                              className="rounded-lg border bg-muted/30 border-border hover:bg-muted p-2 text-center text-xs font-medium transition-all hover:scale-105"
                            >
                              {opt.short} {opt.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {pitchStep === 0 && (
                      <p className="text-center text-sm text-muted-foreground">Tap the zone where the pitch was thrown</p>
                    )}
                  </>
                ) : (
                  // Quick mode: just result buttons
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Pitch Result</label>
                    <div className="grid grid-cols-3 gap-2">
                      {resultOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => commitPitch(opt.value)}
                          className="rounded-lg border bg-muted/30 border-border hover:bg-muted p-2 text-center text-xs font-medium transition-all hover:scale-105"
                        >
                          {opt.short} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== PITCHING: INNING ENTRY ===== */}
      {isPitching && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Inning {currentInning}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumberInput label="Outs Recorded (IP)" value={pitchingEntry.ip != null ? pitchingEntry.ip * 3 : undefined} onChange={v => setPitchingEntry(p => ({ ...p, ip: v / 3 }))} />
            <NumberInput label="Strikeouts" value={pitchingEntry.strikeouts} onChange={v => setPitchingEntry(p => ({ ...p, strikeouts: v }))} />
            <NumberInput label="Walks" value={pitchingEntry.walks} onChange={v => setPitchingEntry(p => ({ ...p, walks: v }))} />
            <NumberInput label="Hits Allowed" value={pitchingEntry.hits_allowed} onChange={v => setPitchingEntry(p => ({ ...p, hits_allowed: v }))} />
            <NumberInput label="Earned Runs" value={pitchingEntry.earned_runs} onChange={v => setPitchingEntry(p => ({ ...p, earned_runs: v }))} />
            {showAdvanced && (
              <>
                <NumberInput label="Runs Allowed" value={pitchingEntry.runs_allowed} onChange={v => setPitchingEntry(p => ({ ...p, runs_allowed: v }))} />
                <NumberInput label="Pitches Thrown" value={pitchingEntry.pitches_thrown} onChange={v => setPitchingEntry(p => ({ ...p, pitches_thrown: v }))} />
              </>
            )}
            <Button onClick={commitPitchingInning} className="w-full" size="sm">
              Complete Inning {currentInning}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ===== FIELDING: INNING ENTRY ===== */}
      {isFielding && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Inning {currentInning}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumberInput label="Putouts" value={fieldingEntry.putouts} onChange={v => setFieldingEntry(p => ({ ...p, putouts: v }))} />
            <NumberInput label="Assists" value={fieldingEntry.assists} onChange={v => setFieldingEntry(p => ({ ...p, assists: v }))} />
            <NumberInput label="Errors" value={fieldingEntry.errors} onChange={v => setFieldingEntry(p => ({ ...p, errors: v }))} />
            {showAdvanced && (
              <NumberInput label="Plays Made" value={fieldingEntry.plays_made} onChange={v => setFieldingEntry(p => ({ ...p, plays_made: v }))} />
            )}
            <Button onClick={commitFieldingInning} className="w-full" size="sm">
              Complete Inning {currentInning}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
