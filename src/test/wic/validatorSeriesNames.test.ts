import { describe, it, expect } from "vitest";
import { validate } from "../../../supabase/functions/_shared/wic/validator";
const rx = (slug: string, name: string) => ({ engine: "speed", slot: "speed", sequence_role: "speed", movement_slug: slug, movement_name: name, sets: 1, reps: 1 });
const fatal = (r: any) => r.issues.filter((i: any) => i.code === "duplicate_name" && i.severity === "fatal");
describe("validator series names", () => {
  it("two different Game-Day Primer drills are not a fatal duplicate", () => {
    const r = validate({ phase: "in_season", isGameDay: true, prescriptions: [rx("gap_primer_elastic_pogo", "Game-Day Primer — Elastic Pogo"), rx("gap_primer_skip_series", "Game-Day Primer — Skip Series")] } as any);
    expect(fatal(r)).toHaveLength(0);
  });
  it("the exact same name twice is still fatal", () => {
    const r = validate({ phase: "in_season", isGameDay: true, prescriptions: [rx("a", "Skip Series"), rx("b", "Skip Series")] } as any);
    expect(fatal(r)).toHaveLength(1);
  });
});
