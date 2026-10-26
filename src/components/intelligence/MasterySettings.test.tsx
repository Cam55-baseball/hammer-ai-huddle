import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {MasterySettings} from './MasterySettings';
const state=vi.hoisted(()=>({saved:null as Record<string,unknown>|null,writes:0}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:state.saved,error:null})})}),upsert:async(row:Record<string,unknown>)=>{state.saved=row;state.writes++;return {error:null};}})}}));
afterEach(()=>{cleanup();state.saved=null;state.writes=0;});
describe('owner identity settings',()=>{
 it('saves exact 100/500/500 cadence and blank cutoffs as null',async()=>{render(<QueryClientProvider client={new QueryClient()}><MasterySettings/></QueryClientProvider>);await waitFor(()=>expect(screen.getByRole('button',{name:'Save identity settings'})).not.toBeDisabled());fireEvent.click(screen.getByRole('button',{name:'Save identity settings'}));await waitFor(()=>expect(state.writes).toBe(1));expect(state.saved).toMatchObject({initial_window:100,transition_at:500,later_window:500,elite_home_runs:null,lacking_power_home_runs:null,speed_minimum_samples:null});});
 it('rejects an incomplete early-window transition without a write',async()=>{render(<QueryClientProvider client={new QueryClient()}><MasterySettings/></QueryClientProvider>);await waitFor(()=>expect(screen.getByRole('button',{name:'Save identity settings'})).not.toBeDisabled());fireEvent.change(screen.getByLabelText('Switch window size after'),{target:{value:'499'}});fireEvent.click(screen.getByRole('button',{name:'Save identity settings'}));expect(state.writes).toBe(0);});
});