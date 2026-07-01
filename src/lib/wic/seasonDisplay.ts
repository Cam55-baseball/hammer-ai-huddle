// src/lib/wic/seasonDisplay.ts — Phase 3 canonical seasonal display labels.
// Every card MUST read season display text from here. No local mapping.
// Must stay in shape-parity with the server `seasonDisplayLabel` in
// supabase/functions/_shared/wic/cardRegistry.ts.

export function seasonDisplayLabel(phase: string | null | undefined): string {
  switch (phase) {
    case "os_q1": return "Offseason Quarter 1";
    case "os_q2": return "Offseason Quarter 2";
    case "os_q3": return "Offseason Quarter 3";
    case "os_q4": return "Late Offseason";
    case "in_season": return "In Season";
    case "post_season": return "Transition";
    default: return phase ?? "";
  }
}
