import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSessionDefaults } from '@/hooks/useSessionDefaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RepSourceSelector, HIDES_PITCH_DISTANCE, HIDES_VELOCITY } from './RepSourceSelector';
import { SeasonContextToggle } from './SeasonContextToggle';
import { CoachSelector, type CoachSelection } from './CoachSelector';
import { useSportConfig } from '@/hooks/useSportConfig';
import { cn } from '@/lib/utils';
import { Settings2, ArrowRight } from 'lucide-react';

export interface SessionConfig {
  rep_source: string;
  pitch_distance_ft: number;
  velocity_band?: string;
  season_context: string;
  environment: 'practice' | 'game' | 'lesson';
  indoor_outdoor: 'indoor' | 'outdoor';
  coach_selection: CoachSelection;
  coach_session_type?: 'solo' | 'coached' | 'lesson';
}

interface SessionConfigPanelProps {
  module: string;
  sessionType: string;
  onConfirm: (config: SessionConfig) => void;
  onBack: () => void;
}

// Auto-derive environment from session type
function deriveEnvironment(sessionType: string): 'practice' | 'game' | 'lesson' {
  if (sessionType === 'game' || sessionType === 'live_abs') return 'game';
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
  const { user } = useAuth();
  const { getDefaults, saveDefaults } = useSessionDefaults(module);
  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';

  // Load smart defaults
  const defaults = getDefaults();

  const [repSource, setRepSource] = useState<string>(defaults.rep_source ?? '');
  const [pitchDistance, setPitchDistance] = useState(defaults.pitch_distance_ft ?? 60);
  const [velocityBand, setVelocityBand] = useState<string | undefined>(defaults.velocity_band);
  const [seasonContext, setSeasonContext] = useState(defaults.season_context ?? 'in_season');
  const [coachSelection, setCoachSelection] = useState<CoachSelection>({ type: 'none' });

  // Auto-derived values
  const environment = deriveEnvironment(sessionType);
  const coachSessionType = deriveCoachSessionType(sessionType);
  const showCoachSelector = sessionType === 'team_session' || sessionType === 'lesson';

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

  const handleConfirm = () => {
    if (!canConfirm) return;

    // Save defaults for next session
    saveDefaults({
      rep_source: repSource,
      pitch_distance_ft: pitchDistance,
      velocity_band: velocityBand,
      season_context: seasonContext,
    });

    onConfirm({
      rep_source: repSource,
      pitch_distance_ft: pitchDistance,
      velocity_band: velocityBand,
      season_context: seasonContext,
      environment,
      indoor_outdoor: 'outdoor', // no longer asked, default outdoor
      coach_selection: coachSelection,
      coach_session_type: coachSessionType,
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
        {/* Rep Source */}
        <RepSourceSelector module={module} value={repSource} onChange={setRepSource} />

        {/* Pitch Distance — hidden for tee/soft toss */}
        {!HIDES_PITCH_DISTANCE.includes(repSource) && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Pitch Release Distance: <span className="font-semibold text-foreground">{pitchDistance} ft</span>
            </Label>
            <div className="flex items-center gap-0 overflow-x-auto py-1">
              {[15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80].map((ft, i, arr) => (
                <div key={ft} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setPitchDistance(ft)}
                    className={cn(
                      'relative flex flex-col items-center gap-0.5 group',
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center',
                      pitchDistance === ft
                        ? 'bg-primary border-primary scale-125 shadow-md'
                        : pitchDistance > ft
                          ? 'bg-primary/30 border-primary/50'
                          : 'bg-muted border-border group-hover:border-primary/50'
                    )} />
                    {ft % 10 === 0 && (
                      <span className={cn(
                        'text-[8px]',
                        pitchDistance === ft ? 'text-primary font-semibold' : 'text-muted-foreground'
                      )}>
                        {ft}
                      </span>
                    )}
                  </button>
                  {i < arr.length - 1 && (
                    <div className={cn(
                      'h-0.5 w-2 mx-px',
                      pitchDistance > ft ? 'bg-primary/40' : 'bg-border'
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Velocity Band — hidden for tee/soft toss/etc */}
        {(isHitting || isPitching) && !HIDES_VELOCITY.includes(repSource) && (
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

        {/* Season Context */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Season</Label>
          <SeasonContextToggle value={seasonContext} onChange={setSeasonContext} />
        </div>

        {/* Coach - only when relevant */}
        {showCoachSelector && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground block">Coach</Label>
            <CoachSelector value={coachSelection} onChange={setCoachSelection} />
          </div>
        )}

        {/* Confirm */}
        <Button onClick={handleConfirm} disabled={!canConfirm} className="w-full" size="lg">
          <ArrowRight className="h-4 w-4 mr-2" />
          Start Logging Reps
        </Button>
        {!canConfirm && (
          <p className="text-[10px] text-destructive text-center">Select a rep source to continue</p>
        )}
      </CardContent>
    </Card>
  );
}
