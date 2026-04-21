// Deterministic correlation insights for the recap engine.
// Output of this module becomes a "source of truth" the AI must explain (not infer).

import type { GlobalContext } from './contextEngine.ts';

export interface CorrelationInsight {
  key: string;
  label: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
}

export function computeCorrelations(ctx: GlobalContext, painSummary?: { chronicAreas: any[]; avgScale: number }): CorrelationInsight[] {
  const out: CorrelationInsight[] = [];

  // 1. Block-vs-block MPI delta
  if (ctx.performance.mpi.current !== null && ctx.performance.mpi.prevBlock !== null) {
    const d = ctx.performance.mpi.delta!;
    out.push({
      key: 'mpi_block_delta',
      label: `MPI Δ vs prior block: ${d >= 0 ? '+' : ''}${d}`,
      detail: `Current ${ctx.performance.mpi.current} vs prior block ${ctx.performance.mpi.prevBlock}.`,
      impact: Math.abs(d) >= 5 ? 'high' : Math.abs(d) >= 2 ? 'medium' : 'low',
    });
  }

  // 2. Practice → Game transfer gap
  if (ctx.performance.transferGap !== null && ctx.performance.sessions.game.count >= 2) {
    const gap = ctx.performance.transferGap;
    if (Math.abs(gap) >= 10) {
      out.push({
        key: 'transfer_gap',
        label: `Transfer Gap: ${gap >= 0 ? '+' : ''}${gap} pts (practice vs game)`,
        detail: gap > 0
          ? `Practice grades are ${gap} pts higher than game grades. Reps not translating to live competition.`
          : `Game grades are ${Math.abs(gap)} pts higher than practice. Athlete competes above their practice baseline.`,
        impact: 'high',
      });
    }
  }

  // 3. Workload spike vs performance dip
  if (ctx.workload.spikeDetected && ctx.performance.sessions.practice.avgGrade !== null) {
    out.push({
      key: 'workload_spike',
      label: 'Weekly load spike detected',
      detail: `Weekly load series: [${ctx.workload.weeklyLoadSeries.join(', ')}]. One or more weeks exceeded 1.5× the block average — monitor for fatigue carry-over.`,
      impact: 'medium',
    });
  }

  // 4. Tool-performance gap unification (HIE)
  const gaps = ctx.systemIntel.hieSnapshot?.tool_performance_gaps || [];
  gaps.slice(0, 2).forEach((g: any, i: number) => {
    const delta = g.gap_score ?? g.delta ?? null;
    if (delta !== null && Math.abs(delta) >= 15) {
      out.push({
        key: `tool_gap_${i}`,
        label: `Tool↔Performance gap: ${g.tool_name || g.tool || 'tool'} (${delta} pts)`,
        detail: `Physical tool grade and on-field performance diverge by ${delta} pts — bridging this is a high-leverage opportunity.`,
        impact: 'high',
      });
    }
  });

  // 5. Pain-workload overlap
  if (painSummary && painSummary.chronicAreas.length > 0 && ctx.workload.spikeDetected) {
    out.push({
      key: 'overload_pain_link',
      label: 'Pain pattern overlaps workload spike',
      detail: `Chronic areas: ${painSummary.chronicAreas.map((c: any) => c.area).join(', ')}. Workload spike in same window — likely overload contribution.`,
      impact: 'high',
    });
  }

  // 6. HIE weakness clusters as system insight
  const clusters = ctx.systemIntel.hieSnapshot?.weakness_clusters || [];
  if (clusters.length > 0) {
    out.push({
      key: 'hie_clusters',
      label: `HIE Weakness Clusters: ${clusters.length}`,
      detail: `Top clusters: ${clusters.slice(0, 3).map((c: any) => c.area || c.cluster_name).filter(Boolean).join(', ')}.`,
      impact: 'medium',
    });
  }

  return out;
}
