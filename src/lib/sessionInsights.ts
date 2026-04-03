// Deterministic insight engine for post-session feedback
// No AI calls — pure logic from composite_indexes + drill_blocks

type Composites = Record<string, number>;
type DrillBlock = { drill_name?: string; label?: string; volume?: number };

export interface SessionContext {
  sessionType?: string;
  sessionDate?: string;
  variationOffset?: number; // from repetition detection
}

export interface SessionInsights {
  win: string | null;
  focus: string | null;
  nextRepCue: string | null;
  keyMetrics: { label: string; value: number; color: 'green' | 'amber' | 'red' }[];
  sessionTag: string;
  focusMetric: string | null;
}

// ─── Module-aware metric relevance ───
const MODULE_METRICS: Record<string, string[]> = {
  hitting: ['bqi', 'decision', 'barrel_pct', 'chase_pct', 'whiff_pct', 'hard_contact_pct', 'line_drive_pct', 'competitive_execution'],
  pitching: ['pei', 'avg_zone_pct', 'competitive_execution', 'first_pitch_strike_pct'],
  fielding: ['fqi', 'avg_footwork_grade', 'avg_clean_field_pct', 'competitive_execution'],
  throwing: ['competitive_execution', 'avg_accuracy_grade'],
  baserunning: ['competitive_execution'],
  bunting: ['bqi', 'competitive_execution'],
};

// ─── Thresholds ───
const METRIC_THRESHOLDS: Record<string, { strong: number; weak: number }> = {
  bqi: { strong: 60, weak: 40 },
  pei: { strong: 60, weak: 40 },
  fqi: { strong: 60, weak: 40 },
  decision: { strong: 60, weak: 40 },
  competitive_execution: { strong: 60, weak: 40 },
  barrel_pct: { strong: 28, weak: 15 },
  chase_pct: { strong: 25, weak: 35 }, // inverted
  whiff_pct: { strong: 18, weak: 30 }, // inverted
  hard_contact_pct: { strong: 35, weak: 20 },
  line_drive_pct: { strong: 25, weak: 15 },
  avg_zone_pct: { strong: 55, weak: 40 },
  first_pitch_strike_pct: { strong: 60, weak: 45 },
  avg_footwork_grade: { strong: 65, weak: 45 },
  avg_clean_field_pct: { strong: 80, weak: 60 },
  avg_accuracy_grade: { strong: 65, weak: 45 },
};

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

// ─── Deterministic hash for variation selection ───
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickVariation<T>(arr: T[], seed: string, offset: number = 0): T {
  const idx = (simpleHash(seed) + offset) % arr.length;
  return arr[idx];
}

