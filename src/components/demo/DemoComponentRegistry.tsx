import { ComponentType } from 'react';
import { lazyWithRetry } from '@/utils/lazyWithRetry';
import GenericModuleDemo from './shells/GenericModuleDemo';

// Custom hand-built shells — routed through lazyWithRetry so stale chunks
// self-heal after a deploy instead of dumping the user to a white screen.
const HittingAnalysisDemo = lazyWithRetry(() => import('./shells/HittingAnalysisDemo'));
const IronBambinoDemo = lazyWithRetry(() => import('./shells/IronBambinoDemo'));
const VaultDemo = lazyWithRetry(() => import('./shells/VaultDemo'));
const AskTheCoachDemo = lazyWithRetry(() => import('./shells/AskTheCoachDemo'));
const ScoutFeedDemo = lazyWithRetry(() => import('./shells/ScoutFeedDemo'));

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
  // Coach + Scout previews (For Your Team category)
  'ask-the-coach': AskTheCoachDemo,
  'scout-feed': ScoutFeedDemo,
};
