import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RepSourceSelector } from './RepSourceSelector';
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

const environmentOptions = [
  { value: 'practice', label: 'Practice' },
  { value: 'game', label: 'Game' },
  { value: 'lesson', label: 'Lesson' },
];

export function SessionConfigPanel({ module, sessionType, onConfirm, onBack }: SessionConfigPanelProps) {
  const { machineVelocityBands, pitchingVelocityBands } = useSportConfig();
  const { user } = useAuth();
  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';

  const [repSource, setRepSource] = useState<string>('');
  const [pitchDistance, setPitchDistance] = useState(60);
  const [velocityBand, setVelocityBand] = useState<string | undefined>();
  const [seasonContext, setSeasonContext] = useState('in_season');
  const [environment, setEnvironment] = useState<'practice' | 'game' | 'lesson'>(
    sessionType === 'game' || sessionType === 'live_scrimmage' ? 'game' : 'practice'
  );
  const [indoorOutdoor, setIndoorOutdoor] = useState<'indoor' | 'outdoor'>('outdoor');
  const [coachSelection, setCoachSelection] = useState<CoachSelection>({ type: 'none' });
  const [coachSessionType, setCoachSessionType] = useState<'solo' | 'coached' | 'lesson'>('solo');

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

  // Auto-select head coach when switching to coached/lesson, reset on solo
  useEffect(() => {
    if (coachSessionType === 'solo') {
      setCoachSelection({ type: 'none' });
    } else if (mpiSettings?.primary_coach_id && headCoachName) {
      setCoachSelection({
        type: 'assigned',
        coach_id: mpiSettings.primary_coach_id,
        coach_name: headCoachName,
      });
    }
  }, [coachSessionType, mpiSettings?.primary_coach_id, headCoachName]);

  const velocityBands = isHitting ? machineVelocityBands : pitchingVelocityBands;
  const canConfirm = !!repSource;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      rep_source: repSource,
      pitch_distance_ft: pitchDistance,
      velocity_band: velocityBand,
      season_context: seasonContext,
      environment,
      indoor_outdoor: indoorOutdoor,
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

        {/* Pitch Distance */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Pitch Release Distance: <span className="font-semibold text-foreground">{pitchDistance} ft</span>
          </Label>
          <Slider
            min={15} max={80} step={1}
            value={[pitchDistance]}
            onValueChange={([v]) => setPitchDistance(v)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>15 ft</span>
            <span>80 ft</span>
          </div>
        </div>

        {/* Velocity Band */}
        {(isHitting || isPitching) && (
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

        {/* Coach */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground block">Session Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['solo', 'coached', 'lesson'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setCoachSessionType(t)}
                className={cn(
                  'rounded-md border p-2.5 text-xs font-medium transition-all text-center',
                  coachSessionType === t
                    ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                    : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                )}
              >
                {t === 'solo' ? 'Solo' : t === 'coached' ? 'Coach-Led' : 'Lesson'}
              </button>
            ))}
          </div>
          {coachSessionType !== 'solo' && (
            <CoachSelector value={coachSelection} onChange={setCoachSelection} />
          )}
        </div>

        {/* Environment */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Environment</Label>
          <div className="flex rounded-lg border overflow-hidden">
            {environmentOptions.map(e => (
              <button
                key={e.value}
                type="button"
                onClick={() => setEnvironment(e.value as any)}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-all',
                  environment === e.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/20 hover:bg-muted text-muted-foreground'
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indoor/Outdoor */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Indoor</Label>
          <Switch
            checked={indoorOutdoor === 'outdoor'}
            onCheckedChange={v => setIndoorOutdoor(v ? 'outdoor' : 'indoor')}
          />
          <Label className="text-xs text-muted-foreground">Outdoor</Label>
        </div>

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
