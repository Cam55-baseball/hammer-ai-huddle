import { describe, expect, it } from 'vitest';
import { drillTaskPayload } from './drillTaskPayload';
describe('canonical drill completion lineage', () => {
  it('retains exact owner identity and role without claiming improvement', () => {
    const payload = drillTaskPayload({name:'Owner drill',dosage:'2 × 8',ownerDrillId:'owner-123',routineRole:'routine',skillArea:'hitting'},'softball','hitting','L');
    expect(payload).toMatchObject({ownerDrillId:'owner-123',routineRole:'routine',sport:'softball',module:'hitting',dosage:'2 × 8',side:'L'});
    expect(payload).not.toHaveProperty('effective');
  });
  it('preserves missing owner lineage instead of manufacturing it from a name', () => {
    expect(drillTaskPayload({name:'Owner drill'},'baseball','defense',null).ownerDrillId).toBeNull();
  });
  it('retains exact bunt evidence on bulk and individual payloads', () => {
    const bunt={attempts:8,side:'R'};
    expect(drillTaskPayload({name:'Bunt',dosage:'8 attempts',bunt},'baseball','hitting','R')).toMatchObject({bunt,module:'hitting',sport:'baseball'});
  });
});