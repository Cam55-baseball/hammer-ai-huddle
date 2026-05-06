import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Target, TrendingDown } from 'lucide-react';
import { PrescribedVideoStrip } from './PrescribedVideoCard';
import { GapBarChart } from './viz/GapBarChart';
import { SeverityMeter } from './viz/SeverityMeter';
import { SparkTrajectory } from './viz/SparkTrajectory';
import { CommitIntentDialog } from './CommitIntentDialog';
import { conversionCopy } from '@/demo/prescriptions/conversionCopy';
import { prescribe } from '@/demo/prescriptions/videoPrescription';
import { useDemoInteract } from '@/hooks/useDemoInteract';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { useDemoCompletion } from '@/hooks/useDemoCompletion';
import { logDemoEvent } from '@/demo/guard';

interface Benchmark {
  yourLabel: string;
  yourValue: string;
  eliteLabel: string;
  eliteValue: string;
  gapLabel: string;
  gapValue: string;
  projected: string;
  whyItMatters: string;
  /** Optional numeric values to power the GapBarChart + SparkTrajectory visuals. */
  yourNumeric?: number;
  eliteNumeric?: number;
  projectedNumeric?: number;
  unit?: string;
  decimals?: number;
}

export interface DemoLoopShellProps {
  fromSlug: string;
  simId: string;
  severity: 'minor' | 'moderate' | 'critical';
  gap: number | string;
  input: ReactNode;
  diagnosis: ReactNode;
  benchmark: Benchmark;
  /** For vault-style sims: percent of history currently visible. */
  visiblePct?: number;
}

