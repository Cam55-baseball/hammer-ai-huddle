// Shared season phase resolver + per-phase programming profile (edge).
// Mirror of src/lib/seasonPhase.ts — keep in sync.

export type SeasonPhase = 'preseason' | 'in_season' | 'post_season' | 'off_season';

export interface SeasonResolution {
  phase: SeasonPhase;
  phaseStartedAt: string | null;
  daysIntoPhase: number | null;
  daysUntilNextPhase: number | null;
  source: 'date_window' | 'stored' | 'default';
}

export interface SeasonSettingsLike {
  season_status?: string | null;
  preseason_start_date?: string | null;
  preseason_end_date?: string | null;
  in_season_start_date?: string | null;
  in_season_end_date?: string | null;
  post_season_start_date?: string | null;
  post_season_end_date?: string | null;
}

const VALID: SeasonPhase[] = ['preseason', 'in_season', 'post_season', 'off_season'];

/** Normalize short/legacy season status values to canonical strings. */
export function normalizeSeasonStatus(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (s === 'in' || s === 'in_season' || s === 'inseason') return 'in_season';
  if (s === 'post' || s === 'post_season' || s === 'postseason') return 'post_season';
  if (s === 'pre' || s === 'preseason' || s === 'pre_season') return 'preseason';
  if (s === 'off' || s === 'off_season' || s === 'offseason') return 'off_season';
  return s;
}

export function resolveSeasonPhase(settings: SeasonSettingsLike | null | undefined): SeasonResolution {
  if (!settings) {
    return { phase: 'off_season', phaseStartedAt: null, daysIntoPhase: null, daysUntilNextPhase: null, source: 'default' };
  }
  const normalizedStatus = normalizeSeasonStatus(settings.season_status);
  settings = { ...settings, season_status: normalizedStatus };
  const today = new Date().toISOString().split('T')[0];
  const phases: { status: SeasonPhase; start: string | null | undefined; end: string | null | undefined }[] = [
    { status: 'preseason', start: settings.preseason_start_date, end: settings.preseason_end_date },
    { status: 'in_season', start: settings.in_season_start_date, end: settings.in_season_end_date },
    { status: 'post_season', start: settings.post_season_start_date, end: settings.post_season_end_date },
  ];
  for (const p of phases) {
    if (p.start && p.end && today >= p.start && today <= p.end) {
      const startDate = new Date(p.start + 'T00:00:00');
      const endDate = new Date(p.end + 'T00:00:00');
      const now = new Date();
      const daysIntoPhase = Math.floor((now.getTime() - startDate.getTime()) / 86400000);
      const daysUntilNextPhase = Math.floor((endDate.getTime() - now.getTime()) / 86400000);
      return { phase: p.status, phaseStartedAt: p.start, daysIntoPhase, daysUntilNextPhase, source: 'date_window' };
    }
  }
  const stored = settings.season_status as SeasonPhase | undefined;
  if (stored && VALID.includes(stored)) {
    return { phase: stored, phaseStartedAt: null, daysIntoPhase: null, daysUntilNextPhase: null, source: 'stored' };
  }
  return { phase: 'off_season', phaseStartedAt: null, daysIntoPhase: null, daysUntilNextPhase: null, source: 'default' };
}

export type NeijingElement = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export interface SeasonHPIProfile {
  element: NeijingElement;
  elementQuality: string;
  organEmphasis: string;
  yinYangEmphasis: string;
  qiDirective: string;
  seasonalAdaptation: string;
  breathPrimer: string;
}

export interface SeasonProgrammingProfile {
  phase: SeasonPhase;
  label: string;
  volume: 'very_low' | 'low' | 'medium' | 'high';
  intensity: 'very_low' | 'low' | 'maintenance' | 'rising' | 'high';
  cnsCapPerDay: 'very_low' | 'low' | 'medium' | 'medium_high' | 'high';
  recoveryEmphasis: 'medium' | 'high' | 'very_high';
  newSkillWork: 'low' | 'refinement_only' | 'high' | 'rebuild';
  maxSetsPerExercise: number;
  maxHighCnsPerWeek: number;
  toneGuidance: string;
  directives: string[];
  hpi: SeasonHPIProfile;
}

