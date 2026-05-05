import type { Severity } from '@/demo/sims/hittingSim';

export interface PrescribedVideo {
  id: string;
  title: string;
  purpose: string;
  expectedImprovement: string;
  thumbnailHue: number; // 0-360, deterministic gradient
}

export interface PrescriptionInput {
  simId: string;
  severity: Severity;
  primaryAxis?: string;
  /** Optional shown-id set across past prescriptions for this sim — used to avoid repeats. */
  shownIds?: ReadonlySet<string>;
}

export const PRESCRIPTION_CATALOG_INTERNAL_KEY = '__catalog__';

const CATALOG: Record<string, Record<Severity, PrescribedVideo[]>> = {
  hitting: {
    critical: [
      { id: 'h-c-1', title: 'Lower-Half Sequencing Reset', purpose: 'Rebuilds ground force timing', expectedImprovement: '+3–5 mph EV', thumbnailHue: 12 },
      { id: 'h-c-2', title: 'Bat-Path Tunnel Drill', purpose: 'Aligns barrel to pitch plane', expectedImprovement: '+12% barrel rate', thumbnailHue: 200 },
      { id: 'h-c-3', title: 'Heavy-Bat Overload Series', purpose: 'Raises swing-speed ceiling', expectedImprovement: '+2 mph swing', thumbnailHue: 340 },
    ],
    moderate: [
      { id: 'h-m-1', title: 'Hip-Shoulder Separation Iso', purpose: 'Adds elastic torque', expectedImprovement: '+2 mph EV', thumbnailHue: 24 },
      { id: 'h-m-2', title: 'Launch Angle Tee Ladder', purpose: 'Locks in 14–22° band', expectedImprovement: '+18% line drives', thumbnailHue: 160 },
      { id: 'h-m-3', title: 'Approach vs Velocity Block', purpose: 'Pitch recognition reps', expectedImprovement: '+9% contact', thumbnailHue: 280 },
    ],
    minor: [
      { id: 'h-l-1', title: 'Daily 10-Swing Refinement', purpose: 'Maintenance + consistency', expectedImprovement: 'Consistency lock', thumbnailHue: 140 },
      { id: 'h-l-2', title: 'Game-Speed Live BP Sim', purpose: 'Pressure transfer', expectedImprovement: '+5% in-game EV', thumbnailHue: 40 },
      { id: 'h-l-3', title: 'Two-Strike Approach Module', purpose: 'Late-count adjustments', expectedImprovement: '+22 pts wOBA w/ 2K', thumbnailHue: 220 },
    ],
  },
  program: {
    critical: [
      { id: 'p-c-1', title: 'Power Periodization Phase 1', purpose: '5-day periodized split', expectedImprovement: '+18% peak power', thumbnailHue: 10 },
      { id: 'p-c-2', title: 'Posterior Chain Foundation', purpose: 'Glute/ham unlock', expectedImprovement: '+12% sprint speed', thumbnailHue: 200 },
      { id: 'p-c-3', title: 'CNS Recovery Protocol', purpose: 'Stack workouts safely', expectedImprovement: '−40% soreness', thumbnailHue: 280 },
    ],
    moderate: [
      { id: 'p-m-1', title: 'Volume Ramp Block', purpose: 'Add 1 day without breakdown', expectedImprovement: '+10% gains', thumbnailHue: 160 },
      { id: 'p-m-2', title: 'Plyo Bounding Series', purpose: 'Reactive strength', expectedImprovement: '+0.1s 10yd', thumbnailHue: 30 },
      { id: 'p-m-3', title: 'Recovery Flow', purpose: 'Active recovery template', expectedImprovement: '+15% next-day output', thumbnailHue: 220 },
    ],
    minor: [
      { id: 'p-l-1', title: 'Periodization Tweak Pack', purpose: 'Fine-tune your split', expectedImprovement: '+5% peak', thumbnailHue: 140 },
      { id: 'p-l-2', title: 'Mobility + Tendon Block', purpose: 'Durability layer', expectedImprovement: '−60% injury risk', thumbnailHue: 50 },
      { id: 'p-l-3', title: 'In-Season Maintenance', purpose: 'Hold gains in-season', expectedImprovement: 'Hold 95% off-season peak', thumbnailHue: 320 },
    ],
  },
  vault: {
    critical: [
      { id: 'v-c-1', title: 'Vault Walkthrough: Hitting', purpose: 'Side-by-side history', expectedImprovement: 'Spot regressions instantly', thumbnailHue: 10 },
      { id: 'v-c-2', title: 'Vault Walkthrough: Pitching', purpose: 'Mechanics across weeks', expectedImprovement: 'Catch drift early', thumbnailHue: 220 },
      { id: 'v-c-3', title: 'Vault Recap Reports', purpose: 'Monthly performance recap', expectedImprovement: 'Stay accountable', thumbnailHue: 300 },
    ],
    moderate: [
      { id: 'v-m-1', title: 'Vault Quick-Compare', purpose: '6-week photo overlays', expectedImprovement: 'Visual progress proof', thumbnailHue: 30 },
      { id: 'v-m-2', title: 'Vault Test History', purpose: '42-day testing trail', expectedImprovement: 'Trend at a glance', thumbnailHue: 160 },
      { id: 'v-m-3', title: 'Vault Coach Share', purpose: 'Share with coach', expectedImprovement: 'Faster feedback', thumbnailHue: 280 },
    ],
    minor: [
      { id: 'v-l-1', title: 'Vault Quick-Tour', purpose: 'Get oriented', expectedImprovement: 'Faster setup', thumbnailHue: 140 },
      { id: 'v-l-2', title: 'Vault Tagging Tips', purpose: 'Find any rep fast', expectedImprovement: 'Save 15 min/week', thumbnailHue: 50 },
      { id: 'v-l-3', title: 'Vault Privacy Setup', purpose: 'Control who sees what', expectedImprovement: 'Peace of mind', thumbnailHue: 200 },
    ],
  },
};

export function prescribe({ simId, severity }: PrescriptionInput): PrescribedVideo[] {
  const entry = CATALOG[simId] ?? CATALOG.hitting;
  return entry[severity] ?? entry.moderate;
}