export function DemoLoopShell({ fromSlug, simId, severity, gap, input, diagnosis, benchmark, visiblePct }: DemoLoopShellProps) {
  const navigate = useNavigate();
  const { progress, recordPrescribedShown, recordSimRun } = useDemoProgress();
  const { pct: completionPct } = useDemoCompletion();
  const shownIds = useMemo(
    () => new Set(progress?.prescribed_history?.[simId]?.shown ?? []),
    [progress, simId],
  );
  const videos = useMemo(() => prescribe({ simId, severity, shownIds }), [simId, severity, shownIds]);

  // Per-slug fallback if the global completion is 0 — keeps progress bar feeling alive on first interaction.
  const fallbackPct = useMemo(() => {
    const interactions = progress?.interaction_counts?.[fromSlug] ?? 0;
    const dwellSec = Math.min(60, (progress?.dwell_ms?.[fromSlug] ?? 0) / 1000);
    return Math.max(0, Math.min(100, Math.round(interactions * 15 + dwellSec)));
  }, [progress, fromSlug]);
  const pct = Math.max(completionPct ?? 0, fallbackPct);

  const copy = conversionCopy(simId, severity, gap, { pct, visiblePct });
  useDemoInteract(fromSlug);

  // Micro-interaction gate — delay hard CTA until the user does ONE thing.
  const [unlocked, setUnlocked] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [aggressive, setAggressive] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const previewClicked = viewCount > 0;
  const commitShownRef = useRef(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (unlocked) return;
    const el = stripRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.some(e => e.isIntersecting);
      if (visible && !timer) {
        timer = setTimeout(() => setUnlocked(true), 1500);
      } else if (!visible && timer) {
        clearTimeout(timer);
        timer = null;
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => { obs.disconnect(); if (timer) clearTimeout(timer); };
  }, [unlocked]);

  // Open commit dialog once the user is engaged
  useEffect(() => {
    if ((unlocked || previewClicked) && !commitShownRef.current) {
      commitShownRef.current = true;
      setCommitOpen(true);
    }
  }, [unlocked, previewClicked]);

  // Persist sim run + prescription history + cta_viewed
  useEffect(() => {
    void recordSimRun(simId, severity, gap);
    void recordPrescribedShown(simId, videos.map(v => v.id));
    logDemoEvent('cta_viewed', { simId, severity, gap, pct, fromSlug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simId, severity, gap]);

  // Micro-yes CTA copy escalation (overrides severity copy unless pct>70 wins)
  const microCta = (() => {
    if (pct > 70) return copy.cta; // existing override wins
    if (viewCount >= 2) return 'Get my full system';
    if (previewClicked) return 'Finish unlocking your plan';
    return 'See how to fix this';
  })();

  const goUpgrade = () => {
    logDemoEvent('cta_clicked', { simId, severity, gap, pct, fromSlug });
    const params = new URLSearchParams({
      from: fromSlug,
      reason: severity,
      gap: String(gap),
      pct: String(pct),
      sim: simId,
      your: benchmark.yourValue,
      elite: benchmark.eliteValue,
      projected: benchmark.projected,
    });
    navigate(`/demo/upgrade?${params.toString()}`);
  };

  const handleCommitYes = () => {
    logDemoEvent('commit_intent', { simId, severity, gap, pct, fromSlug });
    setCommitOpen(false);
    goUpgrade();
  };
  const handleCommitNo = () => {
    setCommitOpen(false);
    setAggressive(true);
  };

  const handlePreviewClick = () => {
    setUnlocked(true);
    setViewCount(c => c + 1);
  };

  return (
    <div className="space-y-4">
      {/* 1 INPUT */}
      {input}

      {/* 2 DIAGNOSIS */}
      {diagnosis}

      {/* 3 INSIGHT */}
      <Card className="border-primary/30">
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs font-black uppercase tracking-wide">Where you stand</p>
            </div>
            <SeverityMeter severity={severity} />
          </div>
          {benchmark.yourNumeric != null && benchmark.eliteNumeric != null ? (
            <GapBarChart
              yourValue={benchmark.yourNumeric}
              eliteValue={benchmark.eliteNumeric}
              yourLabel={benchmark.yourLabel}
              eliteLabel={benchmark.eliteLabel}
              unit={benchmark.unit}
              projectedValue={benchmark.projectedNumeric}
              decimals={benchmark.decimals ?? 0}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label={benchmark.yourLabel} value={benchmark.yourValue} />
              <Mini label={benchmark.eliteLabel} value={benchmark.eliteValue} highlight />
              <Mini label={benchmark.gapLabel} value={benchmark.gapValue} accent />
            </div>
          )}
          <div className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <span className="font-bold text-destructive-foreground/90">{copy.lossStatement}</span>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">{benchmark.whyItMatters}</p>
          <div className="flex items-center justify-between gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-xs">
            {benchmark.yourNumeric != null && benchmark.projectedNumeric != null ? (
              <SparkTrajectory
                from={benchmark.yourNumeric}
                to={benchmark.projectedNumeric}
                unit={benchmark.unit}
                label={benchmark.projected}
              />
            ) : (
              <span className="font-bold">{benchmark.projected}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4 PRESCRIBED */}
      <div className="space-y-2" ref={stripRef}>
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-black uppercase tracking-wide">Based on your result, we'd prescribe</p>
          <span className="text-[10px] text-muted-foreground">3 of {videos.length}</span>
        </div>
        <PrescribedVideoStrip
          videos={videos}
          fromSlug={fromSlug}
          simId={simId}
          onPreviewClick={handlePreviewClick}
        />
      </div>

      {/* 5 ALMOST UNLOCKED */}
      <div className="space-y-1.5 rounded-md border bg-muted/20 px-3 py-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold">{copy.almostUnlockedLine}</span>
          <span className="font-black text-primary">{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      {/* 6 LOCK CTA — gated by micro-interaction */}
      {unlocked ? (
        <Card className={`border-primary/50 bg-gradient-to-b from-primary/15 to-transparent ${aggressive ? 'ring-2 ring-primary/60 shadow-[0_0_24px_-6px_hsl(var(--primary))]' : ''}`}>
          <CardContent className="space-y-2 p-4 text-center">
            <h3 className="text-base font-black leading-tight">{copy.headline}</h3>
            <p className="text-xs text-muted-foreground">{copy.subhead}</p>
            <Button size={aggressive ? 'default' : 'sm'} className="gap-1.5" onClick={goUpgrade}>
              <Sparkles className="h-4 w-4" /> {microCta}
            </Button>
            <p className="pt-1 text-[10px] italic text-muted-foreground">{copy.socialProof}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Tap a drill above to see your unlock path.</p>
          </CardContent>
        </Card>
      )}

      <CommitIntentDialog
        open={commitOpen}
        onOpenChange={setCommitOpen}
        onYes={handleCommitYes}
        onNo={handleCommitNo}
      />
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
