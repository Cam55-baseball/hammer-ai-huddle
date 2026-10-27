import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AnthropometricsStep } from "./AnthropometricsStep";
import type { DraftFlush } from "@/lib/assessment/draftFlush";
const mocks = vi.hoisted(() => ({ save: vi.fn(), next: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "athlete" } }) }));
vi.mock("@/lib/hammer/context/acquisition", () => ({ persistContextAnswer: mocks.save }));
vi.mock("@/lib/onboarding/draftStore", () => ({ readDraftSlot: async () => ({ height_in: 70 }), writeDraftSlot: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
beforeEach(() => { mocks.save.mockReset(); mocks.next.mockReset(); });
it("parent navigation flushes entered height through the canonical body writer", async () => {
  let flush: DraftFlush | null = null;
  render(<AnthropometricsStep onContinue={mocks.next} onBack={() => {}} registerFlush={value => { flush = value; }} />);
  await waitFor(() => expect(screen.getByLabelText("Height (inches)")).toHaveValue(70));
  fireEvent.change(screen.getByLabelText("Height (inches)"), { target: { value: "72" } });
  if (!flush) throw new Error("flush not registered");
  expect(await (flush as DraftFlush)()).toBe(true);
  expect(mocks.save).toHaveBeenCalledWith("athlete", "anthropometrics", expect.objectContaining({ height_in: 72, weight_lb: null }), "onboarding.anthropometrics");
  expect(mocks.next).not.toHaveBeenCalled();
});
it("body save failure keeps the athlete on the current form", async () => {
  mocks.save.mockRejectedValue(new Error("network unavailable"));
  render(<AnthropometricsStep onContinue={mocks.next} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByLabelText("Height (inches)")).toHaveValue(70));
  fireEvent.click(screen.getByRole("button", { name: "Save & continue" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  expect(mocks.next).not.toHaveBeenCalled();
});