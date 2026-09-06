/**
 * EvidenceExecution — Pass C, section 1 acceptance evidence.
 *
 * DEV-ONLY. Not reachable in a production build and linked from nowhere.
 *
 * Renders synthetic `wk_prescriptions` rows through the REAL athlete card
 * (`WkPrescriptionCard`) so a phone-width screenshot shows exactly what the
 * new execution fields look like on the device. Nothing is written; no plan is
 * generated for any user; no dose is computed here.
 *
 * The rows deliberately include:
 *   - every execution field populated (off-season)
 *   - the same row in-season, where open_ended / density are banned and RIR
 *     floors at 3
 *   - a row with a set range on an INELIGIBLE slot (lift), which must render
 *     the doctrine's plain set count
 *   - a garbage row with unknown enum values and wrong types, which must
 *     render as if this layer did not exist
 */
import { HammersTodayContext } from "@/components/hammer/HammersTodayProvider";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const PLAN_DATE = "2026-01-01";

type Row = Partial<WkRx> & Record<string, unknown>;

const base: Row = {
  plan_date: PLAN_DATE,
  tempo: null,
  load_pct: null,
  duration_seconds: null,
  distance_feet: null,
  total_reps: null,
  substituted_from_slug: null,
  substitution_reason: null,
  cns_cost: 0,
  cns_clamped: false,
  why_payload: {},
  rationale: null,
};

const rows: WkRx[] = [
  {
    ...base,
    id: "exec-1",
    slot: "supplemental",
    sequence_order: 1,
    sequence_role: "supplemental",
    phase: "off_season",
    movement_slug: "db_split_squat",
    movement_name: "DB Split Squat",
    sets: 3,
    reps: 10,
    dosage_unit: "reps",
    intent_tag: "hypertrophy",
    execution_note: "Back knee straight down, front shin vertical.",
    per_side: true,
    asymmetry_rule: "weak_side_twice",
    open_ended: true,
    set_range_max: 5,
    density_target_seconds: 480,
    rir_low: 1,
    rir_high: 3,
  },
  {
    ...base,
    id: "exec-2",
    slot: "supplemental",
    sequence_order: 2,
    sequence_role: "supplemental",
    phase: "in_season",
    movement_slug: "db_split_squat",
    movement_name: "DB Split Squat (in-season)",
    sets: 3,
    reps: 10,
    dosage_unit: "reps",
    intent_tag: "tissue_capacity",
    execution_note: "Same movement, in-season. No open end, no clock.",
    per_side: true,
    open_ended: true,
    set_range_max: 5,
    density_target_seconds: 480,
    rir_low: 1,
    rir_high: 3,
  },
  {
    ...base,
    id: "exec-3",
    slot: "lift",
    sequence_order: 3,
    sequence_role: "main",
    phase: "off_season",
    movement_slug: "trap_bar_deadlift",
    movement_name: "Trap Bar Deadlift",
    sets: 4,
    reps: 3,
    dosage_unit: "reps",
    intent_tag: "max_strength",
    // Ineligible slot: the range must NOT render. Doctrine's 4 sets stands.
    set_range_max: 6,
    density_target_seconds: 600,
  },
  {
    ...base,
    id: "exec-4",
    slot: "explosive",
    sequence_order: 4,
    sequence_role: "primer",
    phase: "off_season",
    movement_slug: "med_ball_shot_put",
    movement_name: "Med Ball Shot Put",
    sets: 1,
    reps: 1,
    total_reps: 60,
    dosage_unit: "total_reps",
    intent_tag: "power",
    intensity_mode: "extensive",
    per_side: true,
  },
  {
    ...base,
    id: "exec-5",
    slot: "supplemental",
    sequence_order: 5,
    sequence_role: "supplemental",
    phase: "off_season",
    movement_slug: "garbage_row",
    movement_name: "Malformed Row (unknown enums, wrong types)",
    sets: 3,
    reps: 8,
    dosage_unit: "reps",
    intent_tag: "not_a_real_intent",
    asymmetry_rule: "not_a_real_rule",
    intensity_mode: "not_a_real_mode",
    execution_note: "   ",
    per_side: "yes",
    open_ended: "true",
    set_range_max: -4,
    density_target_seconds: "soon",
    rir_low: null,
    rir_high: null,
    cue_ids: "nope",
  },
] as unknown as WkRx[];

export default function EvidenceExecution() {
  if (!import.meta.env.DEV) return null;

  const snapshot = {
    data: rows,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => Promise.resolve(),
  } as unknown as React.ContextType<typeof HammersTodayContext>;

  return (
    <HammersTodayContext.Provider value={snapshot}>
      <main className="mx-auto w-full max-w-md space-y-3 p-3">
        <h1 className="text-base font-semibold text-foreground">Execution layer</h1>
        {rows.map((rx) => (
          <WkPrescriptionCard key={rx.id} rx={rx} />
        ))}
      </main>
    </HammersTodayContext.Provider>
  );
}
