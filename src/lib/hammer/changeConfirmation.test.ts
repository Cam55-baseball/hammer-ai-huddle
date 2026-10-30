import { expect, it } from 'vitest';
import { readChangeConfirmation, rememberChangeConfirmation } from './changeConfirmation';
it('keeps the confirmed result across remount reads for the same athlete and date only', () => {
  rememberChangeConfirmation('test-player', '2026-10-30', 'Seven saved days confirmed');
  expect(readChangeConfirmation('test-player', '2026-10-30')).toBe('Seven saved days confirmed');
  expect(readChangeConfirmation('another-player', '2026-10-30')).toBeNull();
  expect(readChangeConfirmation('test-player', '2026-10-31')).toBeNull();
  expect(readChangeConfirmation(undefined, '2026-10-30')).toBeNull();
});