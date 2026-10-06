import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DemoTourHost } from './DemoButton';
import { DemoDebugPanel } from './DemoDebugPanel';

const mocks = vi.hoisted(() => ({
  user: { id: 'diagnostic-test', created_at: '2025-10-27T00:15:27.279Z', user_metadata: {} },
  owner: false,
  admin: false,
  profile: vi.fn(),
  updateUser: vi.fn().mockResolvedValue({}),
  toast: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { message: mocks.toast } }));
vi.mock('@/hooks/useAuth', () => ({ useOptionalAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ modules: [], loading: false }) }));
vi.mock('@/hooks/useOwnerAccess', () => ({ useOwnerAccess: () => ({ isOwner: mocks.owner, loading: false }) }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ isAdmin: mocks.admin, loading: false }) }));
vi.mock('@/hooks/useScoutAccess', () => ({ useScoutAccess: () => ({ isCoach: false, isScout: false, loading: false }) }));
vi.mock('@/lib/tour/tours', () => ({ stepsFor: () => [] }));
vi.mock('@/components/tour/SpotlightTour', () => ({ SpotlightTour: ({ open }: { open: boolean }) => open ? <div>Tour content</div> : null }));
vi.mock('@/demo/useDemoTelemetry', () => ({ getDemoSessionId: () => 'test-session' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  auth: { updateUser: mocks.updateUser },
} }));

function mountHost() {
  return render(<MemoryRouter initialEntries={['/dashboard']}><DemoTourHost /></MemoryRouter>);
}

describe('console-only demo diagnostics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.owner = false;
    mocks.admin = false;
    mocks.user.created_at = '2025-10-27T00:15:27.279Z';
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it.each(['player', 'owner', 'admin'])('keeps old-account skips off screen for %s', (role) => {
    mocks.owner = role === 'owner';
    mocks.admin = role === 'admin';
    const { container } = mountHost();
    expect(console.debug).toHaveBeenCalledWith('[demo auto-start]', expect.stringContaining('skipped: account is older than 48 hours'));
    expect(container).toBeEmptyDOMElement();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(localStorage.getItem('hm.demoAutoStart')).toBeNull();
  });

  it('keeps failed checks off screen', () => {
    mocks.user.created_at = 'unreadable';
    const { container } = mountHost();
    expect(console.debug).toHaveBeenCalledWith('[demo auto-start]', 'skipped: account creation date unreadable');
    expect(container).toBeEmptyDOMElement();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('opens a new-account tour without a started toast', async () => {
    vi.useFakeTimers();
    mocks.user.created_at = new Date().toISOString();
    mocks.profile.mockResolvedValue({ data: { created_at: mocks.user.created_at } });
    const markers = document.createElement('div');
    markers.innerHTML = '<div data-tour="landing"></div><div data-tour="today-plan-heading"></div>';
    document.body.append(markers);
    const { container } = mountHost();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(console.debug).toHaveBeenCalledWith('[demo auto-start]', 'started');
    expect(container).toHaveTextContent('Tour content');
    expect(container).not.toHaveTextContent('started');
    expect(mocks.toast).not.toHaveBeenCalled();
    markers.remove();
  });

  it('keeps the enabled inspector off screen and logs its state', () => {
    localStorage.setItem('demo_debug', '1');
    const { container } = render(<DemoDebugPanel progress={{ demo_state: 'skipped', completion_pct: 0 }} />);
    expect(container).toBeEmptyDOMElement();
    expect(console.debug).toHaveBeenCalledWith('[demo inspector]', expect.objectContaining({ state: 'skipped' }));
  });
});