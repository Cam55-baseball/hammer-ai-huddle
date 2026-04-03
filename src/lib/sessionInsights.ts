// Deterministic insight engine for post-session feedback
// No AI calls — pure logic from composite_indexes + drill_blocks

type Composites = Record<string, number>;
type DrillBlock = { drill_name?: string; label?: string; volume?: number };

interface SessionInsights {
  win: string | null;
  focus: string | null;
  nextRepCue: string | null;
  keyMetrics: { label: string; value: number; color: 'green' | 'amber' | 'red' }[];
  sessionTag: string;
}

// Module-aware metric relevance
const MODULE_METRICS: Record<string, string[]> = {
  hitting: ['bqi', 'decision', 'barrel_pct', 'chase_pct', 'whiff_pct', 'hard_contact_pct', 'line_drive_pct', 'competitive_execution'],
  pitching: ['pei', 'avg_zone_pct', 'competitive_execution', 'first_pitch_strike_pct'],
  fielding: ['fqi', 'avg_footwork_grade', 'avg_clean_field_pct', 'competitive_execution'],
  throwing: ['competitive_execution', 'avg_accuracy_grade'],
  baserunning: ['competitive_execution'],
  bunting: ['bqi', 'competitive_execution'],
};

// Thresholds: above = strong, below = weak
const METRIC_THRESHOLDS: Record<string, { strong: number; weak: number }> = {
  bqi: { strong: 60, weak: 40 },
  pei: { strong: 60, weak: 40 },
  fqi: { strong: 60, weak: 40 },
  decision: { strong: 60, weak: 40 },
  competitive_execution: { strong: 60, weak: 40 },
  barrel_pct: { strong: 28, weak: 15 },
  chase_pct: { strong: 25, weak: 35 }, // inverted: lower is better
  whiff_pct: { strong: 18, weak: 30 }, // inverted: lower is better
  hard_contact_pct: { strong: 35, weak: 20 },
  line_drive_pct: { strong: 25, weak: 15 },
  avg_zone_pct: { strong: 55, weak: 40 },
  first_pitch_strike_pct: { strong: 60, weak: 45 },
  avg_footwork_grade: { strong: 65, weak: 45 },
  avg_clean_field_pct: { strong: 80, weak: 60 },
  avg_accuracy_grade: { strong: 65, weak: 45 },
};

// Inverted metrics (lower = better)
const INVERTED = new Set(['chase_pct', 'whiff_pct']);

const METRIC_LABELS: Record<string, string> = {
  bqi: 'Bat Quality',
  pei: 'Pitching Efficiency',
  fqi: 'Field Quality',
  decision: 'Decision',
  competitive_execution: 'Competitive',
  barrel_pct: 'Barrel %',
  chase_pct: 'Chase %',
  whiff_pct: 'Whiff %',
  hard_contact_pct: 'Hard Contact %',
  line_drive_pct: 'Line Drive %',
  avg_zone_pct: 'Zone %',
  first_pitch_strike_pct: '1st Pitch Strike %',
  avg_footwork_grade: 'Footwork',
  avg_clean_field_pct: 'Clean Field %',
  avg_accuracy_grade: 'Accuracy',
};

// Win message templates
const WIN_MESSAGES: Record<string, (val: number) => string> = {
  bqi: (v) => `Bat quality was elite at ${Math.round(v)} — dominant swing session`,
  pei: (v) => `Pitching efficiency hit ${Math.round(v)} — sharp command today`,
  fqi: (v) => `Fielding quality reached ${Math.round(v)} — clean glove work`,
  decision: (v) => `Decision-making was elite at ${Math.round(v)}`,
  competitive_execution: (v) => `Competitive execution locked in at ${Math.round(v)}`,
  barrel_pct: (v) => `Barrel rate hit ${v.toFixed(0)}% — above pro average`,
  chase_pct: (v) => `Chase discipline was elite — only ${v.toFixed(0)}% chase rate`,
  whiff_pct: (v) => `Contact quality was strong — just ${v.toFixed(0)}% whiff rate`,
  hard_contact_pct: (v) => `${v.toFixed(0)}% hard contact — you were squaring it up`,
  line_drive_pct: (v) => `Line drive rate at ${v.toFixed(0)}% — pure contact`,
  avg_zone_pct: (v) => `${v.toFixed(0)}% zone rate — filling up the strike zone`,
  first_pitch_strike_pct: (v) => `${v.toFixed(0)}% first-pitch strikes — attacking early`,
  avg_footwork_grade: (v) => `Footwork was crisp at ${Math.round(v)}`,
  avg_clean_field_pct: (v) => `${v.toFixed(0)}% clean field rate — smooth hands today`,
  avg_accuracy_grade: (v) => `Throw accuracy at ${Math.round(v)} — on target`,
};

