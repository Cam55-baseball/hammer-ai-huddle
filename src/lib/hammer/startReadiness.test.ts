import { describe, expect, it } from 'vitest';
import { startMissing, REQUIRED_PLAN_QUESTIONS } from '../../../supabase/functions/_shared/startReadiness';
const full = {date_of_birth:'2000-04-01',sport_primary:'baseball',position_primary:'SS',competition_level:'high_school',category_goals:{hitting:['contact']},season_status:'off_season',bats_hand:'R',throws_hand:'R',current_pain_answered:true,current_pain:false,starting_point_answered:true};
describe('owner required plan details',()=>{
 it('has exactly ten groups including conditional pitcher role',()=>expect(REQUIRED_PLAN_QUESTIONS.map(q=>q.key)).toEqual(['birthday','sport','position','bats_throws','level','season','goals','health','starting_point','pitching_role']));
 it('all optional values can be absent with a complete required set',()=>expect(startMissing(full)).toEqual([]));
 it.each([['birthday',{date_of_birth:null}],['sport',{sport_primary:null}],['position',{position_primary:''}],['bats_throws',{throws_hand:null}],['level',{competition_level:null}],['season',{season_status:null}],['goals',{category_goals:null}],['health',{current_pain_answered:false}],['starting_point',{starting_point_answered:false}]] as const)('requires %s',(key,patch)=>expect(startMissing({...full,...patch}).map(q=>q.key)).toEqual([key]));
 it('requires an area for Yes pain',()=>expect(startMissing({...full,current_pain:true}).map(q=>q.key)).toEqual(['health']));
 it('accepts No without requiring health setup or nutrition',()=>expect(startMissing({...full,health_setup_completed:false,nutrition:null})).toEqual([]));
 it('pitchers must save their role',()=>expect(startMissing({...full,is_pitcher:true}).map(q=>q.key)).toEqual(['pitching_role']));
 it.each(['starter','bullpen','closer'])('accepts pitcher %s',pitching_role=>expect(startMissing({...full,is_pitcher:true,pitching_role})).toEqual([]));
});
