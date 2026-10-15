import { describe, it, expect } from "vitest";
import { normalizeEmail, isValidEmail, emailSchema } from "./email";

describe("email handling", () => {
  it("accepts plus-addresses", () => {
    expect(isValidEmail("hammersmodality+demoorg@gmail.com")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.example.co")).toBe(true);
  });
  it("trims pasted spaces and invisible characters", () => {
    expect(normalizeEmail("  hammersmodality+democoach@gmail.com \u200B")).toBe("hammersmodality+democoach@gmail.com");
    expect(isValidEmail(" a+b@gmail.com\u00A0")).toBe(true);
  });
  it("lowercases capitals from auto-capitalization", () => {
    expect(emailSchema().parse("Hammersmodality+DemoOrg@Gmail.com")).toBe("hammersmodality+demoorg@gmail.com");
  });
  it("still rejects non-addresses", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("a@")).toBe(false);
  });
});
