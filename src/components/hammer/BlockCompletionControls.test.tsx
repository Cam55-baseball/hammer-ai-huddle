import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({bulk:vi.fn(),record:vi.fn(),changed:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'player'}})}));
vi.mock('@/contexts/SportThemeContext',()=>({useSportTheme:()=>({sport:'softball'})}));
vi.mock('@/hooks/useHammerDailyTasks',()=>({useHammerDailyTasks:()=>({bulkSet:mocks.bulk}),makeBlockTaskId:(m:string,s:string)=>`${m}:${s}`}));
vi.mock('@/lib/hammer/prescription/dailyEngagement',()=>({loadEngagement:()=>({}),todayCompletion:()=>null,recordCompletion:mocks.record}));
import {BlockCompletionControls} from './BlockCompletionControls';
afterEach(()=>{cleanup();vi.resetAllMocks();});
const open=()=>render(<BlockCompletionControls modality="hitting" modalityLabel="Hitting" onChanged={mocks.changed} planDate="2026-10-27" drills={[{name:'Routine',dosage:'2 × 8',ownerDrillId:'o1',routineRole:'routine',skillArea:'hitting'}]}/>);
describe('block credit follows canonical save',()=>{
  it('waits for saved rows and keeps exact owner/sport lineage',async()=>{
    let finish: (()=>void)|undefined;mocks.bulk.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}));open();
    fireEvent.click(screen.getByRole('button',{name:'Mark done'}));expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.bulk.mock.calls[0][0][0].payload).toMatchObject({ownerDrillId:'o1',routineRole:'routine',sport:'softball',module:'hitting',dosage:'2 × 8'});
    await act(async()=>finish?.());expect(mocks.record).toHaveBeenCalledWith('player','hitting','done',null);
  });
  it('failed writes never grant local completion or learning credit',async()=>{
    mocks.bulk.mockRejectedValue(new Error('save failed'));open();await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Mark done'})));
    expect(mocks.record).not.toHaveBeenCalled();expect(mocks.changed).not.toHaveBeenCalled();
  });
});