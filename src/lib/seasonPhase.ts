// Shared season phase resolver + per-phase programming profile.
// Mirror of supabase/functions/_shared/seasonPhase.ts — keep in sync.

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

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function resolveSeasonPhase(settings: SeasonSettingsLike | null | undefined): SeasonResolution {
  if (!settings) {
    return { phase: 'off_season', phaseStartedAt: null, daysIntoPhase: null, daysUntilNextPhase: null, source: 'default' };
  }
  const today = todayStr();
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

// ---------- Programming profiles per phase ----------

export interface SeasonProgrammingProfile {
  phase: SeasonPhase;
  label: string;
  volume: 'very_low' | 'low' | 'medium' | 'high';
  intensity: 'very_low' | 'low' | 'maintenance' | 'rising' | 'high';
  cnsCapPerDay: 'very_low' | 'low' | 'medium' | 'medium_high' | 'high';
  recoveryEmphasis: 'medium' | 'high' | 'very_high';
  newSkillWork: 'low' | 'refinement_only' | 'high' | 'rebuild';
  // Hard clamps applied post-AI to keep generators honest.
  maxSetsPerExercise: number;
  maxHighCnsPerWeek: number;
  // Tone
  toneGuidance: string;
  // Coach-style summary for prompts
  directives: string[];
}

export const SEASON_PROFILES: Record<SeasonPhase, SeasonProgrammingProfile> = {
  preseason: {
    phase: 'preseason',
    label: 'Pre-Season',
    volume: 'high',
    intensity: 'rising',
    cnsCapPerDay: 'medium_high',
    recoveryEmphasis: 'medium',
    newSkillWork: 'high',
    maxSetsPerExercise: 6,
    maxHighCnsPerWeek: 3,
    toneGuidance: 'Sharpening, focused, monitoring readiness. Highlight what is locked in vs what still needs reps. No brand-new mechanical changes this close to opening day.',
    directives: [
      'Ramp volume and intensity week over week, peaking 7-10 days before opening day.',
      'Consolidate off-season gains into game-speed reps.',
      'Cap brand-new movement patterns; refine what already exists.',
      'Schedule one full recovery day for every 3 high-CNS days.',
    ],
  },
  in_season: {
    phase: 'in_season',
    label: 'In-Season',
    volume: 'low',
    intensity: 'maintenance',
    cnsCapPerDay: 'low',
    recoveryEmphasis: 'high',
    newSkillWork: 'refinement_only',
    maxSetsPerExercise: 4,
    maxHighCnsPerWeek: 1,
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
    phase: 'post_season',
    label: 'Post-Season',
    volume: 'low',
    intensity: 'very_low',
    cnsCapPerDay: 'very_low',
    recoveryEmphasis: 'very_high',
    newSkillWork: 'rebuild',
    maxSetsPerExercise: 3,
    maxHighCnsPerWeek: 0,
    toneGuidance: 'Reflective, restorative. Frame this window as the body and mind cooling down, then preparing to grow.',
    directives: [
      'Decompression window — emphasize sleep, mobility, and pain resolution.',
      'No max-effort lifts and no high-CNS throwing/hitting volume.',
      'Address lingering pain and asymmetries before any rebuild.',
      'Begin foundational movement quality work in the final 2 weeks.',
    ],
  },
  off_season: {
    phase: 'off_season',
    label: 'Off-Season',
    volume: 'high',
    intensity: 'high',
    cnsCapPerDay: 'high',
    recoveryEmphasis: 'medium',
    newSkillWork: 'high',
    maxSetsPerExercise: 6,
    maxHighCnsPerWeek: 4,
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
