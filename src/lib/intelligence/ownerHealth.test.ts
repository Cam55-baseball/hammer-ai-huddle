import { describe, expect, it } from 'vitest';
import { ownerHealth } from './ownerHealth';
describe('owner health evidence', () => {
  it('is green only with passed checks and no warnings', () => expect(ownerHealth([{name:'Safety',passed:true}],0,0,false).status).toBe('green'));
  it('missing evidence is yellow, not a failed or passing check', () => expect(ownerHealth([{name:'Safety',passed:null}],0,0,false).status).toBe('yellow'));
  it('failed safety checks are red', () => expect(ownerHealth([{name:'Safety',passed:false}],0,0,false).status).toBe('red'));
  it('critical recorded notes are red', () => expect(ownerHealth([],1,0,false).status).toBe('red'));
  it('failed reads cannot report all clear', () => expect(ownerHealth([],0,0,true).status).toBe('yellow'));
});