// Focus message templates
const FOCUS_MESSAGES: Record<string, (val: number) => string> = {
  bqi: (v) => `Bat quality at ${Math.round(v)} — swing mechanics need attention`,
  pei: (v) => `Pitching efficiency at ${Math.round(v)} — missing spots`,
  fqi: (v) => `Field quality at ${Math.round(v)} — tighten up fundamentals`,
  decision: (v) => `Decision index at ${Math.round(v)} — swinging at the wrong pitches`,
  competitive_execution: (v) => `Competitive execution at ${Math.round(v)} — inconsistent intensity`,
  barrel_pct: (v) => `Barrel rate at just ${v.toFixed(0)}% — not centering the ball`,
  chase_pct: (v) => `Chase rate spiked to ${v.toFixed(0)}% — costing quality at-bats`,
  whiff_pct: (v) => `Whiff rate at ${v.toFixed(0)}% — bat path needs tightening`,
  hard_contact_pct: (v) => `Only ${v.toFixed(0)}% hard contact — need more authority`,
  line_drive_pct: (v) => `Line drive rate at ${v.toFixed(0)}% — too many ground balls`,
  avg_zone_pct: (v) => `Only ${v.toFixed(0)}% in zone — command was off`,
  first_pitch_strike_pct: (v) => `${v.toFixed(0)}% first-pitch strikes — falling behind`,
  avg_footwork_grade: (v) => `Footwork grade at ${Math.round(v)} — feet were slow`,
  avg_clean_field_pct: (v) => `Clean field rate at ${v.toFixed(0)}% — bobbles hurt`,
  avg_accuracy_grade: (v) => `Accuracy at ${Math.round(v)} — throws were scattered`,
};

// Next rep cue mapped from focus metric
const NEXT_REP_CUES: Record<string, string> = {
  bqi: 'Focus on staying through the ball — let the barrel work',
  pei: 'Locate your fastball first, then expand',
  fqi: 'Hands out front, clean the angle',
  decision: 'See it deeper before committing',
  competitive_execution: 'Compete every single rep — no free ones',
  barrel_pct: 'Stay inside the ball and trust your hands',
  chase_pct: 'Lay off the first pitch outside the zone',
  whiff_pct: 'Shorten up and stay through the middle',
  hard_contact_pct: 'Attack the inner half — drive through contact',
  line_drive_pct: 'Stay on top, hit through the middle of the field',
  avg_zone_pct: 'Hit your spots early — attack the zone',
  first_pitch_strike_pct: 'Establish the strike zone from pitch one',
  avg_footwork_grade: 'Get your feet set before the ball arrives',
  avg_clean_field_pct: 'Soft hands, work through the ball',
  avg_accuracy_grade: 'Step toward your target on every throw',
};

function getDeviationScore(metric: string, value: number): number {
  const t = METRIC_THRESHOLDS[metric];
  if (!t) return 0;
  if (INVERTED.has(metric)) {
    // Lower is better: strong threshold is the LOW end
    return (t.strong - value) / (t.weak - t.strong); // positive = good, negative = bad
  }
  return (value - t.strong) / (t.strong - t.weak); // positive = good
}

function metricColor(metric: string, value: number): 'green' | 'amber' | 'red' {
  const t = METRIC_THRESHOLDS[metric];
  if (!t) return 'amber';
  if (INVERTED.has(metric)) {
    if (value <= t.strong) return 'green';
    if (value >= t.weak) return 'red';
    return 'amber';
  }
  if (value >= t.strong) return 'green';
  if (value <= t.weak) return 'red';
  return 'amber';
}

