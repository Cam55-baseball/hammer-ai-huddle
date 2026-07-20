/**
 * Alignment Resolver — chooses a defensive preset from `alignment_selector`
 * rules on an iq_situation, given batter side + runners + outs + count.
 *
 * Rule schema (jsonb on iq_situations.alignment_selector):
 *   {
 *     "rules": [
 *       { "when": { runners?: RunnerBase[], runners_any?: RunnerBase[],
 *                    outs?: number[], count?: { balls_gte?, balls_lte?, strikes_gte?, strikes_lte? },
 *                    batter_side?: "R"|"L"|"any" },
 *         "preset": "double_play_depth" },
 *     ],
 *     "default": "standard"
 *   }
 * First matching rule wins. Missing selector → sport `standard`.
 */
import type { AlignmentPreset, AlignmentPositions } from "@/hooks/useDefensiveAlignment";
import { resolvePositions, fallbackAlignment } from "@/hooks/useDefensiveAlignment";
import type { FieldSport, Handedness } from "./fieldModel";

export type RunnerBase = "1B" | "2B" | "3B";
export interface GameState {
  batterSide: Handedness;
  runners: RunnerBase[];
  outs: number;
  count?: { balls: number; strikes: number };
}
export interface AlignmentRule {
  when?: {
    runners?: RunnerBase[];              // exact set match (any order)
    runners_any?: RunnerBase[];          // fire if ANY runner is on one of these bases
    outs?: number[];                     // matches if outs ∈ list
    batter_side?: "R" | "L" | "any";
    count?: {
      balls_gte?: number; balls_lte?: number;
      strikes_gte?: number; strikes_lte?: number;
    };
  };
  preset: string;
}
export interface AlignmentSelector {
  rules?: AlignmentRule[];
  default?: string;
}

export interface ResolvedAlignment {
  presetKey: string;
  preset: AlignmentPreset | null;
  positions: AlignmentPositions;
  matchedRule: number | null;   // index into rules array, or null for default
  reason: "rule" | "default" | "fallback";
}

function eqSet(a: RunnerBase[], b: RunnerBase[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

function ruleMatches(rule: AlignmentRule, state: GameState): boolean {
  const w = rule.when ?? {};
  if (w.runners !== undefined && !eqSet(w.runners, state.runners)) return false;
  if (w.runners_any !== undefined) {
    const has = w.runners_any.some((r) => state.runners.includes(r));
    if (!has) return false;
  }
  if (w.outs !== undefined && !w.outs.includes(state.outs)) return false;
  if (w.batter_side && w.batter_side !== "any" && w.batter_side !== state.batterSide) return false;
  if (w.count && state.count) {
    const c = w.count;
    if (c.balls_gte !== undefined && state.count.balls < c.balls_gte) return false;
    if (c.balls_lte !== undefined && state.count.balls > c.balls_lte) return false;
    if (c.strikes_gte !== undefined && state.count.strikes < c.strikes_gte) return false;
    if (c.strikes_lte !== undefined && state.count.strikes > c.strikes_lte) return false;
  }
  return true;
}

export function pickPresetKey(
  selector: AlignmentSelector | null | undefined,
  state: GameState,
  fallbackKey: string | null | undefined,
): { key: string; matchedRule: number | null; reason: "rule" | "default" | "fallback" } {
  if (selector?.rules) {
    for (let i = 0; i < selector.rules.length; i++) {
      if (ruleMatches(selector.rules[i], state)) {
        return { key: selector.rules[i].preset, matchedRule: i, reason: "rule" };
      }
    }
  }
  const def = selector?.default ?? fallbackKey ?? "standard";
  return { key: def, matchedRule: null, reason: selector?.default ? "default" : "fallback" };
}

export function resolveAlignment(args: {
  presets: AlignmentPreset[];
  selector: AlignmentSelector | null | undefined;
  situationPreset: string | null | undefined;   // legacy situation.alignment_preset
  sport: FieldSport;
  state: GameState;
}): ResolvedAlignment {
  const picked = pickPresetKey(args.selector, args.state, args.situationPreset);
  const preset =
    args.presets.find((p) => p.preset_key === picked.key) ??
    args.presets.find((p) => p.is_default) ??
    args.presets.find((p) => p.preset_key === "standard") ??
    null;
  const positions = preset
    ? resolvePositions(preset, args.sport, args.state.batterSide)
    : fallbackAlignment(args.sport);
  return {
    presetKey: preset?.preset_key ?? picked.key,
    preset,
    positions,
    matchedRule: picked.matchedRule,
    reason: preset ? picked.reason : "fallback",
  };
}

/** Return every defender that falls outside fair territory (approx). */
export function findOffFieldDefenders(pos: AlignmentPositions): string[] {
  const off: string[] = [];
  Object.entries(pos).forEach(([role, p]) => {
    if (!p) return;
    // Fair region ≈ y between 5 and 100, y <= 100 - |x-50|, with a small buffer.
    if (p.x < 2 || p.x > 98 || p.y < 2 || p.y > 98) off.push(role);
    else if (p.y > 100 - Math.abs(p.x - 50) + 2) off.push(role);  // in foul ground below diamond
  });
  return off;
}

/** Rough coverage % using Monte Carlo grid (0..100). */
export function estimateCoverage(
  pos: AlignmentPositions,
  radii: Record<string, number>,
  defaultRadius = 10,
): number {
  const N = 30;
  let inside = 0, covered = 0;
  const roles = Object.keys(pos) as string[];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = (i + 0.5) * (100 / N);
      const y = (j + 0.5) * (100 / N);
      if (y > 100 - Math.abs(x - 50) || y < 5) continue;
      inside++;
      for (const r of roles) {
        const p = pos[r as any]; if (!p) continue;
        const rad = radii[r] ?? defaultRadius;
        const dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy <= rad * rad) { covered++; break; }
      }
    }
  }
  return inside === 0 ? 0 : Math.round((covered / inside) * 100);
}
