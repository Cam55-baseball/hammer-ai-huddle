import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StartHammersTodayCardView } from "./StartHammersTodayCard";

describe("start card lists what's missing", () => {
  it("locks Start and links each missing detail", () => {
    render(<MemoryRouter><StartHammersTodayCardView onStart={vi.fn()} starting={false} error={null} locked
      missing={[{ key: "days", label: "How many days a week you can train", to: "/onboarding/athlete?edit=schedule" }]}
      positions={["SS"]} sport="baseball" age={15} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /Start Hammers Today Plan/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "How many days a week you can train" })).toHaveAttribute("href", "/onboarding/athlete?edit=schedule");
  });
});
