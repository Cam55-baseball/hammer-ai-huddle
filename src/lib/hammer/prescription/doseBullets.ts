/**
 * Step 24 item 4 — multi-part details are shown as one bullet per item.
 *
 * "full activation set: iron scap 2x10, reverse fly 2x10, Y-T-W 2x8"
 *   → heading "full activation set"
 *   → ["iron scap 2x10", "reverse fly 2x10", "Y-T-W 2x8"]
 *
 * A plain single dose ("3 x 8") returns no bullets and is rendered as-is.
 * Pure display formatting — it never changes a dose.
 */
export interface DoseParts {
  heading: string | null;
  bullets: string[];
}

export function doseBullets(dosage: string | null | undefined): DoseParts {
  const raw = (dosage ?? "").trim();
  if (!raw) return { heading: null, bullets: [] };

  let heading: string | null = null;
  let body = raw;
  const colon = raw.indexOf(":");
  if (colon > 0 && raw.slice(colon + 1).includes(",")) {
    heading = raw.slice(0, colon).trim();
    body = raw.slice(colon + 1).trim();
  }

  const parts = body
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Only treat it as a list when there really are several separate items.
  if (parts.length < 2) return { heading: null, bullets: [] };
  return { heading, bullets: parts };
}
