// Registry mapping `component_key` (from demo_registry table) → demo preview component.
// Add a new entry here when building a real interactive demo shell for a submodule.
// Missing keys gracefully fall back to <DemoComingSoon /> in DemoSubmodule.
import { ComponentType, lazy } from 'react';

export const demoComponents: Record<string, ComponentType<any>> = {
  // Real demo shells go here as they're built, e.g.:
  // 'iron-bambino': lazy(() => import('@/components/demo/shells/IronBambinoDemo')),
};