// ─── WIN VARIATIONS (2-3 per metric) ───
const WIN_VARIATIONS: Record<string, ((v: number) => string)[]> = {
  bqi: [
    (v) => `Bat quality was elite at ${Math.round(v)} — dominant swing session`,
    (v) => `${Math.round(v)} bat quality — your swing was locked in today`,
    (v) => `BQ at ${Math.round(v)} — that's an elite-level swing`,
  ],
  pei: [
    (v) => `Pitching efficiency hit ${Math.round(v)} — sharp command today`,
    (v) => `${Math.round(v)} pitching efficiency — you were dealing`,
    (v) => `PE at ${Math.round(v)} — that's pro-level execution`,
  ],
  fqi: [
    (v) => `Fielding quality reached ${Math.round(v)} — clean glove work`,
    (v) => `${Math.round(v)} field quality — smooth and reliable`,
    (v) => `FQ at ${Math.round(v)} — nothing got past you`,
  ],
  decision: [
    (v) => `Decision-making was elite at ${Math.round(v)}`,
    (v) => `${Math.round(v)} decision index — you read every pitch`,
    (v) => `Your pitch selection was sharp — ${Math.round(v)} decision score`,
  ],
  competitive_execution: [
    (v) => `Competitive execution locked in at ${Math.round(v)}`,
    (v) => `${Math.round(v)} competitive score — you brought the intensity`,
    (v) => `Competition mode: ON — ${Math.round(v)} execution`,
  ],
  barrel_pct: [
    (v) => `Barrel rate hit ${v.toFixed(0)}% — above pro average`,
    (v) => `${v.toFixed(0)}% barrels — you found the sweet spot consistently`,
    (v) => `You barreled ${v.toFixed(0)}% of swings — that's elite contact`,
  ],
  chase_pct: [
    (v) => `Chase discipline was elite — only ${v.toFixed(0)}% chase rate`,
    (v) => `You laid off pitches outside the zone — just ${v.toFixed(0)}% chases`,
    (v) => `${v.toFixed(0)}% chase rate — that's pro-level plate discipline`,
  ],
  whiff_pct: [
    (v) => `Contact quality was strong — just ${v.toFixed(0)}% whiff rate`,
    (v) => `Only ${v.toFixed(0)}% whiffs — you put the bat on the ball`,
    (v) => `${v.toFixed(0)}% whiff rate — your timing was dialed in`,
  ],
  hard_contact_pct: [
    (v) => `${v.toFixed(0)}% hard contact — you were squaring it up`,
    (v) => `Hard contact at ${v.toFixed(0)}% — real authority on your swings`,
    (v) => `You drove the ball hard ${v.toFixed(0)}% of the time — power was there`,
  ],
  line_drive_pct: [
    (v) => `Line drive rate at ${v.toFixed(0)}% — pure contact`,
    (v) => `${v.toFixed(0)}% line drives — you stayed through the ball`,
    (v) => `LD rate at ${v.toFixed(0)}% — that's a hitter's approach`,
  ],
  avg_zone_pct: [
    (v) => `${v.toFixed(0)}% zone rate — filling up the strike zone`,
    (v) => `You attacked the zone at ${v.toFixed(0)}% — ahead in every count`,
    (v) => `Zone rate at ${v.toFixed(0)}% — you were painting corners`,
  ],
  first_pitch_strike_pct: [
    (v) => `${v.toFixed(0)}% first-pitch strikes — attacking early`,
    (v) => `First-pitch strikes at ${v.toFixed(0)}% — you set the tone`,
    (v) => `${v.toFixed(0)}% FPS — you owned the count from pitch one`,
  ],
  avg_footwork_grade: [
    (v) => `Footwork was crisp at ${Math.round(v)}`,
    (v) => `${Math.round(v)} footwork — quick and balanced`,
    (v) => `Feet were moving at ${Math.round(v)} — elite positioning`,
  ],
  avg_clean_field_pct: [
    (v) => `${v.toFixed(0)}% clean field rate — smooth hands today`,
    (v) => `Clean field at ${v.toFixed(0)}% — fundamentals were on point`,
    (v) => `${v.toFixed(0)}% clean fielding — nothing bobbled`,
  ],
  avg_accuracy_grade: [
    (v) => `Throw accuracy at ${Math.round(v)} — on target`,
    (v) => `${Math.round(v)} accuracy — your arm was locked in`,
    (v) => `Throwing accuracy hit ${Math.round(v)} — every throw had a purpose`,
  ],
};

