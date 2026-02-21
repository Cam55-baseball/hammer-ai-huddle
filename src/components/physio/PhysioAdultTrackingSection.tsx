import { usePhysioAdultTracking } from '@/hooks/usePhysioAdultTracking';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import { AlertTriangle, Heart, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LIBIDO_LABELS = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const SLEEP_RECOVERY_LABELS = ['', 'Exhausted', 'Groggy', 'Okay', 'Refreshed', 'Fully Restored'];
const MOOD_STABILITY_LABELS = ['', 'Volatile', 'Shaky', 'Neutral', 'Steady', 'Rock Solid'];
const CYCLE_PHASES = ['Menstrual', 'Follicular', 'Ovulatory', 'Luteal'];

function MetricRow({ label, value, subtitle }: { label: string; value: string | null; subtitle?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-violet-700/20 last:border-0">
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      <span className="text-xs font-bold text-violet-900 dark:text-violet-200 bg-violet-700/20 px-2.5 py-1 rounded-full">{value}</span>
    </div>
  );
}

export function PhysioAdultTrackingSection() {
  const { tracking, adultFeaturesEnabled } = usePhysioAdultTracking();
  const { profile } = usePhysioProfile();

  if (!adultFeaturesEnabled) return null;

  const sex = profile?.biological_sex;
  const isFemale = sex === 'female';
  const hasData = tracking && (
    tracking.libido_level || tracking.sleep_quality_impact || tracking.mood_stability ||
    tracking.wellness_consistency_text || tracking.cycle_phase || tracking.symptom_tags?.length
  );

  return (
    <div className="rounded-xl border-2 border-violet-700/40 bg-gradient-to-br from-violet-700/20 to-background p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-700/30">
            <Heart className="h-4 w-4 text-violet-300" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Adult Wellness Tracking</h3>
            <p className="text-xs text-muted-foreground">Tracked via Morning and Night Check-ins</p>
          </div>
        </div>
        <Badge className="bg-violet-700/30 border-violet-700/50 text-violet-300 text-[10px]">
          <Lock className="h-2.5 w-2.5 mr-1" /> Private
        </Badge>
      </div>

      {hasData ? (
        <div className="space-y-0">
          <MetricRow
            label="Libido / Sex Drive"
            value={tracking.libido_level ? `${tracking.libido_level}/5 — ${LIBIDO_LABELS[tracking.libido_level]}` : null}
          />
          <MetricRow
            label="Sleep Recovery Quality"
            value={tracking.sleep_quality_impact ? `${tracking.sleep_quality_impact}/5 — ${SLEEP_RECOVERY_LABELS[tracking.sleep_quality_impact]}` : null}
          />
          <MetricRow
            label="Mood Stability"
            value={tracking.mood_stability ? `${tracking.mood_stability}/5 — ${MOOD_STABILITY_LABELS[tracking.mood_stability]}` : null}
          />
          <MetricRow
            label="Overall Wellness"
            value={tracking.wellness_consistency_text || null}
          />
          {isFemale && (
            <>
              <MetricRow
                label="Cycle Phase"
                value={tracking.cycle_phase || null}
                subtitle={tracking.cycle_day ? `Day ${tracking.cycle_day}${tracking.period_active ? ' • Period Active' : ''}` : undefined}
              />
              {tracking.symptom_tags && tracking.symptom_tags.length > 0 && (
                <MetricRow
                  label="Body Signals"
                  value={tracking.symptom_tags.join(', ')}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Complete your morning or night check-in to see today's wellness data.
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 p-2 bg-violet-700/25 border border-violet-700/35 rounded-lg">
        <AlertTriangle className="h-3 w-3 text-violet-200 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-violet-100">
          Educational purposes only. Not medical advice. Data is private and encrypted.
        </p>
      </div>
    </div>
  );
}
