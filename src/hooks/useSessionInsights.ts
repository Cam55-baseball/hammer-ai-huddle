import { useMemo } from 'react';
import { generateInsights, SessionInsights } from '@/lib/sessionInsights';

// Weighted scoring — core performance indexes carry more weight
const METRIC_WEIGHTS: Record<string, number> = {
  bqi: 1.5,
  pei: 1.5,
  fqi: 1.5,
  competitive_execution: 1.4,
  decision: 1.3,
};

interface PerformanceScore {
  score: number;
  label: string;
  color: string;
}

interface DrillBlock {
  drill_type?: string;
  drill_name?: string;
  intent?: string;
  volume?: number;
  execution_grade?: number;
  outcome_tags?: string[];
  micro_layer_data?: any[];
}

interface PracticeSession {
  id: string;
  sport: string;
  session_type: string;
  session_date: string;
  module: string;
  drill_blocks: any;
  notes: string | null;
  composite_indexes: any;
  coach_grade: number | null;
  session_context: any;
  effective_grade?: number | null;
}

function computeWeightedScore(composites: Record<string, number>): PerformanceScore | null {
  const entries = Object.entries(composites).filter(([, v]) => typeof v === 'number' && !isNaN(v));
  if (entries.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, value] of entries) {
    const w = METRIC_WEIGHTS[key] ?? 1.0;
    weightedSum += value * w;
    totalWeight += w;
  }
  const score = Math.round(weightedSum / totalWeight);

  if (score >= 60) return { score, label: 'Elite', color: 'text-green-500' };
  if (score >= 40) return { score, label: 'Solid', color: 'text-amber-500' };
  return { score, label: 'Developing', color: 'text-red-500' };
}

export function useSessionInsights(session: PracticeSession | null) {
  return useMemo(() => {
    if (!session) return { insights: null, perfScore: null, drillBlocks: [], composites: {} };

    const drillBlocks: DrillBlock[] = Array.isArray(session.drill_blocks) ? session.drill_blocks : [];
    const composites = (session.composite_indexes as Record<string, number> | null) ?? {};
    const sessionModule = session.module || 'hitting';

    const insights = generateInsights(composites, drillBlocks, sessionModule, {
      sessionDate: session.session_date,
      sessionType: session.session_type ?? undefined,
    });

    const perfScore = Object.keys(composites).length > 0
      ? computeWeightedScore(composites)
      : null;

    return { insights, perfScore, drillBlocks, composites };
  }, [session]);
}
