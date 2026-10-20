import { expect, it } from 'vitest';
import { visibleCoachPlanBlocks } from './visiblePlanBlocks';

it('does not prescribe unreleased Game IQ from an older saved athlete plan to coaches', () => {
  const hitting = { modality: 'hitting', status: 'ready' };
  expect(visibleCoachPlanBlocks([hitting, { modality: 'game_iq', status: 'ready' },
    { modality: 'throwing', status: 'off-day' }])).toEqual([hitting]);
});