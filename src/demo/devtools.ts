import type { WeightShape } from './completionRules';

/**
 * Live-tune the demo completion weights without redeploying.
 * Available in DEV only via `window.setDemoWeights({...})`.
 */
export function setDemoWeights(w: WeightShape) {
  localStorage.setItem('demo_completion_weights', JSON.stringify(w));
  location.reload();
}

export function clearDemoWeights() {
  localStorage.removeItem('demo_completion_weights');
  location.reload();
}

export function setDemoDebug(on: boolean) {
  if (on) localStorage.setItem('demo_debug', '1');
  else localStorage.removeItem('demo_debug');
  location.reload();
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).setDemoWeights = setDemoWeights;
  (window as any).clearDemoWeights = clearDemoWeights;
  (window as any).setDemoDebug = setDemoDebug;
}
