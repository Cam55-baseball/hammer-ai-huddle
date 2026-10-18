import { describe, it, expect } from "vitest";
import { howSureFor, isEarlyRead, HOW_SURE_LABEL } from "./howSure";

describe("how sure", () => {
  it("uses the owner's four words", () => {
    expect(Object.values(HOW_SURE_LABEL)).toEqual(["Measured", "Pattern", "Hunch", "Need more data"]);
  });
  it("no data is always Need more data, even if marked recorded", () => {
    expect(howSureFor({ samples: 0, directlyRecorded: true })).toBe("need_more_data");
  });
  it("recorded values are Measured", () => {
    expect(howSureFor({ samples: 1, directlyRecorded: true })).toBe("measured");
  });
  it("repeating together needs 3+ samples to be a Pattern", () => {
    expect(howSureFor({ samples: 2, repeatsTogether: true })).toBe("hunch");
    expect(howSureFor({ samples: 3, repeatsTogether: true })).toBe("pattern");
  });
  it("small samples are an early read", () => {
    expect(isEarlyRead(4)).toBe(true);
    expect(isEarlyRead(5)).toBe(false);
    expect(isEarlyRead(0)).toBe(false);
  });
});
