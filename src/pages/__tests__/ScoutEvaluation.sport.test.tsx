import {beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const mock=vi.hoisted(()=>({insert:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'evaluator'},loading:false})}));
vi.mock('@/hooks/useScoutAccess',()=>({useScoutAccess:()=>({canSendActivities:true,isScout:true,isCoach:false,loading:false})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/components/DashboardLayout',()=>({DashboardLayout:({children}:{children:React.ReactNode})=><div>{children}</div>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const chain:Record<string,unknown>={};chain.select=()=>chain;chain.eq=()=>chain;
 chain.maybeSingle=async()=>({data:null});chain.insert=(row:unknown)=>{mock.insert(row);return chain;};
 chain.single=async()=>({data:{id:'evaluation'},error:null});
 chain.then=(resolve:(v:unknown)=>void)=>Promise.resolve({data:null,error:null}).then(resolve);return chain;
}}}));
import ScoutEvaluation from '../ScoutEvaluation';
describe('human evaluation explicit sport provenance',()=>{
 beforeEach(()=>vi.clearAllMocks());
 it('saves the evaluator-selected softball sport, not account baseball default',async()=>{
  render(<MemoryRouter initialEntries={['/scout-evaluation?mode=prospect']}><ScoutEvaluation /></MemoryRouter>);
  const inputs=screen.getAllByRole('textbox');
  console.log('input labels',inputs.map(e=>e.getAttribute('placeholder')));
  const sport=screen.getByRole('combobox',{name:'Sport'});
  fireEvent.pointerDown(sport,{button:0,ctrlKey:false});
  fireEvent.click(await screen.findByRole('option',{name:'Softball'}));
  fireEvent.change(screen.getByLabelText('Player name'),{target:{value:'TEST provenance fixture'}});
  fireEvent.click(screen.getByRole('button',{name:/Save evaluation/i}));
  await waitFor(()=>expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({sport:'softball',evaluator_id:'evaluator'})));
 },20000);
});