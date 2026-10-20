import { GAME_IQ_AVAILABLE_TO_ATHLETES } from '@/lib/hammer/athleteFeatureAvailability';

/** Saved historical plans cannot advertise work athletes cannot open. */
export function visibleCoachPlanBlocks<T extends { modality: string; status: string }>(blocks: readonly T[]): T[] {
  return blocks.filter(block => block.status === 'ready'
    && (block.modality !== 'game_iq' || GAME_IQ_AVAILABLE_TO_ATHLETES));
}