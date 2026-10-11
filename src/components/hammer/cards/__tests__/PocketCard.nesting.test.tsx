import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
vi.mock("@/components/support/ReportProblemButton", () => ({ ReportProblemButton: () => null }));
vi.mock("@/components/hammer/logging/ExtraLogs", () => ({ PracticeLog: () => null }));
vi.mock("../todayRhythm", () => ({ DomainGlyph: () => null, domainOf: () => "other", useRhythm: () => "open" }));
import { PocketCard } from "../PocketCard";

const card = (id: string, title: string, inner?: React.ReactNode) => (
  <PocketCard id={id} category={title} tone="" planDate="2099-01-01" prescribed>
    {() => <div data-body={id}>{title} body{inner}</div>}
  </PocketCard>
);

describe("a card never appears inside its own pop-up", () => {
  it("a warm-up card nested inside the warm-up pop-up renders only its body — no tile, no second pop-up", () => {
    cleanup(); localStorage.clear(); sessionStorage.clear();
    const v = render(card("block_warmup_x", "Warm-up", card("block_warmup_x", "Warm-up", card("activity_1", "Ankle bounces"))));
    fireEvent.click(v.getByRole("button", { name: /Warm-up/ }));
    const pages = document.querySelectorAll("[data-pocket-page]");
    expect(pages).toHaveLength(1);
    const page = pages[0] as HTMLElement;
    expect(page.querySelectorAll("[data-pocket-tile]")).toHaveLength(0);
    expect(page.querySelectorAll("[data-pocket-page]")).toHaveLength(0);
    expect(page.querySelectorAll("[data-workout-log]")).toHaveLength(1);
    expect(page.querySelectorAll("header[data-pocket-header]")).toHaveLength(1);
    expect(page.querySelectorAll("[data-card-disclaimer]")).toHaveLength(1);
  });
});
