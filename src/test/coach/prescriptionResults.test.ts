import { describe, expect, it } from "vitest";
import { prescriptionResults } from "../../../supabase/functions/_shared/coach/prescriptionResults";
const send = { id: "rx", recipient_id: "player", plan_date: "2026-10-26" };
const row = { id: "row", user_id: "player", plan_date: "2026-10-24", movement_slug: "warmup", movement_name: "Warmup", dosage_unit: "seconds", slot: "warmup", why_payload: { coach_rx: "rx" } };
const log = { id: "log", user_id: "player", prescription_id: "row", plan_date: "2026-10-24", movement_slug: "warmup", duration_seconds_precise: 1.47 };
describe("sent workout canonical occurrence readback", () => {
  it("reads Use today results from the activated date, not the original schedule", () => {
    expect(prescriptionResults([send], [row], [log]).rx[0]).toMatchObject({ id: "log", duration_seconds_precise: 1.47 });
  });
  it.each([ { plan_date: "2026-10-25" }, { user_id: "unrelated" }, { movement_slug: "another" }, { prescription_id: "other-row" } ])("rejects a mismatched canonical occurrence %j", change => {
    expect(prescriptionResults([send], [row], [{ ...log, ...change }])).toEqual({});
  });
  it("refuses a row owned by another recipient", () => {
    expect(prescriptionResults([{ ...send, recipient_id: "other" }], [row], [log])).toEqual({});
  });
  it("keeps two recurring occurrences separate and never invents actuals", () => {
    const second = { ...row, id: "row2", plan_date: "2026-10-26", why_payload: { coach_rx: "rx2" } };
    expect(prescriptionResults([send, { ...send, id: "rx2" }], [row, second], [log])).toHaveProperty("rx");
    expect(prescriptionResults([send, { ...send, id: "rx2" }], [row, second], [log])).not.toHaveProperty("rx2");
  });
});