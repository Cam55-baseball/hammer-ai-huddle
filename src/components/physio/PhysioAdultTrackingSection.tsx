import { usePhysioAdultTracking } from '@/hooks/usePhysioAdultTracking';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const CYCLE_PHASES = ['Menstrual', 'Follicular', 'Ovulatory', 'Luteal'];

function TapSelector({ options, selected, onSelect }: {
  options: string[];
  selected: string | null;
  onSelect: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            selected === opt
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function StarSelector({ max = 5, value, onSelect }: {
  max?: number;
  value: number | null;
  onSelect: (val: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onSelect(n === value ? 0 : n)}
          className={cn(
            'w-8 h-8 rounded-full border-2 text-sm font-bold transition-all',
            value !== null && n <= value
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-background border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function PhysioAdultTrackingSection() {
  const { tracking, adultFeaturesEnabled, saveTracking } = usePhysioAdultTracking();
  const { profile } = usePhysioProfile();

  if (!adultFeaturesEnabled) return null;

  // Read biological_sex from physio profile (self-contained, no extra query needed)
  const sex = profile?.biological_sex;
  const isFemale = sex === 'female';
  const isMale = sex === 'male';
  const hasContraceptive = profile?.contraceptive_use === true;

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          Adult Wellness Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Female: cycle tracking */}
        {isFemale && (
          <>
            {hasContraceptive && (
              <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Hormonal contraceptive noted — cycle phase tracking may reflect symptom patterns rather than natural hormonal fluctuations.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold">Cycle Phase</p>
              <TapSelector
                options={CYCLE_PHASES}
                selected={tracking?.cycle_phase ?? null}
                onSelect={val => saveTracking({ cycle_phase: val })}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Cycle Day (optional)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={35}
                  value={tracking?.cycle_day ?? ''}
                  onChange={e => saveTracking({ cycle_day: parseInt(e.target.value) || null })}
                  placeholder="Day #"
                  className="w-20 h-8 px-2 text-sm rounded-md border border-input bg-background text-foreground"
                />
                <button
                  type="button"
                  onClick={() => saveTracking({ period_active: !tracking?.period_active })}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                    tracking?.period_active
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-background border-border text-muted-foreground'
                  )}
                >
                  Period Active
                </button>
              </div>
            </div>
          </>
        )}

        {/* Male: wellness consistency */}
        {isMale && (
          <div className="space-y-2">
            <p className="text-xs font-semibold">Wellness Consistency Today</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveTracking({ wellness_consistency: true })}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                  tracking?.wellness_consistency === true
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-background border-border text-muted-foreground'
                )}
              >
                ✓ Feeling Consistent
              </button>
              <button
                type="button"
                onClick={() => saveTracking({ wellness_consistency: false })}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                  tracking?.wellness_consistency === false
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-background border-border text-muted-foreground'
                )}
              >
                Off Day
              </button>
            </div>
          </div>
        )}

        {/* Shared: energy level */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Energy Level (1–5, optional)</p>
          <StarSelector
            value={tracking?.libido_level ?? null}
            onSelect={val => saveTracking({ libido_level: val || null })}
          />
        </div>

        <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
          <AlertTriangle className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Educational purposes only. Not medical advice. Data is private and encrypted.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
