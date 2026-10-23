import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TimingStudyMoments } from "./TimingStudyMoments";
const state = vi.hoisted(() => ({ caught: false, error: false }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useOptionalAuth: () => ({ user: { id: "study-player" } }) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: state.caught, isError: state.error }) }));
afterEach(() => { cleanup(); state.caught = false; state.error = false; });
describe("study evidence stays player and discipline scoped", () => {
  it("keeps an unrecorded steal out of the player evidence", () => {
    const v = render(<TimingStudyMoments sport="baseball" position="SS" roles={["baserunner"]} />);
    expect(v.container.textContent).not.toContain("Your logged game includes");
    state.caught = true;
    v.rerender(<TimingStudyMoments sport="baseball" position="SS" roles={["baserunner"]} />);
    expect(v.container.textContent).toContain("Your logged game includes");
  });
  it("does not carry a baseball pitching goal into softball", () => {
    const savedGoals = { version: 2, baseball: { pitcher: { pitching: [{ id: "delivery_timing", rank: "primary" }] } } };
    const v = render(<TimingStudyMoments sport="softball" position="P" roles={[]} savedGoals={savedGoals} />);
    expect(v.container.textContent).not.toContain("Your saved pitching focus");
  });
});