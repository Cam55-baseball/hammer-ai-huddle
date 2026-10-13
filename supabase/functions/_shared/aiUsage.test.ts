import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { estimateCostUsd, overHourlyLimit, resumeAtFrom } from "./aiUsage.ts";

Deno.test("Gemini cost uses $0.30 in / $2.50 out per 1M", () => {
  assertEquals(estimateCostUsd("gemini-3.6-flash", 1_000_000, 0), 0.3);
  assertEquals(estimateCostUsd("gemini-3.6-flash", 0, 1_000_000), 2.5);
});
Deno.test("gpt-4o-mini fallback priced separately", () => {
  assertEquals(estimateCostUsd("gpt-4o-mini-2024-07-18", 1_000_000, 1_000_000), 0.75);
});
Deno.test("hourly limit: 29 allowed, 30th blocked", () => {
  assertEquals(overHourlyLimit(29), false);
  assertEquals(overHourlyLimit(30), true);
});
Deno.test("over-limit request resumes when the oldest analysis leaves the hour", () => {
  const now = Date.parse("2026-10-13T10:00:00Z");
  assertEquals(resumeAtFrom("2026-10-13T09:20:00Z", now), "2026-10-13T10:20:00.000Z");
  assertEquals(resumeAtFrom(null, now), "2026-10-13T11:00:00.000Z");
});
