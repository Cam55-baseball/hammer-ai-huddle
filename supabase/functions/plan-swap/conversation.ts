/** AI can interpret availability; it cannot certify a prescription or assert a save. */
export function validateAvailabilityInterpretation(value: unknown, allowed: readonly string[]) {
  if (!value || typeof value !== "object") throw new Error("Check your equipment answer.");
  const row = value as Record<string, unknown>;
  const read = (key: string): string[] => {
    const values = row[key];
    if (!Array.isArray(values) || values.length > 40 || values.some(item => typeof item !== "string" || !allowed.includes(item))) {
      throw new Error("Some equipment names could not be checked. Choose the listed items.");
    }
    return [...new Set(values as string[])];
  };
  const have = read("have"), lacks = read("lacks");
  if (have.some(item => lacks.includes(item))) throw new Error("An item cannot be available and missing.");
  if (!lacks.length) throw new Error("Tell me which item is missing today.");
  return { have, lacks };
}