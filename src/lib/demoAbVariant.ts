// Deterministic A/B assignment for demo conversions.
// Variant A: Recommend Golden 2Way ($400)
// Variant B: Recommend 5Tool Player ($300)
// Stored in localStorage for stability across reloads.

export type AbVariant = 'A' | 'B';

const KEY = 'demo_ab_variant';

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getDemoAbVariant(seed?: string | null): AbVariant {
  try {
    const cached = localStorage.getItem(KEY);
    if (cached === 'A' || cached === 'B') return cached;
    const s = seed || crypto.randomUUID();
    const v: AbVariant = hashSeed(s) % 2 === 0 ? 'A' : 'B';
    localStorage.setItem(KEY, v);
    return v;
  } catch {
    return 'A';
  }
}

export function tierForVariant(v: AbVariant): 'golden2way' | '5tool' {
  return v === 'A' ? 'golden2way' : '5tool';
}
