import { usePhysioAdultTracking } from '@/hooks/usePhysioAdultTracking';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import { AlertTriangle, Heart, Info } from 'lucide-react';
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
              : 'bg-violet-500/5 border-violet-500/20 text-foreground hover:border-violet-500/50'
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
              : 'bg-violet-500/5 border-violet-500/30 text-foreground hover:border-violet-400'
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

  const sex = profile?.biological_sex;
  const isFemale = sex === 'female';
  const isMale = sex === 'male';
  const hasContraceptive = profile?.contraceptive_use === true;

  return (
    <div className="rounded-xl border-2 border-violet-500/25 bg-gradient-to-br from-violet-500/8 to-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/15">
          <Heart className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h3 className="font-bold text-base leading-tight">Adult Wellness Tracking</h3>
          <p className="text-xs text-muted-foreground">Private &amp; encrypted</p>
        </div>
      </div>

      {/* Female: cycle tracking */}
      {isFemale && (
        <>
          {hasContraceptive && (
            <div className="flex items-start gap-2 p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <Info className="h-3 w-3 text-violet-300 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-violet-200">
                Hormonal contraceptive noted — cycle phase tracking may reflect symptom patterns rather than natural hormonal fluctuations.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Cycle Phase</p>
            <TapSelector
              options={CYCLE_PHASES}
              selected={tracking?.cycle_phase ?? null}
              onSelect={val => saveTracking({ cycle_phase: val })}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Cycle Day (optional)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={35}
                value={tracking?.cycle_day ?? ''}
                onChange={e => saveTracking({ cycle_day: parseInt(e.target.value) || null })}
                placeholder="Day #"
                className="w-20 h-8 px-2 text-sm rounded-md border border-violet-500/30 bg-violet-500/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-400"
              />
              <button
                type="button"
                onClick={() => saveTracking({ period_active: !tracking?.period_active })}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  tracking?.period_active
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-violet-500/5 border-violet-500/20 text-foreground'
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
          <p className="text-xs font-semibold text-foreground">Wellness Consistency Today</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveTracking({ wellness_consistency: true })}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                tracking?.wellness_consistency === true
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-violet-500/5 border-violet-500/20 text-foreground'
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
                  : 'bg-violet-500/5 border-violet-500/20 text-foreground'
              )}
            >
              Off Day
            </button>
          </div>
        </div>
      )}

      {/* Shared: energy level */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Energy Level (1–5, optional)</p>
        <StarSelector
          value={tracking?.libido_level ?? null}
          onSelect={val => saveTracking({ libido_level: val || null })}
        />
      </div>

      <div className="flex items-start gap-2 p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
        <AlertTriangle className="h-3 w-3 text-violet-300 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-violet-200">
          Educational purposes only. Not medical advice. Data is private and encrypted.
        </p>
      </div>
    </div>
  );
}
