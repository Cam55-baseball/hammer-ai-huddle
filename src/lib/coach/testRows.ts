// Plan v3.1 §4 — Coach View "Tests" tab. Shows only what the test recorded;
// internal keys (leading "_") are context, not results, and are skipped.
export type TestResult = { label: string; value: string };

const words = (k: string) => {
  const w = k.replace(/_/g, " ").trim();
  return w.charAt(0).toUpperCase() + w.slice(1);
};

export function testResults(results: unknown): TestResult[] {
  if (!results || typeof results !== "object") return [];
  return Object.entries(results as Record<string, unknown>)
    .filter(([k, v]) => !k.startsWith("_") && v !== null && v !== "" && (typeof v === "number" || typeof v === "string"))
    .map(([k, v]) => ({ label: words(k), value: String(v) }));
}
