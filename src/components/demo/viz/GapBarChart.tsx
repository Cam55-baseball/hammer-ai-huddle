import { motion } from 'framer-motion';

interface Props {
  yourValue: number;
  eliteValue: number;
  yourLabel?: string;
  eliteLabel?: string;
  unit?: string;
  projectedValue?: number;
  decimals?: number;
}

export function GapBarChart({
  yourValue, eliteValue, yourLabel = 'You', eliteLabel = 'Elite',
  unit, projectedValue, decimals = 0,
}: Props) {
  const max = Math.max(yourValue, eliteValue, projectedValue ?? 0) * 1.05 || 1;
  const yourPct = Math.max(2, (yourValue / max) * 100);
  const elitePct = Math.max(2, (eliteValue / max) * 100);
  const projPct = projectedValue != null ? Math.max(2, (projectedValue / max) * 100) : null;
  const fmt = (n: number) => `${n.toFixed(decimals)}${unit ? ' ' + unit : ''}`;

  return (
    <div className="space-y-2">
      <Row label={yourLabel} value={fmt(yourValue)} pct={yourPct} tone="muted" projPct={projPct} />
      <Row label={eliteLabel} value={fmt(eliteValue)} pct={elitePct} tone="primary" />
      {projectedValue != null && (
        <p className="text-[10px] italic text-muted-foreground">
          Dashed bar shows your projected {fmt(projectedValue)} after the prescribed plan.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, pct, tone, projPct }: {
  label: string; value: string; pct: number; tone: 'muted' | 'primary'; projPct?: number | null;
}) {
  const fill = tone === 'primary' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)';
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-black">{value}</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/40">
        <motion.div
          className="h-full rounded-full"
          style={{ background: fill }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {projPct != null && (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full border-2 border-dashed border-primary"
            initial={{ width: `${pct}%` }}
            animate={{ width: `${projPct}%` }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.5 }}
          />
        )}
      </div>
    </div>
  );
}
