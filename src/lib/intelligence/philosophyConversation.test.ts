import { describe, expect, it } from 'vitest';
import { parsePhilosophyReply, philosophyChanges } from './philosophyConversation';
const proposal={body:'Balance before speed',sport:'baseball',area:'hitting',applies_when:'Offseason hitting',not_when:'Pain or unsafe equipment',connected_work:'',benefit:'Clearer teaching'};
describe('philosophy review limits',()=>{
  it('questions cannot become a ready proposal',()=>expect(()=>parsePhilosophyReply(JSON.stringify({reply:'Check scope',questions:['Which sport?'],proposal}))).toThrow());
  it('unsupported sport is not silently applied',()=>expect(()=>parsePhilosophyReply(JSON.stringify({reply:'Ready',questions:[],proposal:{...proposal,sport:'both'}}))).toThrow());
  it('without linked drills no prescription change is claimed',()=>{const r=parsePhilosophyReply(JSON.stringify({reply:'Ready',questions:[],proposal}));if(!r.proposal)throw Error('missing');expect(philosophyChanges(r.proposal)[1].change).toBe('No prescription change: no existing drills are linked.');});
  it('numeric standards are never changed by the philosophy editor',()=>{const r=parsePhilosophyReply(JSON.stringify({reply:'Ready',questions:[],proposal}));if(!r.proposal)throw Error('missing');expect(philosophyChanges(r.proposal)[3].change).toBe('No standard or cutoff changes. Those require a separate explicit settings edit.');});
});