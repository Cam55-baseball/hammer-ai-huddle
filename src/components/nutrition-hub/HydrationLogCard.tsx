import { Button } from '@/components/ui/button';
import { Trash2, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { getLiquidTypeInfo } from '@/constants/hydrationClassification';
import {
  TIER_LABEL,
  TIER_TEXT_CLASS,
  TIER_BG_CLASS,
  type HydrationProfile,
} from '@/utils/hydrationScoring';
import { cn } from '@/lib/utils';
import type { HydrationLog } from '@/hooks/useHydration';

interface Props {
  log: HydrationLog;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export function HydrationLogCard({ log, onDelete, compact = false }: Props) {
  const baseInfo = log.liquid_type
    ? getLiquidTypeInfo(log.liquid_type)
    : { emoji: '💧', label: 'Water', value: 'water', defaultQuality: 'quality' as const };
  const customLabel = (log as any).custom_label as string | null | undefined;
  const info = customLabel && log.liquid_type === 'other'
    ? { ...baseInfo, label: customLabel, emoji: baseInfo?.emoji || '🫗' }
    : baseInfo;
  const profile = (log.hydration_profile as HydrationProfile | null | undefined) ?? null;

  // Legacy log: no nutrition profile → volume-only display.
  if (!profile) {
    return (
      <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
        <span>{info?.emoji || '💧'} {format(new Date(log.logged_at), 'h:mm a')}</span>
        <span className="font-medium">{log.amount_oz} oz</span>
        {onDelete && (
          <Button
            variant="ghost" size="icon"
            className="h-5 w-5 text-destructive hover:text-destructive"
            onClick={() => onDelete(log.id)}
            aria-label="Remove entry"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  const tier = profile.hydration_tier;
  // Backwards compat: legacy profiles may have sugar_penalty instead of sugar_score
  const sugarScoreValue = (profile as any).sugar_score ?? (profile as any).sugar_penalty ?? 0;

  return (
    <div className={cn('rounded-lg border p-3 space-y-2', TIER_BG_CLASS[tier])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{info?.emoji || '💧'}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {info?.label || log.liquid_type} · {log.amount_oz} oz
            </p>
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(log.logged_at), 'h:mm a')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={cn('flex items-center gap-1 font-bold leading-none', TIER_TEXT_CLASS[tier])}>
              <Gauge className="h-3.5 w-3.5" />
              <span className="text-base">{profile.hydration_score}</span>
            </div>
            <p className={cn('text-[10px] font-medium', TIER_TEXT_CLASS[tier])}>
              {TIER_LABEL[tier]}
            </p>
          </div>
          {onDelete && (
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete(log.id)}
              aria-label="Remove entry"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {((log as any).ai_estimated || (log as any).nutrition_incomplete) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(log as any).ai_estimated && (
            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground border border-border/50 px-2 py-0.5 text-[9px] font-medium">
              Estimated
            </span>
          )}
          {(log as any).nutrition_incomplete && (
            <span className="inline-flex items-center rounded-full bg-warning/15 text-warning px-2 py-0.5 text-[9px] font-medium">
              Partial data
            </span>
          )}
        </div>
      )}

      {!compact && (
        <>
          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            <Stat label="Water" value={`${profile.water_percent}%`} />
            <Stat label="Sodium" value={`${Math.round(Number(log.sodium_mg || 0))}mg`} />
            <Stat label="Potassium" value={`${Math.round(Number(log.potassium_mg || 0))}mg`} />
            <Stat label="Sugar" value={`${(Number(log.sugar_g || 0)).toFixed(1)}g`} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Magnesium: {Math.round(Number(log.magnesium_mg || 0))}mg</span>
            <span>Sugar Score: {sugarScoreValue}/100</span>
          </div>
          <p className="text-[11px] leading-snug text-foreground/80">{profile.insight}</p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-background/60 px-1.5 py-1 text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
