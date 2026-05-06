import { ComponentType, lazy } from 'react';
import GenericModuleDemo from './shells/GenericModuleDemo';

// Custom hand-built shells.
const HittingAnalysisDemo = lazy(() => import('./shells/HittingAnalysisDemo'));
const IronBambinoDemo = lazy(() => import('./shells/IronBambinoDemo'));
const VaultDemo = lazy(() => import('./shells/VaultDemo'));

// Generic shells: one wrapper per component_key, all backed by GenericModuleDemo + per-key config.
const generic = (key: string): ComponentType => {
  const Comp = () => <GenericModuleDemo configKey={key} />;
  Comp.displayName = `GenericDemo(${key})`;
  return Comp;
};

export const demoComponents: Record<string, ComponentType<any>> = {
  'hitting-analysis': HittingAnalysisDemo,
  'iron-bambino': IronBambinoDemo,
  'vault': VaultDemo,
  // Pitching family
  'pitching-analysis': generic('pitching-analysis'),
  'throwing-analysis': generic('throwing-analysis'),
  'pickoff-trainer': generic('pickoff-trainer'),
  'pitch-design': generic('pitch-design'),
  'command-grid': generic('command-grid'),
  'royal-timing': generic('royal-timing'),
  'bullpen-planner': generic('bullpen-planner'),
  // Speed/baserunning
  'speed-lab': generic('speed-lab'),
  'base-stealing': generic('base-stealing'),
  'baserunning-iq': generic('baserunning-iq'),
  // Strength/conditioning
  'explosive-conditioning': generic('explosive-conditioning'),
  'heat-factory': generic('heat-factory'),
  'hammer-block-builder': generic('hammer-block-builder'),
  // Recovery/nutrition/vision
  'nutrition': generic('nutrition'),
  'regulation': generic('regulation'),
  'tex-vision': generic('tex-vision'),
  // Library/cards
  'custom-cards': generic('custom-cards'),
  'drill-library': generic('drill-library'),
  'video-library': generic('video-library'),
  // Two-way
  'unicorn-engine': generic('unicorn-engine'),
};
