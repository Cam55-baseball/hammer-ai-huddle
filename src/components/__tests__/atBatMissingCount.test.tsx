import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AtBatPitchPanel } from "../games/AtBatPitchPanel";
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';

vi.mock("@/hooks/useAtBatPitches", () => ({ useAtBatPitches: () => ({
  list: { data: [] }, add: { isPending: false }, del: {},
  tally: { balls: 0, strikes: 0, count: 0, terminated: false, terminalReason: null, suggestedResult: null },
}) }));

describe("empty at-bat pitch evidence", () => {
  it("does not replace an unknown or manually entered count with an empty-list zero", async () => {
    const onTally = vi.fn();
    const screen = render(<QueryClientProvider client={new QueryClient()}><AtBatPitchPanel gameId="game" atBatId="atbat" inning={2} sport="baseball" onTally={onTally} /></QueryClientProvider>);
    await waitFor(() => expect(screen.container.childElementCount).toBeGreaterThan(0));
    expect(onTally).not.toHaveBeenCalled();
    screen.unmount();
  });
});