import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Success from '../Success';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useOwnerAccess', () => ({ useOwnerAccess: () => ({ isOwner: false }) }));
vi.mock('@/lib/bundles', () => ({ claimPurchases: vi.fn() }));
vi.mock('@/components/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => children }));

describe('purchase confirmation evidence', () => {
  beforeEach(() => invoke.mockReset());
  it('does not fetch or expose purchase access without a checkout session', () => {
    const view = render(<MemoryRouter initialEntries={['/success']}><Success /></MemoryRouter>);
    expect(invoke).not.toHaveBeenCalled();
    expect(view.queryByRole('button', { name: 'Access Your Purchase' })).toBeNull();
  });
  it('does not expose purchase access when the server has no recorded purchase', async () => {
    invoke.mockResolvedValue({ data: { purchase: null }, error: null });
    const view = render(<MemoryRouter initialEntries={['/success?session_id=cs_test_evidence']}><Success /></MemoryRouter>);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('get-build-purchase', { body: { session_id: 'cs_test_evidence' } }));
    expect(view.queryByRole('button', { name: 'Access Your Purchase' })).toBeNull();
  });
  it('exposes purchase access only after a recorded purchase is returned', async () => {
    invoke.mockResolvedValue({ data: { purchase: { build_id: 'test-build', build_type: 'program', build_name: 'TEST', buyer_email: 'test@example.test', amount_cents: 0 } }, error: null });
    const view = render(<MemoryRouter initialEntries={['/success?session_id=cs_test_evidence']}><Success /></MemoryRouter>);
    await waitFor(() => expect(view.getByRole('button', { name: 'Access Your Purchase' })).toBeEnabled());
  });
});