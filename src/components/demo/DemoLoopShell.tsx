import { ReactNode, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, TrendingUp } from 'lucide-react';
import { PrescribedVideoStrip } from './PrescribedVideoCard';
import { conversionCopy } from '@/demo/prescriptions/conversionCopy';
import { prescribe } from '@/demo/prescriptions/videoPrescription';
import { useDemoInteract } from '@/hooks/useDemoInteract';
import { useDemoProgress } from '@/hooks/useDemoProgress';

interface Benchmark {
  yourLabel: string;
  yourValue: string;
  eliteLabel: string;
  eliteValue: string;
  gapLabel: string;
  gapValue: string;
  projected: string;
  whyItMatters: string;
}

export interface DemoLoopShellProps {
  /** Slug used for navigation and event tagging. */
  fromSlug: string;
  /** Sim id (matches videoPrescription catalog key). */
  simId: string;
  /** Severity from the simulation output. */
  severity: 'minor' | 'moderate' | 'critical';
  /** Numeric or string gap surfaced into the conversion headline. */
  gap: number | string;
  /** Step 1 — input controls UI. */
  input: ReactNode;
  /** Step 2 — diagnosis / raw metrics UI. */
  diagnosis: ReactNode;
  /** Step 3 — benchmark vs you (auto-rendered). */
  benchmark: Benchmark;
}

export function DemoLoopShell({ fromSlug, simId, severity, gap, input, diagnosis, benchmark }: DemoLoopShellProps) {
  const navigate = useNavigate();
  const videos = prescribe({ simId, severity });
  const copy = conversionCopy(simId, severity, gap);
  useDemoInteract(fromSlug); // count container mounts as 1 interaction baseline; shells call bump() on input changes

  return (
    <div className="space-y-4">
      {/* 1 INPUT */}
      {input}

      {/* 2 DIAGNOSIS */}
      {diagnosis}

      {/* 3 INSIGHT */}
      <Card className="border-primary/30">
        <CardContent className="space-y-2 p-3">
          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-xs font-black uppercase tracking-wide">Where you stand</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label={benchmark.yourLabel} value={benchmark.yourValue} />
            <Mini label={benchmark.eliteLabel} value={benchmark.eliteValue} highlight />
            <Mini label={benchmark.gapLabel} value={benchmark.gapValue} accent />
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">{benchmark.whyItMatters}</p>
          <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold">{benchmark.projected}</span>
          </div>
        </CardContent>
      </Card>

      {/* 4 PRESCRIBED */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-black uppercase tracking-wide">Based on your result, we'd prescribe</p>
          <span className="text-[10px] text-muted-foreground">3 of {videos.length}</span>
        </div>
        <PrescribedVideoStrip videos={videos} fromSlug={fromSlug} />
      </div>

      {/* 5 LOCK CTA */}
      <Card className="border-primary/50 bg-gradient-to-b from-primary/15 to-transparent">
        <CardContent className="space-y-2 p-4 text-center">
          <h3 className="text-base font-black leading-tight">{copy.headline}</h3>
          <p className="text-xs text-muted-foreground">{copy.subhead}</p>
          <Button size="sm" className="gap-1.5"
            onClick={() => navigate(`/demo/upgrade?from=${fromSlug}&reason=${severity}&gap=${encodeURIComponent(String(gap))}`)}>
            <Sparkles className="h-4 w-4" /> {copy.cta}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${highlight ? 'border-primary/40 bg-primary/5' : accent ? 'border-destructive/40 bg-destructive/5' : 'bg-muted/30'}`}>
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}
