import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMPIScores } from '@/hooks/useMPIScores';
import { BarChart3, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function Row({ label, value, indent = false, bold = false }: { label: string; value: string; indent?: boolean; bold?: boolean }) {
  return (
    <div className={cn('flex justify-between items-center py-0.5', indent && 'pl-4')}>
      <span className={cn('text-xs', bold ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{label}</span>
      <span className={cn('text-xs font-mono', bold ? 'font-bold text-foreground' : 'text-foreground')}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border my-1" />;
}

export function MPIBreakdownCard() {
  const { data: mpi, isLoading } = useMPIScores();
  const [open, setOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-10 w-full" />;
  if (!mpi) return null;

  const rawComposite = (
    (mpi.composite_bqi ?? 0) * 0.25 +
    (mpi.composite_fqi ?? 0) * 0.15 +
    (mpi.composite_pei ?? 0) * 0.20 +
    (mpi.composite_decision ?? 0) * 0.20 +
    (mpi.composite_competitive ?? 0) * 0.20
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2"
        >
          <BarChart3 className="h-3 w-3" />
          {open ? 'Hide' : 'Show'} MPI Breakdown
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="border-dashed">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">MPI Calculation Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-0">
            <Row label="Raw Composite Score" value={rawComposite.toFixed(1)} />
            <Row label="BQI (25%)" value={(mpi.composite_bqi ?? 0).toFixed(1)} indent />
            <Row label="FQI (15%)" value={(mpi.composite_fqi ?? 0).toFixed(1)} indent />
            <Row label="PEI (20%)" value={(mpi.composite_pei ?? 0).toFixed(1)} indent />
            <Row label="Decision (20%)" value={(mpi.composite_decision ?? 0).toFixed(1)} indent />
            <Row label="Competitive (20%)" value={(mpi.composite_competitive ?? 0).toFixed(1)} indent />

            <Divider />

            <Row label="Tier Multiplier (×)" value={`${(mpi.tier_multiplier ?? 1).toFixed(2)}`} />
            <Row label="Age Curve (×)" value={`${(mpi.age_curve_multiplier ?? 1).toFixed(2)}`} />
            <Row label="Position Weight (×)" value={`${(mpi.position_weight ?? 1).toFixed(2)}`} />

            <Divider />

            <Row label="Verified Stat Boost" value={`+${(mpi.verified_stat_boost ?? 0).toFixed(1)}`} />
            {mpi.integrity_score != null && (
              <Row label="Integrity Score" value={`${Math.round(mpi.integrity_score)}%`} />
            )}
            <Row label="Contract Modifier (×)" value={`${(mpi.contract_status_modifier ?? 1).toFixed(2)}`} />

            <Divider />

            <Row label="FINAL MPI" value={Math.round(mpi.adjusted_global_score ?? 0).toString()} bold />
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