// ─── FOCUS VARIATIONS (2-3 per metric) ───
const FOCUS_VARIATIONS: Record<string, ((v: number) => string)[]> = {
  bqi: [
    (v) => `Bat quality at ${Math.round(v)} — swing mechanics need attention`,
    (v) => `${Math.round(v)} BQ — your swing wasn't connecting today`,
    (v) => `Bat quality dipped to ${Math.round(v)} — timing was off`,
  ],
  pei: [
    (v) => `Pitching efficiency at ${Math.round(v)} — missing spots`,
    (v) => `PE at ${Math.round(v)} — command wasn't sharp`,
    (v) => `${Math.round(v)} pitching efficiency — too many wasted pitches`,
  ],
  fqi: [
    (v) => `Field quality at ${Math.round(v)} — tighten up fundamentals`,
    (v) => `${Math.round(v)} FQ — hands and feet weren't in sync`,
    (v) => `Fielding dipped to ${Math.round(v)} — clean up the routine plays`,
  ],
  decision: [
    (v) => `Decision index at ${Math.round(v)} — swinging at the wrong pitches`,
    (v) => `${Math.round(v)} decisions — your plan wasn't clear`,
    (v) => `Decision score at ${Math.round(v)} — you were guessing out there`,
  ],
  competitive_execution: [
    (v) => `Competitive execution at ${Math.round(v)} — inconsistent intensity`,
    (v) => `${Math.round(v)} competitive — some reps lacked purpose`,
    (v) => `Execution dipped to ${Math.round(v)} — not every rep counted`,
  ],
  barrel_pct: [
    (v) => `Barrel rate at just ${v.toFixed(0)}% — not centering the ball`,
    (v) => `Only ${v.toFixed(0)}% barrels — the sweet spot was elusive`,
    (v) => `${v.toFixed(0)}% barrel rate — swing path needs adjustment`,
  ],
  chase_pct: [
    (v) => `Chase rate spiked to ${v.toFixed(0)}% — costing quality at-bats`,
    (v) => `You expanded too often — ${v.toFixed(0)}% chase rate`,
    (v) => `${v.toFixed(0)}% chases — pitchers are winning that battle`,
  ],
  whiff_pct: [
    (v) => `Whiff rate at ${v.toFixed(0)}% — bat path needs tightening`,
    (v) => `${v.toFixed(0)}% whiffs — you're swinging through pitches`,
    (v) => `Whiff rate spiked to ${v.toFixed(0)}% — timing was late`,
  ],
  hard_contact_pct: [
    (v) => `Only ${v.toFixed(0)}% hard contact — need more authority`,
    (v) => `Hard contact at ${v.toFixed(0)}% — swings lacked intent`,
    (v) => `${v.toFixed(0)}% hard contact — not enough power transfer`,
  ],
  line_drive_pct: [
    (v) => `Line drive rate at ${v.toFixed(0)}% — too many ground balls`,
    (v) => `Only ${v.toFixed(0)}% line drives — bat path is too steep`,
    (v) => `LD rate at ${v.toFixed(0)}% — you're getting under it`,
  ],
  avg_zone_pct: [
    (v) => `Only ${v.toFixed(0)}% in zone — command was off`,
    (v) => `Zone rate at ${v.toFixed(0)}% — too many balls`,
    (v) => `${v.toFixed(0)}% zone — you weren't attacking the strike zone`,
  ],
  first_pitch_strike_pct: [
    (v) => `${v.toFixed(0)}% first-pitch strikes — falling behind`,
    (v) => `FPS at ${v.toFixed(0)}% — you gave hitters a free look`,
    (v) => `Only ${v.toFixed(0)}% first-pitch strikes — behind from the start`,
  ],
  avg_footwork_grade: [
    (v) => `Footwork grade at ${Math.round(v)} — feet were slow`,
    (v) => `${Math.round(v)} footwork — not getting into position`,
    (v) => `Footwork at ${Math.round(v)} — your base was off`,
  ],
  avg_clean_field_pct: [
    (v) => `Clean field rate at ${v.toFixed(0)}% — bobbles hurt`,
    (v) => `Only ${v.toFixed(0)}% clean fields — too many errors`,
    (v) => `${v.toFixed(0)}% clean field — hands weren't soft enough`,
  ],
  avg_accuracy_grade: [
    (v) => `Accuracy at ${Math.round(v)} — throws were scattered`,
    (v) => `${Math.round(v)} accuracy — missing your target`,
    (v) => `Throw accuracy at ${Math.round(v)} — release point was inconsistent`,
  ],
};

// ─── CUE VARIATIONS (2-3 per metric) ───
const CUE_VARIATIONS: Record<string, string[]> = {
  bqi: [
    'Focus on staying through the ball — let the barrel work',
    'Stay connected through the zone — hands lead the barrel',
    'Trust your hands and drive through contact',
  ],
  pei: [
    'Locate your fastball first, then expand',
    'Hit your spots early — build from the fastball',
    'Command the fastball, everything else follows',
  ],
  fqi: [
    'Hands out front, clean the angle',
    'Work through the ball — don\'t stab at it',
    'Get your glove out early and funnel it in',
  ],
  decision: [
    'See it deeper before committing',
    'Let the ball travel — trust your eyes',
    'Take a breath, recognize spin early',
  ],
  competitive_execution: [
    'Compete every single rep — no free ones',
    'Bring game-speed intensity to every rep',
    'Treat every rep like it matters — because it does',
  ],
  barrel_pct: [
    'Stay inside the ball and trust your hands',
    'Get the barrel to the ball — stay short and direct',
    'Stay through the middle — let the barrel find it',
  ],
  chase_pct: [
    'Lay off the first pitch outside the zone',
    'If it starts off the plate, let it go',
    'Tighten your zone — only swing at strikes',
  ],
  whiff_pct: [
    'Shorten up and stay through the middle',
    'Stay short to the ball — don\'t overswin',
    'Track it longer, swing later, stay through it',
  ],
  hard_contact_pct: [
    'Attack the inner half — drive through contact',
    'Get your A-swing off — no defensive swings',
    'Commit to the swing — half swings kill power',
  ],
  line_drive_pct: [
    'Stay on top, hit through the middle of the field',
    'Level the bat path — stay through the zone',
    'Hit the ball where it\'s pitched — stay level',
  ],
  avg_zone_pct: [
    'Hit your spots early — attack the zone',
    'Establish the strike zone from pitch one',
    'Get ahead — throw strikes with purpose',
  ],
  first_pitch_strike_pct: [
    'Establish the strike zone from pitch one',
    'Set the tone with a first-pitch strike',
    'Own the count — get ahead immediately',
  ],
  avg_footwork_grade: [
    'Get your feet set before the ball arrives',
    'Move your feet first — hands follow',
    'Quick feet, balanced base — then field',
  ],
  avg_clean_field_pct: [
    'Soft hands, work through the ball',
    'Receive it — don\'t attack it',
    'Funnel the ball to your center — soft and clean',
  ],
  avg_accuracy_grade: [
    'Step toward your target on every throw',
    'Eyes on the target, follow through',
    'Point your front shoulder — let it go',
  ],
};

