import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotlightTour, type TourStep } from "../SpotlightTour";

const step: TourStep = {
  id: "one",
  target: '[data-tour="target"]',
  title: "First step",
  body: "The first explanation.",
};

const rect = {
  x: 20, y: 100, top: 100, left: 20, right: 340, bottom: 180,
  width: 320, height: 80, toJSON: () => ({}),
} as DOMRect;

describe("SpotlightTour exits", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => vi.restoreAllMocks());

  function renderReady(onClose = vi.fn(), navigate = vi.fn()) {
    const view = render(
      <>
        <section data-tour="target"><h2>Whole target heading</h2></section>
        <SpotlightTour
          tourId="exit-test"
          steps={[step]}
          open
          onClose={onClose}
          userId="athlete-1"
          navigate={navigate}
          currentPath="/opening-page"
        />
      </>,
    );
    return { ...view, onClose, navigate };
  }

  it("keeps a thumb-sized exit visible while waiting for a routed target", () => {
    const onClose = vi.fn();
    render(
      <SpotlightTour
        tourId="waiting"
        steps={[{ ...step, target: '[data-tour="missing"]', route: "/loading" }]}
        open
        onClose={onClose}
        navigate={vi.fn()}
        currentPath="/opening-page"
      />,
    );
    const exit = screen.getByRole("button", { name: "Exit demo" });
    expect(exit).toBeVisible();
    expect(exit).toHaveClass("min-h-12");
    fireEvent.click(exit);
    expect(onClose).toHaveBeenCalledWith("skipped");
  });

  it("exits from the dimmed backdrop", () => {
    const { onClose } = renderReady();
    fireEvent.click(screen.getByTestId("spotlight-tour-backdrop"));
    expect(onClose).toHaveBeenCalledWith("skipped");
  });

  it("exits with Escape", () => {
    const { onClose } = renderReady();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledWith("skipped");
  });

  it("consumes device back as an exit", () => {
    const { onClose } = renderReady();
    window.history.replaceState({ usr: { hmTour: true } }, "", window.location.href);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onClose).toHaveBeenCalledWith("skipped");
  });

  it("restores the route where the tour opened", async () => {
    const navigate = vi.fn();
    const onClose = vi.fn();
    const { rerender } = renderReady(onClose, navigate);
    await waitFor(() => expect(window.history.state?.usr?.hmTour).toBe(true));
    navigate.mockClear();
    rerender(
      <>
        <section data-tour="target"><h2>Whole target heading</h2></section>
        <SpotlightTour
          tourId="exit-test"
          steps={[step]}
          open
          onClose={onClose}
          userId="athlete-1"
          navigate={navigate}
          currentPath="/tour-target"
        />
      </>,
    );
    window.history.replaceState({}, "", window.location.href);
    fireEvent.click(screen.getByRole("button", { name: "Exit demo" }));
    expect(navigate).toHaveBeenCalledWith("/opening-page", { replace: true });
    expect(onClose).toHaveBeenCalledWith("skipped");
  });
});