const HPI_BY_PHASE: Record<SeasonPhase, SeasonHPIProfile> = {
  preseason: {
    element: 'Wood',
    elementQuality: 'Wood — flexible, rising, decisive.',
    organEmphasis: 'Liver / Wood — smooth rotation, clear vision, sharp reactions.',
    yinYangEmphasis: 'Yang rising — sharpen without over-heating.',
    qiDirective: 'Circulate Qi before intent — flow first, then game-speed reps.',
    seasonalAdaptation: 'Lean into greens, sour notes, and early-day sunlight; give the body a real warm-up before max effort.',
    breathPrimer: 'Nasal in 4 · out 6 — 6 rounds. Wake the diaphragm without spiking tone.',
  },
  in_season: {
    element: 'Fire',
    elementQuality: 'Fire — bright, expressive, easy to over-spend.',
    organEmphasis: 'Heart / Fire — protect the shen (focus, sleep, confidence).',
    yinYangEmphasis: 'Yang expressed, Yin protected — spend on game day, restore between.',
    qiDirective: 'Preserve sharpness — small, frequent doses beat heroic sessions.',
    seasonalAdaptation: 'Hydrate ahead of thirst, seek cooling foods after games, guard sleep as a performance asset.',
    breathPrimer: 'Box breath 4-4-4-4 — 5 rounds. Steady the shen before pitches or at-bats.',
  },
  post_season: {
    element: 'Metal',
    elementQuality: 'Metal — refined, quiet, letting go of what is done.',
    organEmphasis: 'Lung / Metal — full breath, clean tissue, resolve lingering pain.',
    yinYangEmphasis: 'Yin restoration — the season descends before it rises again.',
    qiDirective: 'Downshift and repair — sleep, breathe, walk, decompress.',
    seasonalAdaptation: 'Warmer clothing on cool mornings, hydrating meals, early-to-bed rhythm.',
    breathPrimer: 'Long-exhale breath: in 4 · out 8 — 8 rounds. Deep parasympathetic reset.',
  },
  off_season: {
    element: 'Water',
    elementQuality: 'Water — deep, patient, storing power for the year ahead.',
    organEmphasis: 'Kidney / Water — build reserves, honor sleep, respect fear signals.',
    yinYangEmphasis: 'Yin storing, Yang forged — deep tank now becomes explosive later.',
    qiDirective: 'Build the engine — patient volume, honest loading, deep recovery.',
    seasonalAdaptation: "Warming, protein-rich foods; salt intelligently; guard sleep and don't chase daily peaks.",
    breathPrimer: 'Diaphragmatic 5-5 breath — 8 rounds. Fill the tank before heavy work.',
  },
};

export function getSeasonHPI(phase: SeasonPhase): SeasonHPIProfile {
  return HPI_BY_PHASE[phase] ?? HPI_BY_PHASE.off_season;
}


export const SEASON_PROFILES: Record<SeasonPhase, SeasonProgrammingProfile> = {
  preseason: {
    phase: 'preseason', label: 'Pre-Season',
    volume: 'high', intensity: 'rising', cnsCapPerDay: 'medium_high',
    recoveryEmphasis: 'medium', newSkillWork: 'high',
    maxSetsPerExercise: 6, maxHighCnsPerWeek: 3,
    toneGuidance: 'Sharpening, focused, monitoring readiness. Highlight what is locked in vs what still needs reps. No brand-new mechanical changes this close to opening day.',
    directives: [
      'Ramp volume and intensity week over week, peaking 7-10 days before opening day.',
      'Consolidate off-season gains into game-speed reps.',
      'Cap brand-new movement patterns; refine what already exists.',
      'Schedule one full recovery day for every 3 high-CNS days.',
    ],
  },
  in_season: {
    phase: 'in_season', label: 'In-Season',
    volume: 'low', intensity: 'maintenance', cnsCapPerDay: 'low',
    recoveryEmphasis: 'high', newSkillWork: 'refinement_only',
    maxSetsPerExercise: 4, maxHighCnsPerWeek: 1,
    toneGuidance: 'Direct, confidence-preserving, focused on protecting performance and bandwidth. Never prescribe overhauls mid-season.',
    directives: [
      'Protect game-day performance — never prescribe new mechanical changes.',
      'Maintenance loading only: 60-75% intensity, low total volume.',
      'Prioritize recovery, mobility, and CNS bandwidth over hypertrophy.',
      'No more than 1 high-CNS strength session per week.',
      'Refinement cues only — no new motor patterns.',
    ],
  },
  post_season: {
    phase: 'post_season', label: 'Post-Season',
    volume: 'low', intensity: 'very_low', cnsCapPerDay: 'very_low',
    recoveryEmphasis: 'very_high', newSkillWork: 'rebuild',
    maxSetsPerExercise: 3, maxHighCnsPerWeek: 0,
    toneGuidance: 'Reflective, restorative. Frame this window as the body and mind cooling down, then preparing to grow.',
    directives: [
      'Decompression window — emphasize sleep, mobility, and pain resolution.',
      'No max-effort lifts and no high-CNS throwing/hitting volume.',
      'Address lingering pain and asymmetries before any rebuild.',
      'Begin foundational movement quality work in the final 2 weeks.',
    ],
  },
  off_season: {
    phase: 'off_season', label: 'Off-Season',
    volume: 'high', intensity: 'high', cnsCapPerDay: 'high',
    recoveryEmphasis: 'medium', newSkillWork: 'high',
    maxSetsPerExercise: 6, maxHighCnsPerWeek: 4,
    toneGuidance: 'Growth-oriented, ambitious. Willing to prescribe aggressive mechanical and physical changes when the data supports them.',
    directives: [
      'Build the engine — strength, power, mobility, and skill acquisition.',
      'Aggressive mechanical changes are encouraged when data supports them.',
      'Push CNS load with planned deload weeks every 4th week.',
      'Introduce new movement patterns and skill work freely.',
    ],
  },
};

