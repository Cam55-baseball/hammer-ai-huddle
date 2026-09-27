/**
 * One Euro filter, gated by an EXTERNAL speed signal (lower-body velocity),
 * not by the filtered signal's own derivative — head noise must not raise its
 * own cutoff.
 *
 *   cutoff_hz = min_cutoff_hz + beta * gate_speed   (gate in body-heights/s)
 *
 * Two applications of the same filter:
 *   - oneEuroZeroPhase — UPLOADS. Forward pass + backward pass, averaged
 *     (filtfilt-style). No lag, so frame-indexed anchors are not shifted.
 *   - oneEuroCausal    — LIVE / DelayCam only. Lags by construction; never use
 *     it on the upload path.
 *
 * Deterministic: no RNG, no clock. Each pass is seeded from its first observed
 * sample. Null gaps pass through as null and reset the filter state.
 */
export const ONE_EURO_VERSION = "one_euro@1.0.0-lowerbody-gate-zero-phase";

export interface OneEuroParams {
  readonly min_cutoff_hz: number;
  readonly beta: number;
  /** Cutoff used for the derivative estimate (standard One Euro d_cutoff). */
  readonly d_cutoff_hz: number;
}

/** Stance: 0.3 Hz. Delivery (lower body ≥ ~1 body/s): ≥ 8 Hz, i.e. near-open at 24–30 fps. */
export const HEAD_ONE_EURO: OneEuroParams = { min_cutoff_hz: 0.3, beta: 8, d_cutoff_hz: 1 };

const alpha = (cutoff: number, fps: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau * fps);
};

export function oneEuroCausal(
  xs: readonly (number | null)[], gate: readonly (number | null)[], fps: number, p: OneEuroParams,
): (number | null)[] {
  const out: (number | null)[] = xs.map(() => null);
  let prev: number | null = null;
  for (let k = 0; k < xs.length; k++) {
    const x = xs[k];
    if (x == null || !Number.isFinite(x)) { prev = null; continue; }
    if (prev == null) { prev = x; out[k] = x; continue; }
    const g = gate[k];
    const cutoff = p.min_cutoff_hz + p.beta * (g != null && Number.isFinite(g) ? Math.max(0, g) : 0);
    const a = alpha(cutoff, fps);
    prev = prev + a * (x - prev);
    out[k] = prev;
  }
  return out;
}

export function oneEuroZeroPhase(
  xs: readonly (number | null)[], gate: readonly (number | null)[], fps: number, p: OneEuroParams,
): (number | null)[] {
  const f = oneEuroCausal(xs, gate, fps, p);
  const b = oneEuroCausal([...xs].reverse(), [...gate].reverse(), fps, p).reverse();
  return f.map((v, k) => (v == null || b[k] == null ? null : (v + (b[k] as number)) / 2));
}
