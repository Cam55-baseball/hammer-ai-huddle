import {render,screen} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {describe,it,expect,vi} from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'coach'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
import {CoachPlayerWeek} from './CoachPlayerWeek';
describe('week sharing permission',()=>{
 it('stops at a denied training read and never requests workout lineage',async()=>{
  rpc.mockResolvedValueOnce({data:{state:'denied'},error:null});
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><CoachPlayerWeek athleteId="unshared"/></QueryClientProvider>);
  await screen.findByRole('alert');
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls[0][0]).toBe('coach_athlete_week');
 });
});