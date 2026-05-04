import { ComponentType, lazy } from 'react';

// Maps `component_key` from demo_registry → demo shell component.
// Add new keys here as shells are built; missing keys gracefully fall back to <DemoComingSoon />.
export const demoComponents: Record<string, ComponentType<any>> = {
  'hitting-analysis': lazy(() => import('./shells/HittingAnalysisDemo')),
  'iron-bambino': lazy(() => import('./shells/IronBambinoDemo')),
  'vault': lazy(() => import('./shells/VaultDemo')),
};
