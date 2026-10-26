import {describe,expect,it} from 'vitest';
import {pitchingCounts} from '../../../supabase/functions/_shared/wic/pitchingCounts';
import {judgePitching} from '../../../supabase/functions/_shared/wic/masteryPitchingStandards';
import {latestWindowGames} from '@/components/intelligence/PitchingJudgement';
const line=(o:Record<string,unknown>={})=>({batters_faced:25,pitch_count:90,pitches:[],pitcher_outs:18,pitcher_innings:6,pitcher_strikeouts:9,pitcher_walks:1,pitcher_hits:3,pitcher_home_runs:0,pitcher_at_bats_against:24,pitcher_runs:1,pitcher_earned_runs:0,pitcher_first_pitch_strikes:18,pitcher_two_ball_batters:6,pitcher_soft_contact:5,pitcher_medium_contact:6,pitcher_hard_contact:3,pitcher_scoring_pos_innings:1,pitcher_sb_allowed:0,pitcher_steal_attempts:1,pitcher_pickoffs:0,pitcher_pickoff_attempts:1,pitcher_time_to_plate_sec:[1.25,1.28],pitcher_pfp_chances:3,pitcher_pfp_errors:0,...o});
describe('pitching line entry → judgment',()=>{
 it('game-line totals feed counts when no pitch-by-pitch log',()=>{
  const c=pitchingCounts([line(),line()]);
  expect(c.battersFaced).toBe(50);expect(c.strikeouts).toBe(18);expect(c.firstPitchStrikes).toBe(36);expect(c.ballsInPlay).toBe(28);expect(c.softContact).toBe(10);
 });
 it('a game missing a field makes that stat Need more data, never zero',()=>{
  const j=judgePitching(pitchingCounts([line(),line({pitcher_first_pitch_strikes:null})]),'baseball','high_school');
  expect(j.parts.find(p=>p.key==='first_pitch_strike_pct')!.status).toBe('Need more data');
 });
 it('baseball and softball judged with separate standards',()=>{
  const c=pitchingCounts([line(),line(),line(),line()]);
  const b=judgePitching(c,'baseball','high_school');const s=judgePitching(c,'softball','college');
  expect(b.parts.some(p=>p.key==='time_to_plate_s')).toBe(true);expect(s.parts.some(p=>p.key==='time_to_plate_s')).toBe(false);
  expect(s.parts.some(p=>p.key==='k_per_7')).toBe(true);
 });
 it('window uses most recent whole games covering the BF size',()=>{
  const w=latestWindowGames([line(),line(),line(),line(),line()] as never,100);
  expect(w.complete).toBe(true);expect(w.games.length).toBe(4);expect(latestWindowGames([line()] as never,100).complete).toBe(false);
 });
});
