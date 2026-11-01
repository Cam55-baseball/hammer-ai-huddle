import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
const mocks=vi.hoisted(()=>({pain:vi.fn().mockResolvedValue({}),upsert:vi.fn().mockResolvedValue({error:null})}));
vi.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:vi.fn()})}));
vi.mock('@/lib/hammer/injury/recordPain',()=>({recordPain:mocks.pain}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const q:any={select:()=>q,eq:()=>q,order:()=>Promise.resolve({data:[],error:null}),maybeSingle:()=>Promise.resolve({data:null,error:null}),upsert:mocks.upsert};return q;}}}));
import { SprintRepFeedback } from './SprintRepFeedback';
it('pain saves an explicitly selected area through canonical recordPain and stops',async()=>{
 const stop=vi.fn();render(<SprintRepFeedback userId="test" prescriptionId="test-rx" planDate="2026-11-02" row={0} kind="max_sprint" repFeet={90} prescribedReps={10} seconds={4} extraUsed={0} onSaved={vi.fn()} onStop={stop} onAddMore={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Yes'}));
 expect(screen.getByRole('button',{name:'Save rep'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Calf'}));fireEvent.click(screen.getByRole('button',{name:'Save rep'}));
 await waitFor(()=>expect(mocks.pain).toHaveBeenCalledWith(expect.objectContaining({region:'calf',severity:'sore',origin:'conditioning_rep',date:'2026-11-02'})));
 expect(stop).toHaveBeenCalled();
});