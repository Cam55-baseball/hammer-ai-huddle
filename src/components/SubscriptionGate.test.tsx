import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ owner: false, admin: false, subscriptionLoading: true }));
vi.mock('@/hooks/useOwnerAccess', () => ({ useOwnerAccess: () => ({ isOwner: state.owner, loading: false }) }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ isAdmin: state.admin, loading: false }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ modules: [], loading: state.subscriptionLoading, initialized: !state.subscriptionLoading }) }));
vi.mock('./UpgradePrompt', () => ({ UpgradePrompt: () => <div data-testid="locked" /> }));
import { SubscriptionGate } from './SubscriptionGate';
describe('video library staff access', () => {
  it('owner access does not wait on or require a subscription', () => { state.owner = true; state.admin = false; state.subscriptionLoading = true; render(<SubscriptionGate requiredAccess="any" featureName="Video Library"><div data-testid="allowed" /></SubscriptionGate>); expect(screen.getByTestId('allowed')).toBeTruthy(); });
  it('admin access does not wait on or require a subscription', () => { state.owner = false; state.admin = true; state.subscriptionLoading = true; render(<SubscriptionGate requiredAccess="any" featureName="Video Library"><div data-testid="allowed" /></SubscriptionGate>); expect(screen.getByTestId('allowed')).toBeTruthy(); });
  it('a player without access still requires a subscription', () => { state.owner = false; state.admin = false; state.subscriptionLoading = false; render(<SubscriptionGate requiredAccess="any" featureName="Video Library"><div data-testid="allowed" /></SubscriptionGate>); expect(screen.queryByTestId('allowed')).toBeNull(); expect(screen.getByTestId('locked')).toBeTruthy(); });
});