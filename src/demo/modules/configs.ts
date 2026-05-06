// Per-component_key configs that drive GenericModuleDemo.
import { genericSims } from '@/demo/sims/genericSims';

export type DiagramKey =
  | 'pitchTunnel' | 'commandGrid' | 'speedTrack' | 'heatBlock'
  | 'macroRing' | 'regulationGauge' | 'texGrid' | 'cardStack' | 'radial';

export interface InputDef {
  key: string;
  label: string;
  options: { label: string; value: string | number }[];
  default: string | number;
}

export interface ModuleConfig {
  fromSlug: string;
  simId: string;
  title?: string;
  inputs: InputDef[];
  diagram: DiagramKey;
  sim: (state: Record<string, any>, userId: string | null) => ReturnType<typeof genericSims['pitching-analysis']>;
}

const opt = (...v: (string | number)[]) => v.map(x => ({ label: String(x), value: x }));

export const moduleConfigs: Record<string, ModuleConfig> = {
  'pitching-analysis': {
    fromSlug: 'pitching-analysis', simId: 'pitching', diagram: 'pitchTunnel',
    inputs: [
      { key: 'pitch', label: 'Pitch', options: opt('fastball', 'curveball', 'changeup', 'slider'), default: 'fastball' },
      { key: 'intent', label: 'Intent', options: opt('strike', 'chase', 'waste'), default: 'strike' },
    ],
    sim: genericSims['pitching-analysis'],
  },
  'throwing-analysis': {
    fromSlug: 'throwing-analysis', simId: 'throwing', diagram: 'speedTrack',
    inputs: [
      { key: 'position', label: 'Position', options: opt('catcher', 'infield', 'outfield'), default: 'infield' },
      { key: 'slot', label: 'Arm slot', options: opt('over', '3/4', 'side'), default: 'over' },
    ],
    sim: genericSims['throwing-analysis'],
  },
  'pickoff-trainer': {
    fromSlug: 'pickoff-trainer', simId: 'pickoff', diagram: 'radial',
    inputs: [
      { key: 'lead', label: 'Runner lead', options: opt('small', 'normal', 'big'), default: 'normal' },
      { key: 'move', label: 'Move type', options: opt('jab', 'spin', 'jump'), default: 'spin' },
    ],
    sim: genericSims['pickoff-trainer'],
  },
  'pitch-design': {
    fromSlug: 'pitch-design', simId: 'pitchDesign', diagram: 'pitchTunnel',
    inputs: [
      { key: 'pitch', label: 'Pitch', options: opt('curveball', 'slider', 'cutter', 'sinker'), default: 'slider' },
      { key: 'grip', label: 'Grip', options: opt('standard', 'spike', 'split'), default: 'spike' },
    ],
    sim: genericSims['pitch-design'],
  },
  'command-grid': {
    fromSlug: 'command-grid', simId: 'commandGrid', diagram: 'commandGrid',
    inputs: [
      { key: 'zone', label: 'Target cell', options: [
        { label: 'Up & in', value: 1 }, { label: 'Up & away', value: 3 },
        { label: 'Middle', value: 12 }, { label: 'Low & in', value: 21 }, { label: 'Low & away', value: 23 },
      ], default: 12 },
      { key: 'count', label: 'Count', options: opt('ahead', 'even', 'behind'), default: 'ahead' },
    ],
    sim: genericSims['command-grid'],
  },
  'royal-timing': {
    fromSlug: 'royal-timing', simId: 'royalTiming', diagram: 'radial',
    inputs: [
      { key: 'tempo', label: 'Tempo', options: opt('slow', 'medium', 'quick'), default: 'medium' },
    ],
    sim: genericSims['royal-timing'],
  },
  'bullpen-planner': {
    fromSlug: 'bullpen-planner', simId: 'bullpen', diagram: 'pitchTunnel',
    inputs: [
      { key: 'intensity', label: 'Session', options: opt('recovery', 'tune', 'starter'), default: 'tune' },
    ],
    sim: genericSims['bullpen-planner'],
  },
  'speed-lab': {
    fromSlug: 'speed-lab', simId: 'speed', diagram: 'speedTrack',
    inputs: [
      { key: 'distance', label: 'Distance', options: opt(10, 30, 60), default: 60 },
      { key: 'experience', label: 'Level', options: opt('beginner', 'intermediate', 'advanced'), default: 'intermediate' },
    ],
    sim: genericSims['speed-lab'],
  },
  'base-stealing': {
    fromSlug: 'base-stealing', simId: 'steal', diagram: 'speedTrack',
    inputs: [
      { key: 'lead', label: 'Lead', options: opt('safe', 'normal', 'aggressive'), default: 'normal' },
      { key: 'jump', label: 'Jump', options: opt('average', 'good', 'elite'), default: 'good' },
    ],
    sim: genericSims['base-stealing'],
  },
  'baserunning-iq': {
    fromSlug: 'baserunning-iq', simId: 'baserunIQ', diagram: 'radial',
    inputs: [
      { key: 'situation', label: 'On base', options: opt('1st', '2nd', '3rd'), default: '2nd' },
      { key: 'outs', label: 'Outs', options: opt('0', '1', '2'), default: '1' },
    ],
    sim: genericSims['baserunning-iq'],
  },
  'explosive-conditioning': {
    fromSlug: 'explosive-conditioning', simId: 'explosive', diagram: 'heatBlock',
    inputs: [
      { key: 'focus', label: 'Focus', options: opt('jump', 'sprint', 'throw'), default: 'jump' },
    ],
    sim: genericSims['explosive-conditioning'],
  },
  'heat-factory': {
    fromSlug: 'heat-factory', simId: 'heat', diagram: 'heatBlock',
    inputs: [
      { key: 'phase', label: 'Phase', options: opt('off-season', 'pre-season', 'in-season'), default: 'pre-season' },
      { key: 'days', label: 'Days/wk', options: opt(2, 3, 4, 5), default: 4 },
    ],
    sim: genericSims['heat-factory'],
  },
  'hammer-block-builder': {
    fromSlug: 'hammer-block-builder', simId: 'hammerBlock', diagram: 'heatBlock',
    inputs: [
      { key: 'emphasis', label: 'Emphasis', options: opt('power', 'speed', 'hypertrophy'), default: 'power' },
    ],
    sim: genericSims['hammer-block-builder'],
  },
  'nutrition': {
    fromSlug: 'nutrition', simId: 'nutrition', diagram: 'macroRing',
    inputs: [
      { key: 'preset', label: 'Goal', options: opt('lean', 'build', 'recover'), default: 'build' },
    ],
    sim: genericSims['nutrition'],
  },
  'regulation': {
    fromSlug: 'regulation', simId: 'regulation', diagram: 'regulationGauge',
    inputs: [
      { key: 'sleep', label: 'Sleep (h)', options: opt(5, 6, 7, 8), default: 7 },
      { key: 'hrv', label: 'HRV', options: opt('low', 'ok', 'high'), default: 'ok' },
      { key: 'soreness', label: 'Soreness', options: opt('low', 'mid', 'high'), default: 'mid' },
    ],
    sim: genericSims['regulation'],
  },
  'tex-vision': {
    fromSlug: 'tex-vision', simId: 'texVision', diagram: 'texGrid',
    inputs: [
      { key: 'focus', label: 'Focus', options: opt('tracking', 'recognition', 'timing'), default: 'tracking' },
    ],
    sim: genericSims['tex-vision'],
  },
  'custom-cards': {
    fromSlug: 'custom-cards', simId: 'cards', diagram: 'cardStack',
    inputs: [
      { key: 'type', label: 'Type', options: opt('mechanical', 'mental', 'situational'), default: 'mental' },
      { key: 'difficulty', label: 'Difficulty', options: opt('easy', 'medium', 'hard'), default: 'medium' },
    ],
    sim: genericSims['custom-cards'],
  },
  'drill-library': {
    fromSlug: 'drill-library', simId: 'drillLibrary', diagram: 'cardStack',
    inputs: [
      { key: 'skill', label: 'Skill', options: opt('hitting', 'pitching', 'fielding', 'speed'), default: 'hitting' },
    ],
    sim: genericSims['drill-library'],
  },
  'video-library': {
    fromSlug: 'video-library', simId: 'videoLibrary', diagram: 'cardStack',
    inputs: [
      { key: 'category', label: 'Category', options: opt('hitting', 'pitching', 'mental', 'speed'), default: 'hitting' },
    ],
    sim: genericSims['video-library'],
  },
  'unicorn-engine': {
    fromSlug: 'unicorn-engine', simId: 'unicorn', diagram: 'heatBlock',
    inputs: [
      { key: 'split', label: 'Hitter %', options: opt(30, 50, 70), default: 50 },
    ],
    sim: genericSims['unicorn-engine'],
  },
};