export function generateInsights(
  composites: Composites | null | undefined,
  drillBlocks: DrillBlock[] | null | undefined,
  module: string
): SessionInsights {
  const fallback: SessionInsights = {
    win: null,
    focus: null,
    nextRepCue: null,
    keyMetrics: [],
    sessionTag: 'Solid Work',
  };

  if (!composites || Object.keys(composites).length === 0) return fallback;

  const relevantMetrics = MODULE_METRICS[module] ?? MODULE_METRICS.hitting;
  
  // Score each available metric by deviation
  const scored: { metric: string; value: number; deviation: number }[] = [];
  for (const m of relevantMetrics) {
    const val = composites[m];
    if (val == null || isNaN(val)) continue;
    scored.push({ metric: m, value: val, deviation: getDeviationScore(m, val) });
  }

  if (scored.length === 0) return fallback;

  // Sort by deviation: highest = best win, lowest = worst focus
  const sorted = [...scored].sort((a, b) => b.deviation - a.deviation);
  
  const bestMetric = sorted[0];
  const worstMetric = sorted[sorted.length - 1];

  // Win: only if actually strong
  const win = bestMetric.deviation > 0
    ? (WIN_MESSAGES[bestMetric.metric]?.(bestMetric.value) ?? null)
    : null;

  // Focus: only if actually weak
  const focus = worstMetric.deviation < 0
    ? (FOCUS_MESSAGES[worstMetric.metric]?.(worstMetric.value) ?? null)
    : null;

  const focusMetric = worstMetric.deviation < 0 ? worstMetric.metric : null;
  const nextRepCue = focusMetric ? (NEXT_REP_CUES[focusMetric] ?? null) : null;

  // Key metrics: top 3, prioritize win and focus metrics
  const usedMetrics = new Set<string>();
  const keyMetrics: SessionInsights['keyMetrics'] = [];
  
  // Always include win and focus metrics if they exist
  if (bestMetric.deviation > 0) usedMetrics.add(bestMetric.metric);
  if (focusMetric) usedMetrics.add(focusMetric);
  
  for (const m of [bestMetric.metric, focusMetric, ...sorted.map(s => s.metric)]) {
    if (!m || keyMetrics.length >= 3) break;
    if (keyMetrics.some(k => k.label === METRIC_LABELS[m])) continue;
    const val = composites[m];
    if (val == null) continue;
    keyMetrics.push({
      label: METRIC_LABELS[m] ?? m,
      value: Math.round(val * 10) / 10,
      color: metricColor(m, val),
    });
  }

  // Session tag
  const sessionTag = deriveSessionTag(composites, scored, module);

  return { win, focus, nextRepCue, keyMetrics, sessionTag };
}

function deriveSessionTag(
  composites: Composites,
  scored: { metric: string; deviation: number }[],
  module: string
): string {
  const avgDeviation = scored.reduce((s, x) => s + x.deviation, 0) / scored.length;
  
  // Check specific patterns
  if (module === 'hitting' || module === 'bunting') {
    if ((composites.barrel_pct ?? 0) >= 30 && (composites.hard_contact_pct ?? 0) >= 35) return 'Power Day';
    if ((composites.chase_pct ?? 0) >= 35) return 'Chase Spike';
    if ((composites.whiff_pct ?? 0) >= 30) return 'Contact Issues';
  }
  
  if (avgDeviation >= 0.5) return 'Elite Execution';
  if (avgDeviation >= 0) return 'Solid Work';
  if (avgDeviation >= -0.3) return 'Building';
  return 'Grind Session';
}

export function getTotalReps(drillBlocks: DrillBlock[] | null | undefined): number {
  if (!drillBlocks) return 0;
  return drillBlocks.reduce((sum, b) => sum + (b.volume || 0), 0);
}

export function getDrillCount(drillBlocks: DrillBlock[] | null | undefined): number {
  if (!drillBlocks) return 0;
  return drillBlocks.length;
}
