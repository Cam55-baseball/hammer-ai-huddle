import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
const { gameEvidence, trainingGate, lockedAccess } = vi.hoisted(() => ({
  gameEvidence: vi.fn(), trainingGate: vi.fn(), lockedAccess: vi.fn(),
}));
vi.mock('@/components/analytics/DataBuildingGate', () => ({
  // The real zero-session branch does not mount children.
  DataBuildingGate: () => { trainingGate(); return null; },
}));
vi.mock('@/components/UpgradePrompt', () => ({
  UpgradePrompt: () => { lockedAccess(); return null; },
}));
import { Advanced } from './ProgressDashboard';
function GameEvidence() { gameEvidence(); return null; }
describe('Game IQ evidence access is independent of training-session milestones', () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); });
  it('mounts subscribed game evidence with zero training sessions', () => {
    render(<Advanced hasAdvancedAccess requireTrainingHistory={false}><GameEvidence /></Advanced>);
    expect(gameEvidence).toHaveBeenCalledTimes(1);
    expect(trainingGate).not.toHaveBeenCalled();
  });
  it('refuses game evidence without subscribed access', () => {
    render(<Advanced hasAdvancedAccess={false} requireTrainingHistory={false}><GameEvidence /></Advanced>);
    expect(gameEvidence).not.toHaveBeenCalled();
    expect(lockedAccess).toHaveBeenCalledTimes(1);
  });
  it('preserves the classic performance report training-history gate', () => {
    render(<Advanced hasAdvancedAccess><GameEvidence /></Advanced>);
    expect(trainingGate).toHaveBeenCalledTimes(1);
    expect(gameEvidence).not.toHaveBeenCalled();
  });
});