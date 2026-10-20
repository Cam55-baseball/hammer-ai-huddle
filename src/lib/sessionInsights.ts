// Entered practice scores are not independently observed mechanical faults.
type Composites = Record<string, number>;
type DrillBlock = { drill_name?: string; label?: string; volume?: number };
export interface SessionContext { sessionType?: string; sessionDate?: string; variationOffset?: number }
export interface SessionInsights {
  win: string | null; focus: string | null; nextRepCue: string | null;
  keyMetrics: { label: string; value: number; color: 'green' | 'amber' | 'red' }[];
  sessionTag: string; focusMetric: string | null;
}
export function generateInsights(
  _composites: Composites | null | undefined, _blocks: DrillBlock[] | null | undefined,
  _module: string, _context?: SessionContext,
): SessionInsights {
  return { win: null, focus: null, nextRepCue: null, keyMetrics: [], sessionTag: 'Logged practice', focusMetric: null };
}
export function getTotalReps(blocks: DrillBlock[] | null | undefined): number {
  return (blocks ?? []).reduce((total, block) => total + (
    typeof block.volume === 'number' && Number.isInteger(block.volume) && block.volume > 0 ? block.volume : 0
  ), 0);
}
export function getDrillCount(blocks: DrillBlock[] | null | undefined): number { return blocks?.length ?? 0; }
