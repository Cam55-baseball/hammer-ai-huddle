import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhilosophyConversation } from './PhilosophyConversation';
const s=vi.hoisted(()=>({saves:0,messages:[] as unknown[],fail:false}));
const proposal={body:'TEST balance teaching',sport:'baseball',area:'hitting',applies_when:'Offseason',not_when:'Pain',connected_work:'',benefit:'Clearer teaching'};
vi.mock('@/lib/hammer/oneConversation',()=>({latestThreadId:async()=> 'thread'}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})},
 functions:{invoke:async()=>({data:{reply:JSON.stringify({reply:'Review ready',questions:[],proposal})},error:null})},
 rpc:async()=>{s.saves++;return s.fail?{error:Error('Save refused'),data:null}:{data:'principle',error:null};},
 from:(table:string)=>{const q:any={select:()=>q,eq:()=>q,filter:()=>q,order:()=>q,single:async()=>({data:{body:proposal.body,version:1},error:null}),insert:async(rows:unknown)=>{s.messages.push(rows);return {error:null};},then:(f:(x:unknown)=>unknown)=>Promise.resolve({data:[],error:null}).then(f)};return q;},
}}));
describe('philosophy explicit confirmation',()=>{
 beforeEach(()=>{s.saves=0;s.messages=[];s.fail=false;});afterEach(cleanup);
 it('conversation and preview make no principle write until Confirm, then verify the version',async()=>{
  render(<PhilosophyConversation onSaved={vi.fn()}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Send to Hammers'}).hasAttribute('disabled')).toBe(true));
  fireEvent.change(screen.getByLabelText('Your philosophy point or answer'),{target:{value:'My point'}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Send to Hammers'}).hasAttribute('disabled')).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Send to Hammers'}));
  await screen.findByRole('button',{name:'Confirm'});expect(s.saves).toBe(0);expect(s.messages).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await screen.findByText('Principle saved. Its current version is in Your principles.');expect(s.saves).toBe(1);expect(s.messages).toHaveLength(2);
 });
 it('failed confirmation adds no saved receipt and keeps the proposal',async()=>{
  s.fail=true;render(<PhilosophyConversation onSaved={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Your philosophy point or answer'),{target:{value:'My point'}});await waitFor(()=>expect(screen.getByRole('button',{name:'Send to Hammers'}).hasAttribute('disabled')).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Send to Hammers'}));await screen.findByRole('button',{name:'Confirm'});fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await screen.findByText('Save refused');expect(s.messages).toHaveLength(1);expect(screen.queryByText('Principle saved. Its current version is in Your principles.')).toBeNull();
 });
});