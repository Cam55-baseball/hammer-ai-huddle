import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSessionDefaults } from '@/hooks/useSessionDefaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RepSourceSelector, HIDES_PITCH_DISTANCE, HIDES_VELOCITY } from './RepSourceSelector';
import { SeasonContextToggle } from './SeasonContextToggle';
import { CoachSelector, type CoachSelection } from './CoachSelector';
import { LiveAbLinkPanel } from './LiveAbLinkPanel';

import { FieldingPositionSelector } from './FieldingPositionSelector';
import { useSportConfig } from '@/hooks/useSportConfig';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { baseballLeagueDistances } from '@/data/baseball/leagueDistances';
import { softballLeagueDistances } from '@/data/softball/leagueDistances';
import { getCompetitionLevelsByCategory } from '@/data/competitionWeighting';
import { cn } from '@/lib/utils';
import { Settings2, ArrowRight } from 'lucide-react';

export interface SessionConfig {
  rep_source: string;
  custom_rep_source?: string;
  pitch_distance_ft: number;
  velocity_band?: string;
  season_context: string;
  environment: 'practice' | 'game' | 'lesson';
  indoor_outdoor: 'indoor' | 'outdoor';
  coach_selection: CoachSelection;
  coach_session_type?: 'solo' | 'coached' | 'lesson';
  league_level?: string;
  competition_level?: string;
  opponent_name?: string;
  opponent_level?: string;
  fielding_position?: string;
  link_code?: string;
  bat_size?: string;
  bat_type?: string;
}

interface SessionConfigPanelProps {
  module: string;
  sessionType: string;
  onConfirm: (config: SessionConfig) => void;
  onBack: () => void;
}

// Auto-derive environment from session type
function deriveEnvironment(sessionType: string): 'practice' | 'game' | 'lesson' {
  if (sessionType === 'live_abs') return 'game';
  if (sessionType === 'lesson') return 'lesson';
  return 'practice';
}

// Auto-derive coach session type from session type
function deriveCoachSessionType(sessionType: string): 'solo' | 'coached' | 'lesson' {
  if (sessionType === 'lesson') return 'lesson';
  if (sessionType === 'team_session') return 'coached';
  return 'solo';
}

