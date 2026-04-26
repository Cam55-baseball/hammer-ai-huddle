/**
 * PHASE 8 RULES:
 * - No ranking logic here
 * - No DB writes
 * - Only user-triggered intent mapping
 * - All actions are explicit (never automatic)
 */
import type { CtaKind } from './videoCtaSuggestions';

export type ConversionAction =
  | 'open_program_builder'
  | 'open_bundle_builder'
  | 'open_consultation_flow'
  | null;

export function mapCtaToAction(cta: CtaKind): ConversionAction {
  if (cta === 'program') return 'open_program_builder';
  if (cta === 'bundle') return 'open_bundle_builder';
  if (cta === 'consultation') return 'open_consultation_flow';
  return null;
}
