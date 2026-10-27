import { expect, it } from 'vitest';
import { applyLiveTracking } from '../../../supabase/functions/_shared/vault/tracking';
import { certifyCoachOwnItem } from '../../../supabase/functions/_shared/coach/ownItemCertification';
import { inlineLogSpec } from '@/components/hammer/logging/InlinePrescriptionLog';
import { resolveTemplateForRx } from '@/components/hammer/logging/logTemplates';
import type { WkRx } from '@/hooks/useWkDailyPrescriptions';
it('applies effective existing non-bunt tracking, not future or undone versions', () => {
  const catalog = [{slug:'test_band',dosage_unit:'reps',default_reps:12,visible_to:['test']}];
  const version = {slug:'test_band',version:1,effective_from:'2026-10-27',payload:{measure_type:'hold_seconds'}};
  expect(applyLiveTracking(catalog,[version], '2026-10-27')[0]).toMatchObject({dosage_unit:'reps',tracking_measure_type:'hold_seconds',default_reps:12,visible_to:['test']});
  expect(applyLiveTracking(catalog,[version], '2026-10-26')).toEqual(catalog);
  expect(applyLiveTracking(catalog,[{...version,undone_at:'2026-10-27'}], '2026-10-27')).toEqual(catalog);
});
it.each(['reps per arm','reps per leg','reps each side'])('accepts coach custom %s without inventing a dose', dosage_unit => {
  expect(certifyCoachOwnItem({name:'TEST own item',dosage_unit,reps:8,sets:2,gear:'none'}).certified).toBe(true);
  expect(certifyCoachOwnItem({name:'TEST own item',dosage_unit,reps:0,sets:2,gear:'none'}).certified).toBe(false);
  const rx={movement_slug:'',movement_name:'TEST own item',slot:'warmup',dosage_unit,sets:2,reps:8,why_payload:{}} as WkRx;
  expect(inlineLogSpec(rx).fields[0].label.toLowerCase()).toBe(dosage_unit);
  expect(resolveTemplateForRx(rx,new Set()).template.fields[0].key).toBe('side');
});
it('the live non-bunt measure reaches both card and log sheet without reinterpreting count as seconds',()=>{
  const rx={movement_slug:'test_band',movement_name:'TEST band',slot:'lift',dosage_unit:'reps',sets:2,reps:12,duration_seconds:null,why_payload:{tracking_measure_type:'hold_seconds'}} as WkRx;
  expect(inlineLogSpec(rx)).toMatchObject({rows:2,fields:[{key:'time',prefill:null}]});
  expect(resolveTemplateForRx(rx,new Set()).template.fields.map(f=>f.key)).toEqual(['time']);
});