// ─── Context suffixes ───
const CONTEXT_SUFFIXES: Record<string, string> = {
  practice: ' — lock this in before game speed',
  solo_work: ' — lock this in before game speed',
  drill_work: ' — build the habit now',
  game: ' — this is showing up in competition',
  live_scrimmage: ' — this is getting exposed live',
  bullpen: ' — take this focus to the mound',
};

// ─── TAG VARIATIONS ───
const TAG_VARIATIONS: Record<string, string[]> = {
  'Grind Session': ['Grind Session', 'Grind Day', 'Work Day', 'Foundation Work'],
  'Solid Work': ['Solid Work', 'Steady Session', 'Clean Work', 'Consistent Day'],
  'Elite Execution': ['Elite Execution', 'Elite Day', 'Locked In', 'Peak Performance'],
  'Building': ['Building', 'Growth Day', 'Progress Session', 'Developing'],
  'Power Day': ['Power Day', 'Power Surge', 'Damage Done'],
  'Chase Spike': ['Chase Spike', 'Discipline Lapse', 'Zone Expanded'],
  'Contact Issues': ['Contact Issues', 'Timing Off', 'Connection Lost'],
};

// ─── Core scoring logic (unchanged) ───

function getDeviationScore(metric: string, value: number): number {
  const t = METRIC_THRESHOLDS[metric];
  if (!t) return 0;
  if (INVERTED.has(metric)) {
    return (t.strong - value) / (t.weak - t.strong);
  }
  return (value - t.strong) / (t.strong - t.weak);
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

// ─── Main insight generator ───

export function generateInsights(
  composites: Composites | null | undefined,
  drillBlocks: DrillBlock[] | null | undefined,
  module: string,
  context?: SessionContext
): SessionInsights {
  const fallback: SessionInsights = {
    win: null,
    focus: null,
    nextRepCue: null,
    keyMetrics: [],
    sessionTag: 'Solid Work',
    focusMetric: null,
  };

  if (!composites || Object.keys(composites).length === 0) return fallback;

  const relevantMetrics = MODULE_METRICS[module] ?? MODULE_METRICS.hitting;
  const seed = context?.sessionDate ?? 'default';
  const offset = context?.variationOffset ?? 0;

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

  // Win: only if actually strong — use variation
  let win: string | null = null;
  if (bestMetric.deviation > 0) {
    const variations = WIN_VARIATIONS[bestMetric.metric];
    if (variations) {
      const fn = pickVariation(variations, seed + bestMetric.metric, offset);
      win = fn(bestMetric.value);
    }
  }

  // Focus: only if actually weak — use variation
  let focus: string | null = null;
  const focusMetricKey = worstMetric.deviation < 0 ? worstMetric.metric : null;
  if (focusMetricKey) {
    const variations = FOCUS_VARIATIONS[focusMetricKey];
    if (variations) {
      const fn = pickVariation(variations, seed + focusMetricKey, offset);
      focus = fn(worstMetric.value);
    }
  }

  // Next rep cue with variation + context suffix
  let nextRepCue: string | null = null;
  if (focusMetricKey) {
    const cues = CUE_VARIATIONS[focusMetricKey];
    if (cues) {
      nextRepCue = pickVariation(cues, seed + focusMetricKey + 'cue', offset);
      // Add context suffix
      if (context?.sessionType) {
        const suffix = CONTEXT_SUFFIXES[context.sessionType] ?? null;
        if (suffix) nextRepCue += suffix;
      }
    }
  }

  // Key metrics: top 3, prioritize win and focus metrics
  const keyMetrics: SessionInsights['keyMetrics'] = [];
  for (const m of [bestMetric.metric, focusMetricKey, ...sorted.map(s => s.metric)]) {
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

  // Session tag with variation
  const baseTag = deriveBaseSessionTag(composites, scored, module);
  const tagVariants = TAG_VARIATIONS[baseTag];
  const sessionTag = tagVariants
    ? pickVariation(tagVariants, seed + 'tag', offset)
    : baseTag;

  return { win, focus, nextRepCue, keyMetrics, sessionTag, focusMetric: focusMetricKey };
}

function deriveBaseSessionTag(
  composites: Composites,
  scored: { metric: string; deviation: number }[],
  module: string
): string {
  const avgDeviation = scored.reduce((s, x) => s + x.deviation, 0) / scored.length;

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
