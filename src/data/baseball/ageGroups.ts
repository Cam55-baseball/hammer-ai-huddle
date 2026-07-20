/**
 * Youth-baseball age groups.
 *
 * `multiplier` scales the base tier multiplier (e.g. Travel Ball) so that
 * playing up (14U in a 16U bracket) or staying at 8U produces sane weighting.
 * A value of 1.0 is the neutral (natural age) baseline.
 */
export interface AgeGroup {
  key: string;
  label: string;
  multiplier: number;
}

export const baseballAgeGroups: AgeGroup[] = [
  { key: '6u', label: '6U', multiplier: 0.55 },
  { key: '7u', label: '7U', multiplier: 0.60 },
  { key: '8u', label: '8U', multiplier: 0.65 },
  { key: '9u', label: '9U', multiplier: 0.70 },
  { key: '10u', label: '10U', multiplier: 0.75 },
  { key: '11u', label: '11U', multiplier: 0.80 },
  { key: '12u', label: '12U', multiplier: 0.85 },
  { key: '13u', label: '13U', multiplier: 0.90 },
  { key: '14u', label: '14U', multiplier: 0.95 },
  { key: '15u', label: '15U', multiplier: 1.00 },
  { key: '16u', label: '16U', multiplier: 1.05 },
  { key: '17u', label: '17U', multiplier: 1.10 },
  { key: '18u', label: '18U', multiplier: 1.15 },
];
