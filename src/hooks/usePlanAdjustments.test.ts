import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({ user: { id: "test-player" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { usePlanAdjustments } from "./usePlanAdjustments";

beforeEach(() => {
  vi.clearAllMocks();
  const query = { select: vi.fn(), eq: vi.fn(), or: vi.fn(), order: vi.fn().mockResolvedValue({ data: [], error: null }), insert: mocks.insert };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.or.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
});
describe("legacy adjustment persistence guard", () => {
  for (const action of ["swap", "unavailable"] as const) {
    it(`does not write an unchecked ${action} even if a caller bypasses the dialog`, async () => {
      const { result } = renderHook(() => usePlanAdjustments("2026-10-21"));
      await expect(result.current.save({ modality: "hitting", action, scope: "always", original_key: "hitting::machine",
        original_name: "Machine", replacement_name: "Tee", replacement_dosage: "100 swings", reason: "no machine" })).rejects.toThrow("safety check");
      expect(mocks.insert).not.toHaveBeenCalled();
    });
  }
});