export function getSeasonProfile(phase: SeasonPhase): SeasonProgrammingProfile {
  return SEASON_PROFILES[phase] ?? SEASON_PROFILES.off_season;
}

/** Build a system-prompt-ready directive block. Used by training-block, adapt, ai-chat, meals. */
export function buildPhasePromptBlock(resolution: SeasonResolution): string {
  const p = getSeasonProfile(resolution.phase);
  const phaseDay = resolution.daysIntoPhase != null && resolution.daysUntilNextPhase != null
    ? `Day ${resolution.daysIntoPhase + 1} of ${resolution.daysIntoPhase + resolution.daysUntilNextPhase + 1} (${resolution.daysUntilNextPhase} days remaining)`
    : 'Date window not configured';
  return [
    `SEASON PHASE: ${p.label} — ${phaseDay}`,
    `Volume: ${p.volume} | Intensity: ${p.intensity} | CNS cap/day: ${p.cnsCapPerDay} | Recovery: ${p.recoveryEmphasis}`,
    `New skill work: ${p.newSkillWork} | Max sets/exercise: ${p.maxSetsPerExercise} | Max high-CNS/week: ${p.maxHighCnsPerWeek}`,
    `Tone: ${p.toneGuidance}`,
    `Directives:`,
    ...p.directives.map(d => `  - ${d}`),
  ].join('\n');
}


// ---------- Pure helpers shared with regression tests ----------
// These mirror the contracts used by:
//   - supabase/functions/generate-training-block (set/CNS clamps)
//   - supabase/functions/adapt-training-block   (RPE deload + volume gate)
//   - supabase/functions/suggest-meals          (macro tilts)
//   - supabase/functions/compute-hammer-state   (state thresholds)
// Keep these in sync with the edge functions if they change.

export const PHASE_MACRO_TILTS: Record<SeasonPhase, { carbs: number; protein: number; fats: number; note: string }> = {
  preseason:   { carbs: 1.08, protein: 1.05, fats: 1.00, note: 'Pre-season ramp — extra carbs to support volume.' },
  in_season:   { carbs: 1.05, protein: 1.00, fats: 0.95, note: 'In-season — fast-digest carbs near training, protect bandwidth.' },
  post_season: { carbs: 0.90, protein: 1.05, fats: 1.00, note: 'Post-season — anti-inflammatory bias, slightly less carbs.' },
  off_season:  { carbs: 1.00, protein: 1.00, fats: 1.00, note: 'Off-season — baseline targets; allow surplus if goal is mass.' },
};

export const PHASE_HAMMER_THRESHOLDS: Record<SeasonPhase, { prime: number; ready: number; caution: number }> = {
  preseason:   { prime: 80, ready: 60, caution: 40 },
  in_season:   { prime: 85, ready: 68, caution: 48 },
  post_season: { prime: 90, ready: 72, caution: 52 },
  off_season:  { prime: 78, ready: 55, caution: 35 },
};

export function applyMacroTilt(
  base: { calories?: number; protein: number; carbs: number; fats: number },
  phase: SeasonPhase,
) {
  const t = PHASE_MACRO_TILTS[phase];
  return {
    protein: Math.round(base.protein * t.protein),
    carbs:   Math.round(base.carbs   * t.carbs),
    fats:    Math.round(base.fats    * t.fats),
  };
}

export function clampWorkoutSets(sets: number, phase: SeasonPhase): number {
  const cap = SEASON_PROFILES[phase].maxSetsPerExercise;
  return Math.max(1, Math.min(sets, cap));
}

export function clampHighCnsSessions<T>(sessions: T[], phase: SeasonPhase): T[] {
  const cap = SEASON_PROFILES[phase].maxHighCnsPerWeek;
  return sessions.slice(0, cap);
}

export function rpeDeloadThreshold(phase: SeasonPhase): number {
  return phase === 'in_season' ? 7.5 : phase === 'off_season' ? 8.5 : 8;
}

export function allowsVolumeIncrease(phase: SeasonPhase): boolean {
  return phase !== 'in_season' && phase !== 'post_season';
}

export function shouldDeloadByRpe(avgRpe: number, phase: SeasonPhase): boolean {
  return avgRpe > rpeDeloadThreshold(phase);
}

export type HammerState = 'prime' | 'ready' | 'caution' | 'recover';

export function computeHammerState(
  finalScore: number,
  recoveryScore: number,
  phase: SeasonPhase,
): HammerState {
  const t = PHASE_HAMMER_THRESHOLDS[phase];
  if (finalScore >= t.prime && recoveryScore >= 60) return 'prime';
  if (finalScore >= t.ready) return 'ready';
  if (finalScore >= t.caution) return 'caution';
  return 'recover';
}
