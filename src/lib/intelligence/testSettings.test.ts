import {describe,it,expect} from 'vitest';
import {testSettingsFor,PHILOSOPHY_TEST_USERS,settingsChanges,boundedSkillFloor} from './testSettings';
const row={elite_grade:65,test_overrides:{[PHILOSOPHY_TEST_USERS[0]]:{elite_grade:70,injury_history:[]}}};
describe('TEST philosophy isolation',()=>{
 it('floor preferences never lower a floor or exceed safety',()=>{expect(boundedSkillFloor(4,5,6)).toBe(5);expect(boundedSkillFloor(4,3,6)).toBe(4);expect(boundedSkillFloor(2,5,2)).toBe(2);});
 it('the exact TEST sees the standard, real players retain 65',()=>{expect(testSettingsFor(row,PHILOSOPHY_TEST_USERS[0]).elite_grade).toBe(70);expect(testSettingsFor(row,'real-player')).toBe(row);expect(testSettingsFor(row,PHILOSOPHY_TEST_USERS[1])).toEqual(row);});
 it('never overlays an injury gate',()=>{expect(testSettingsFor(row,PHILOSOPHY_TEST_USERS[0])).not.toHaveProperty('injury_history');});
 it('retains both exact standard and tag edits',()=>{const c=[{target:'mastery_identity_settings',id:'baseball',field:'elite_grade',before:65,after:70},{target:'library_videos',id:'video',field:'tags',before:['info:place:before_you_start'],after:['info:place:after_analysis']}];expect(settingsChanges(c)).toEqual(c);});
 it('refuses no-op and safety targets',()=>{expect(()=>settingsChanges([{target:'mastery_identity_settings',id:'baseball',field:'elite_grade',before:65,after:65}])).toThrow();expect(()=>settingsChanges([{target:'mastery_identity_settings',id:'baseball',field:'pain',before:true,after:false}])).toThrow();});
});