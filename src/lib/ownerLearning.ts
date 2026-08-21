/**
 * Owner-side learning store. localStorage-only — no DB writes.
 * Tracks rolling counts for format / domains / tag layers across the
 * owner's last N saves so we can pre-select smart defaults.
 *
 * Reset via `resetLearning()` (exposed in the Help sheet).
 */
import type { TagLayer } from './videoRecommendationEngine';

const KEY = 'hammer.owner.learning.v1';
const MAX_SAVES = 50;

interface Choice {
  format?: string;
  domains: string[];
  layers: TagLayer[];
  ts: number;
}

/** Foundation videos have their own field set — learned separately. */
interface FoundationChoice {
  domain?: string;
  scope?: string;
  audiences: string[];
  triggers: string[];
  ts: number;
}

interface Store {
  choices: Choice[];
  foundationChoices?: FoundationChoice[];
}


function read(): Store {
  if (typeof window === 'undefined') return { choices: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { choices: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.choices)) return { choices: [] };
    return parsed as Store;
  } catch {
    return { choices: [] };
  }
}

function write(s: Store): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode — silent */
  }
}

export function recordOwnerChoice(choice: Omit<Choice, 'ts'>): void {
  const store = read();
  store.choices.unshift({ ...choice, ts: Date.now() });
  store.choices = store.choices.slice(0, MAX_SAVES);
  write(store);
}

export interface SmartDefaults {
  topFormat: string | null;
  topDomains: string[];     // ranked, 1–3
  topLayerWeights: Partial<Record<TagLayer, number>>;
  sampleSize: number;
}

function rank<T extends string>(items: T[]): T[] {
  const counts = new Map<T, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

export function getSmartDefaults(): SmartDefaults {
  const { choices } = read();
  const formats = choices.map(c => c.format).filter(Boolean) as string[];
  const domains = choices.flatMap(c => c.domains);
  const layers = choices.flatMap(c => c.layers);

  const layerWeights: Partial<Record<TagLayer, number>> = {};
  for (const l of layers) layerWeights[l] = (layerWeights[l] ?? 0) + 1;

  return {
    topFormat: rank(formats)[0] ?? null,
    topDomains: rank(domains).slice(0, 3),
    topLayerWeights: layerWeights,
    sampleSize: choices.length,
  };
}

export function recordFoundationChoice(choice: Omit<FoundationChoice, 'ts'>): void {
  const store = read();
  const list = store.foundationChoices ?? [];
  list.unshift({ ...choice, ts: Date.now() });
  store.foundationChoices = list.slice(0, MAX_SAVES);
  write(store);
}

export interface FoundationSmartDefaults {
  topDomain: string | null;
  topScope: string | null;
  topAudiences: string[];
  topTriggers: string[];
  sampleSize: number;
}

/** Most-used foundation field values across the owner's recent saves. */
export function getFoundationSmartDefaults(): FoundationSmartDefaults {
  const list = read().foundationChoices ?? [];
  return {
    topDomain: rank(list.map(c => c.domain).filter(Boolean) as string[])[0] ?? null,
    topScope: rank(list.map(c => c.scope).filter(Boolean) as string[])[0] ?? null,
    topAudiences: rank(list.flatMap(c => c.audiences ?? [])).slice(0, 3),
    topTriggers: rank(list.flatMap(c => c.triggers ?? [])).slice(0, 3),
    sampleSize: list.length,
  };
}



export function resetLearning(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* silent */
  }
}
