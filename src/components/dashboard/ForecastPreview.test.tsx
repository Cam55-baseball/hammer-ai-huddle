import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { HammersCardProps } from "@/components/intelligence/HammersCard";

const { insight } = vi.hoisted(() => ({ insight: vi.fn() }));
vi.mock("@/components/intelligence/HammersCard", () => ({
  HammersCard: (props: HammersCardProps) => { insight(props); return null; },
}));

import { ForecastPreview } from "./ForecastPreview";

describe("Growth forecast evidence boundary", () => {
  it("never certifies future growth without measured growth evidence", () => {
    render(<ForecastPreview />);
    const props = insight.mock.calls.at(-1)?.[0] as HammersCardProps | undefined;
    expect(props?.howSure).toBe("need_more_data");
    expect(props?.samples).toBeUndefined();
  });
});