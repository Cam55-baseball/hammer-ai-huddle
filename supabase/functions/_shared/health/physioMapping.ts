export const PHYSIO_SETTING_KEY = 'physio_mapping_defaults';
export const PHYSIO_DEFAULTS = { illnessMode: 'light', professionalAfterDays: 3 } as const;
export type PhysioDefaults = { illnessMode: 'light' | 'recovery'; professionalAfterDays: number };
export function physioDefaults(raw: unknown): PhysioDefaults {
  const r = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return { illnessMode: r.illnessMode === 'recovery' ? 'recovery' : 'light',
    professionalAfterDays: typeof r.professionalAfterDays === 'number' && Number.isInteger(r.professionalAfterDays) && r.professionalAfterDays >= 1 && r.professionalAfterDays <= 3 ? r.professionalAfterDays : 3 };
}
const AREAS = new Set(['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'back']);
export const PREHAB_SLUGS: Record<string, string> = {
  shoulder: 'wu_shoulder_cars', wrist: 'wu_wrist_cars',
  hip: 'wu_hip_cars', ankle: 'wu_ankle_cars', back: 'wu_thoracic_windmill',
};
export type PhysioMapping = { illnessActive: boolean; lowReadiness: boolean; recoveryOnly: boolean;
  professionalWarning: string | null; healedAreas: string[]; activeAreas: string[]; cautions: string[] };
/** Explicit statuses/regions only. Notes are never diagnoses or clearance. */
export function mapPhysio(input: { activeIllness?: unknown; illnessStartedAt?: unknown; injuries?: unknown;
  painAreas?: readonly string[]; today: string; defaults?: unknown }): PhysioMapping {
  const defaults = physioDefaults(input.defaults);
  const illnessActive = typeof input.activeIllness === 'string' && input.activeIllness.trim().length > 0;
  // Fever is an exact structured selector value, never searched in free text.
  const fever = input.activeIllness === 'Fever';
  const start = typeof input.illnessStartedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.illnessStartedAt) ? input.illnessStartedAt : null;
  const elapsed = start ? (Date.parse(`${input.today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1 : null;
  const healed = new Set<string>(), active = new Set<string>();
  for (const item of Array.isArray(input.injuries) ? input.injuries : []) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.region !== 'string' || !AREAS.has(r.region)) continue;
    if (r.recovery_status === 'healed') healed.add(r.region);
    if (r.recovery_status === 'active' || r.recovery_status === 'pain') active.add(r.region);
  }
  for (const area of input.painAreas ?? []) if (AREAS.has(area)) active.add(area);
  return { illnessActive, lowReadiness: illnessActive, recoveryOnly: illnessActive && (fever || defaults.illnessMode === 'recovery'),
    professionalWarning: illnessActive && elapsed !== null && elapsed >= defaults.professionalAfterDays ? 'Please talk to a professional' : null,
    healedAreas: [...healed], activeAreas: [...active], cautions: [...healed].filter(a => active.has(a)).map(a => `Pain is back in your ${a}. Stop work that hurts and update Hammers.`) };
}
/** Keep plain history and unknown statuses unchanged; only explicitly healed rows leave active gates. */
export function activeInjuryHistory(raw: unknown): unknown {
  return Array.isArray(raw) ? raw.filter(r => !r || typeof r !== 'object' || r.recovery_status !== 'healed') : raw;
}