export function SessionConfigPanel({ module, sessionType, onConfirm, onBack }: SessionConfigPanelProps) {
  const { machineVelocityBands, pitchingVelocityBands } = useSportConfig();
  const { sport } = useSportTheme();
  const { user } = useAuth();
  const { getDefaults, saveDefaults } = useSessionDefaults(module);
  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';
  const isBunting = module === 'bunting';
  const isBaserunning = module === 'baserunning';
  const isFielding = module === 'fielding';

  const isLiveAbs = sessionType === 'live_abs';
  const isSoloWork = sessionType === 'solo_work';

  const leagueDistances = sport === 'softball' ? softballLeagueDistances : baseballLeagueDistances;

  // Load smart defaults
  const defaults = getDefaults();

  const [repSource, setRepSource] = useState<string>(defaults.rep_source ?? '');
  const defaultDistance = sport === 'softball' ? 43 : 60.6;
  const [pitchDistance, setPitchDistance] = useState(defaults.pitch_distance_ft ?? defaultDistance);
  const [pitchDistanceDisplay, setPitchDistanceDisplay] = useState<string>(
    String(defaults.pitch_distance_ft ?? defaultDistance)
  );
  const [velocityBand, setVelocityBand] = useState<string | undefined>(defaults.velocity_band);
  const { resolvedPhase } = useSeasonStatus();
  const profilePhase: string = resolvedPhase === 'off_season' ? 'preseason' : resolvedPhase;
  const [seasonContext, setSeasonContext] = useState(
    isLiveAbs ? 'in_season' : (defaults.season_context ?? profilePhase)
  );
  const [coachSelection, setCoachSelection] = useState<CoachSelection>({ type: 'none' });
  const [leagueLevel, setLeagueLevel] = useState<string | undefined>();
  const [fieldingPosition, setFieldingPosition] = useState<string | undefined>();
  const [customRepSource, setCustomRepSource] = useState('');
  const [competitionLevel, setCompetitionLevel] = useState<string | undefined>();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [batSize, setBatSize] = useState<string>('');
  const [batType, setBatType] = useState<string>('');
  const [customBatType, setCustomBatType] = useState<string>('');
  const competitionCategories = useMemo(() => {
    return getCompetitionLevelsByCategory(sport as 'baseball' | 'softball');
  }, [sport]);
  const showCompetitionLevel = isLiveAbs;

  // Auto-derived values
  const environment = deriveEnvironment(sessionType);
  const coachSessionType = deriveCoachSessionType(sessionType);
  const showCoachSelector = sessionType === 'team_session' || sessionType === 'lesson';
  const showSeasonContext = !isLiveAbs;
  const showLeagueLevel = (isHitting || isPitching || isBunting) && !isSoloWork;
  const showVelocityBand = (isHitting || isBunting) && !HIDES_VELOCITY.includes(repSource);
  const showPitchDistance = (isHitting || isPitching || isBunting) && !HIDES_PITCH_DISTANCE.includes(repSource);
  const showRepSourceSelector = true;
  const HITTER_FACING_SOURCES = ['live_bp', 'flat_ground_vs_hitter', 'bullpen_vs_hitter', 'sim_game', 'game'];
  const showLinkPanel = isLiveAbs || (isPitching && HITTER_FACING_SOURCES.includes(repSource)) || (isHitting && ['live_bp', 'game'].includes(repSource));

  // Fetch head coach info for auto-select
  const { data: mpiSettings } = useQuery({
    queryKey: ['mpi-settings-coach-panel', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('athlete_mpi_settings')
        .select('primary_coach_id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: headCoachName } = useQuery({
    queryKey: ['head-coach-name-panel', mpiSettings?.primary_coach_id],
    queryFn: async () => {
      if (!mpiSettings?.primary_coach_id) return null;
      const { data } = await supabase
        .from('profiles_public')
        .select('full_name')
        .eq('id', mpiSettings.primary_coach_id)
        .maybeSingle();
      return data?.full_name ?? 'Coach';
    },
    enabled: !!mpiSettings?.primary_coach_id,
  });

  // Auto-select head coach when coach is relevant
  useEffect(() => {
    if (!showCoachSelector) {
      setCoachSelection({ type: 'none' });
    } else if (mpiSettings?.primary_coach_id && headCoachName) {
      setCoachSelection({
        type: 'assigned',
        coach_id: mpiSettings.primary_coach_id,
        coach_name: headCoachName,
      });
    }
  }, [showCoachSelector, mpiSettings?.primary_coach_id, headCoachName]);

  const velocityBands = isHitting ? machineVelocityBands : pitchingVelocityBands;
  const canConfirm = !!repSource;

  const handleLeagueLevelChange = (level: string) => {
    setLeagueLevel(level);
    const dist = leagueDistances.find(d => d.level === level);
    if (dist) {
      setPitchDistance(dist.mound_ft);
      setPitchDistanceDisplay(String(dist.mound_ft));
    }
  };

  const handleConfirm = () => {
    if (!canConfirm) return;

    saveDefaults({
      rep_source: repSource,
      pitch_distance_ft: pitchDistance,
      velocity_band: velocityBand,
      season_context: seasonContext,
    });

    onConfirm({
      rep_source: repSource,
      custom_rep_source: repSource === 'other' ? customRepSource || undefined : undefined,
      pitch_distance_ft: pitchDistance,
      velocity_band: velocityBand,
      season_context: seasonContext,
      environment,
      indoor_outdoor: 'outdoor',
      coach_selection: coachSelection,
      coach_session_type: coachSessionType,
      league_level: leagueLevel,
      competition_level: competitionLevel,
      fielding_position: isFielding ? fieldingPosition : undefined,
      link_code: linkCode ?? undefined,
      bat_size: isHitting && batSize ? batSize : undefined,
      bat_type: isHitting ? (batType === 'custom' ? customBatType || undefined : batType || undefined) : undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-primary" />
          Configure Session
        </CardTitle>
        <p className="text-xs text-muted-foreground">Set session-level defaults before logging reps</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Rep Source — hidden for game (auto-set) */}
        {showRepSourceSelector && (
          <RepSourceSelector module={module} sessionType={sessionType} value={repSource} onChange={setRepSource} customSource={customRepSource} onCustomSourceChange={setCustomRepSource} />
        )}




        {/* Fielding position — required for fielding sessions */}
        {isFielding && (
          <FieldingPositionSelector
            value={fieldingPosition}
            onChange={setFieldingPosition}
            label="Session Position"
            required
          />
        )}

        {showPitchDistance && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Pitch Mound Distance (ft)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={pitchDistanceDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/^0+(?=\d)/, '');
                setPitchDistanceDisplay(raw);
                const num = parseFloat(raw);
                if (!isNaN(num) && num >= 0) setPitchDistance(num);
              }}
              onBlur={() => {
                const num = parseFloat(pitchDistanceDisplay);
                if (isNaN(num) || num < 10) {
                  setPitchDistance(defaultDistance);
                  setPitchDistanceDisplay(String(defaultDistance));
                } else {
                  setPitchDistanceDisplay(String(num));
                }
              }}
              placeholder={sport === 'softball' ? '43' : '60.6'}
              className="h-9 text-sm w-32"
            />
          </div>
        )}

        {/* Velocity Band — hidden for tee/soft toss/etc and game */}
        {showVelocityBand && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Velocity Band</Label>
            <div className="flex flex-wrap gap-1.5">
              {velocityBands.map((vb: { value: string; label: string }) => (
                <button
                  key={vb.value}
                  type="button"
                  onClick={() => setVelocityBand(velocityBand === vb.value ? undefined : vb.value)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                    velocityBand === vb.value
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

        {/* League Level — hidden for solo work and game */}
        {showLeagueLevel && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">League / Level</Label>
            <div className="flex flex-wrap gap-1.5">
              {leagueDistances.map(ld => (
                <button
                  key={ld.level}
                  type="button"
                  onClick={() => handleLeagueLevelChange(ld.level)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                    leagueLevel === ld.level
                      ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                      : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                  )}
                >
                  {ld.label}
                </button>
              ))}
            </div>
            {leagueLevel && (() => {
              const sel = leagueDistances.find(d => d.level === leagueLevel);
              return sel ? (
                <Badge variant="outline" className="mt-1.5 text-[10px]">
                  Standard: {sel.mound_label} mound, {sel.bases_ft}' bases
                </Badge>
              ) : null;
            })()}
          </div>
        )}

        {/* Bat Size & Type — hitting only */}
        {isHitting && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Bat Size (optional)</Label>
              <Input
                type="text"
                value={batSize}
                onChange={e => setBatSize(e.target.value)}
                placeholder='33" / 30 oz'
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Bat Type (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {['metal', 'wood', 'custom'].map(bt => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setBatType(batType === bt ? '' : bt)}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                      batType === bt
                        ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                        : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                    )}
                  >
                    {bt === 'custom' ? '✏️ Custom' : bt.charAt(0).toUpperCase() + bt.slice(1)}
                  </button>
                ))}
              </div>
              {batType === 'custom' && (
                <Input
                  type="text"
                  value={customBatType}
                  onChange={e => setCustomBatType(e.target.value)}
                  placeholder="Enter bat type..."
                  className="mt-1.5 h-8 text-xs"
                />
              )}
            </div>
          </div>
        )}

        {/* Season Context — hidden for game and live at-bats */}
        {showSeasonContext && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Season</Label>
            <SeasonContextToggle value={seasonContext} onChange={setSeasonContext} />
          </div>
        )}

        {/* Competition Level — for game and live at-bats */}
        {showCompetitionLevel && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Competition Level</Label>
            <div className="space-y-1.5">
              {competitionCategories.map(cat => (
                <div key={cat.category}>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {cat.levels.map(l => (
                      <button
                        key={l.key}
                        type="button"
                        onClick={() => setCompetitionLevel(competitionLevel === l.key ? undefined : l.key)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[10px] font-medium transition-all',
                          competitionLevel === l.key
                            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                            : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Coach - only when relevant */}
        {showCoachSelector && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground block">Coach</Label>
            <CoachSelector value={coachSelection} onChange={setCoachSelection} />
          </div>
        )}

        {/* Live AB Link Panel */}
        {showLinkPanel && (
          <LiveAbLinkPanel
            linkCode={linkCode}
            onLinkEstablished={(code) => {
              setLinkCode(code);
            }}
            onUnlink={() => {
              setLinkCode(null);
            }}
          />
        )}

        {/* Confirm */}
        <Button onClick={handleConfirm} disabled={!canConfirm} className="w-full" size="lg">
          <ArrowRight className="h-4 w-4 mr-2" />
          Start Logging Reps
        </Button>
        {!canConfirm && (
          <p className="text-[10px] text-destructive text-center">
            {!repSource ? 'Select a rep source to continue' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
