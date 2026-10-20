import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), query: vi.fn(), user: { id: 'u' } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.query }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
import { usePlanFaultContext } from './usePlanFaultContext';
function result(data: unknown[] = [], error: unknown = null) {
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue({ data, error });
  return chain;
}
beforeEach(() => { vi.clearAllMocks(); mocks.query.mockImplementation(x => x); });
describe('real plan fault source read', () => {
  it('scopes every read to self and clips to selected sport and completed status', async () => {
    const chains = [result(), result(), result()];
    chains.forEach(c => mocks.from.mockReturnValueOnce(c));
    const query = usePlanFaultContext('softball') as unknown as { queryFn: () => Promise<unknown> };
    await expect(query.queryFn()).resolves.toEqual({ rankedFaults: [], signalScopes: {}, clips: [] });
    chains.forEach(c => expect(c.eq).toHaveBeenCalledWith('user_id', 'u'));
    expect(chains[2].eq).toHaveBeenCalledWith('sport', 'softball');
    expect(chains[2].eq).toHaveBeenCalledWith('status', 'completed');
  });
  it('source failure is a failed read, never an empty successful history', async () => {
    mocks.from.mockReturnValueOnce(result()).mockReturnValueOnce(result([], new Error('source unavailable'))).mockReturnValueOnce(result());
    const query = usePlanFaultContext('baseball') as unknown as { queryFn: () => Promise<unknown> };
    await expect(query.queryFn()).rejects.toThrow('source unavailable');
  });
  it('truncated history cannot authorize drill changes', async () => {
    mocks.from.mockReturnValueOnce(result()).mockReturnValueOnce(result(Array(501).fill({}))).mockReturnValueOnce(result());
    const query = usePlanFaultContext('baseball') as unknown as { queryFn: () => Promise<unknown> };
    await expect(query.queryFn()).rejects.toThrow('Complete analysis history is unavailable.');
  });
});