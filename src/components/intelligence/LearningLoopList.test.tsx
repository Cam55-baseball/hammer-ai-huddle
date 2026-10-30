import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ select: vi.fn(), update: vi.fn(), invoke: vi.fn().mockResolvedValue({ error: new Error('not rechecked') }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-player' } }) }));
vi.mock('@/hooks/useOwnerAccess', () => ({ useOwnerAccess: () => ({ isOwner: false }) }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ isAdmin: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  from: () => ({ select: mocks.select, update: mocks.update }),
} }));
import { LearningLoopList } from './LearningLoopList';
afterEach(cleanup);
it('players read saved outcome labels without requesting stored analysis scores', async () => {
  mocks.select.mockReturnValue({ eq: () => ({ order: () => ({ limit: async () => ({ data: [
    { id: 'advice', area: 'hitting', do_this: 'Partner flips', followed: true, outcome: 'worked' },
  ], error: null }) }) }) });
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LearningLoopList /></QueryClientProvider></MemoryRouter>);
  await screen.findByText(/Did it: Yes/);
  expect(mocks.select).toHaveBeenCalledWith('id, area, do_this, drill, source_video_id, followed, outcome, created_at, followed_at, checked_at');
  expect(screen.getByText(/Did it: Yes/).textContent).not.toContain('Need more data');
  expect(await screen.findByRole('status')).toHaveTextContent("couldn't re-check");
});
it('never waits for rechecking before showing saved outcome labels', async () => {
  mocks.invoke.mockReturnValueOnce(new Promise(() => {}));
  mocks.select.mockReturnValue({ eq: () => ({ order: () => ({ limit: async () => ({ data: [
    { id: 'advice', area: 'hitting', do_this: 'Partner flips', followed: true, outcome: 'worked' },
  ], error: null }) }) }) });
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LearningLoopList /></QueryClientProvider></MemoryRouter>);
  expect(await screen.findByText(/Did it: Yes/)).toBeInTheDocument();
});
it('shows a recheck failure even when no saved advice exists', async () => {
  mocks.invoke.mockRejectedValueOnce(new Error('unavailable'));
  mocks.select.mockReturnValue({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) });
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LearningLoopList /></QueryClientProvider></MemoryRouter>);
  expect(await screen.findByRole('status')).toHaveTextContent("couldn't re-check");
});