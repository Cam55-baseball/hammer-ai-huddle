import { cleanup, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ owner: false, admin: false, evidence: vi.fn() }));
vi.mock('@/hooks/useOwnerAccess', () => ({ useOwnerAccess: () => ({ isOwner: state.owner, loading: false }) }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ isAdmin: state.admin, loading: false }) }));
import { ReportCardAccessGate } from './ReportCardAccessGate';
function Evidence() { state.evidence(); return null; }
describe('internal Report Card staff review', () => {
  beforeEach(() => { cleanup(); state.owner = false; state.admin = false; vi.clearAllMocks(); });
  it('does not mount archived evidence for an administrator', () => {
    state.admin = true;
    render(<ReportCardAccessGate><Evidence /></ReportCardAccessGate>);
    expect(state.evidence).not.toHaveBeenCalled();
  });
  it('does not mount archived evidence for the owner', () => {
    state.owner = true;
    render(<ReportCardAccessGate><Evidence /></ReportCardAccessGate>);
    expect(state.evidence).not.toHaveBeenCalled();
  });
  it('never mounts internal evidence for non-staff', () => {
    render(<ReportCardAccessGate><Evidence /></ReportCardAccessGate>);
    expect(state.evidence).not.toHaveBeenCalled();
  });
});