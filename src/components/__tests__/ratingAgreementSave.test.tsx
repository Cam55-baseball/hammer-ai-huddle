import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RatingAgreement } from "../ratings/RatingAgreement";

const mocks = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "coach" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
describe("agreement feedback preserves the displayed grade", () => {
  beforeEach(() => mocks.insert.mockReset().mockResolvedValue({ error: null }));
  it.each([[63, 65], [18.44, 18.4]])("stores %s as %s", async (grade, expected) => {
    render(<RatingAgreement athleteId="athlete" sport="baseball" position="SS" testKey="test" metricKey="overall" grade={grade} />);
    fireEvent.click(screen.getByRole("button", { name: "Agree" }));
    fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ grade: expected, agree: true, coach_id: "coach", athlete_id: "athlete" })));
  });
});