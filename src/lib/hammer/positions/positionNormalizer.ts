/**
 * Shared position normalization for Hammers Today.
 *
 * Athlete position data is authored by several older and newer flows, so read
 * paths can receive a single string, comma/slash-separated strings, arrays, or
 * object-shaped values. This helper is intentionally no-throw and read-only.
 */

const POSITION_TOKEN_SEPARATOR = /[,;/|\n]+/;
const OBJECT_POSITION_KEYS = [
  "value",
  "label",
  "position",
  "code",
  "name",
  "id",
  "primary_position",
  "secondary_position",
] as const;

function pushToken(tokens: string[], seen: Set<string>, raw: string): void {
  const cleaned = raw.trim();
  if (!cleaned) return;
  const key = cleaned.toUpperCase();
  if (seen.has(key)) return;
  seen.add(key);
  tokens.push(cleaned);
}

export function coercePositionTokens(value: unknown): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const visit = (input: unknown, depth: number): void => {
    if (depth > 5 || input == null) return;

    if (typeof input === "string") {
      input.split(POSITION_TOKEN_SEPARATOR).forEach((part) => pushToken(tokens, seen, part));
      return;
    }

    if (typeof input === "number") {
      pushToken(tokens, seen, String(input));
      return;
    }

    if (Array.isArray(input)) {
      input.forEach((item) => visit(item, depth + 1));
      return;
    }

    if (typeof input === "object") {
      const record = input as Record<string, unknown>;
      for (const key of OBJECT_POSITION_KEYS) {
        if (key in record) visit(record[key], depth + 1);
      }
    }
  };

  visit(value, 0);
  return tokens;
}

export function firstPositionToken(value: unknown): string | null {
  return coercePositionTokens(value)[0] ?? null;
}

export function positionTokenIsPitcher(value: unknown): boolean {
  return coercePositionTokens(value).some((token) => {
    const p = token.toLowerCase().trim();
    return p === "p" || p === "sp" || p === "rp" || p === "cp" || p.includes("pitch");
  });
}