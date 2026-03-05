import { useMemo } from 'react';

interface Play {
  batter_name?: string;
  pitcher_name?: string;
  pitch_result: string;
  at_bat_outcome?: string;
  pitch_velocity_mph?: number;
  pitch_location?: { row: number; col: number };
  exit_velocity_mph?: number;
  launch_angle?: number;
  spray_direction?: string;
  contact_quality?: string;
  batted_ball_type?: string;
  rbi?: number;
  inning: number;
  half: string;
  pitch_type?: string;
  pitch_number?: number;
}

export interface BatterStats {
  name: string;
  pa: number;
  ab: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  hbp: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  kPct: number;
  bbPct: number;
  sprayData: { direction: string; type: string }[];
  pitchLocationHits: { row: number; col: number }[];
}

export interface PitcherStats {
  name: string;
  pitchCount: number;
  strikes: number;
  balls: number;
  velocityAvg: number;
  velocityPeak: number;
  firstPitchStrikePct: number;
  kPct: number;
  bbPct: number;
  zonePct: number;
  swingMissPct: number;
  pitchTypeCounts: Record<string, number>;
  velocityTrend: number[];
}

function isHit(outcome?: string): boolean {
  return ['single', 'double', 'triple', 'home_run'].includes(outcome ?? '');
}

function isAtBat(outcome?: string): boolean {
  if (!outcome) return false;
  return !['walk', 'hbp', 'sac_fly', 'sac_bunt', 'catcher_interference'].includes(outcome);
}

function isPA(outcome?: string): boolean {
  return !!outcome;
}

function totalBases(outcome?: string): number {
  switch (outcome) {
    case 'single': return 1;
    case 'double': return 2;
    case 'triple': return 3;
    case 'home_run': return 4;
    default: return 0;
  }
}

export function useGameAnalytics(plays: Play[]) {
  const batterStats = useMemo(() => {
    const map = new Map<string, BatterStats>();
    // Group plays by at-bat (only those with at_bat_outcome)
    const finalPitches = plays.filter(p => p.at_bat_outcome && p.batter_name);

    for (const p of finalPitches) {
      const name = p.batter_name!;
      if (!map.has(name)) {
        map.set(name, {
          name, pa: 0, ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0, hr: 0,
          rbi: 0, walks: 0, strikeouts: 0, hbp: 0, avg: 0, obp: 0, slg: 0, ops: 0,
          kPct: 0, bbPct: 0, sprayData: [], pitchLocationHits: [],
        });
      }
      const s = map.get(name)!;
      if (isPA(p.at_bat_outcome)) s.pa++;
      if (isAtBat(p.at_bat_outcome)) s.ab++;
      if (isHit(p.at_bat_outcome)) {
        s.hits++;
        if (p.at_bat_outcome === 'single') s.singles++;
        if (p.at_bat_outcome === 'double') s.doubles++;
        if (p.at_bat_outcome === 'triple') s.triples++;
        if (p.at_bat_outcome === 'home_run') s.hr++;
        if (p.pitch_location) s.pitchLocationHits.push(p.pitch_location);
      }
      if (p.at_bat_outcome === 'walk') s.walks++;
      if (p.at_bat_outcome === 'strikeout' || p.at_bat_outcome === 'strikeout_looking') s.strikeouts++;
      if (p.at_bat_outcome === 'hbp') s.hbp++;
      s.rbi += p.rbi ?? 0;
      if (p.spray_direction && p.batted_ball_type) {
        s.sprayData.push({ direction: p.spray_direction, type: p.batted_ball_type });
      }
    }

    // Calculate rates
    for (const s of map.values()) {
      s.avg = s.ab > 0 ? s.hits / s.ab : 0;
      const tb = s.singles + s.doubles * 2 + s.triples * 3 + s.hr * 4;
      s.slg = s.ab > 0 ? tb / s.ab : 0;
      s.obp = s.pa > 0 ? (s.hits + s.walks + s.hbp) / s.pa : 0;
      s.ops = s.obp + s.slg;
      s.kPct = s.pa > 0 ? (s.strikeouts / s.pa) * 100 : 0;
      s.bbPct = s.pa > 0 ? (s.walks / s.pa) * 100 : 0;
    }

    return Array.from(map.values());
  }, [plays]);

  const pitcherStats = useMemo(() => {
    const map = new Map<string, PitcherStats>();
    const pitcherPlays = plays.filter(p => p.pitcher_name);

    for (const p of pitcherPlays) {
      const name = p.pitcher_name!;
      if (!map.has(name)) {
        map.set(name, {
          name, pitchCount: 0, strikes: 0, balls: 0, velocityAvg: 0, velocityPeak: 0,
          firstPitchStrikePct: 0, kPct: 0, bbPct: 0, zonePct: 0, swingMissPct: 0,
          pitchTypeCounts: {}, velocityTrend: [],
        });
      }
      const s = map.get(name)!;
      s.pitchCount++;
      const isStrike = ['called_strike', 'swinging_strike', 'foul', 'in_play_out', 'in_play_hit'].includes(p.pitch_result);
      if (isStrike) s.strikes++;
      else s.balls++;
      if (p.pitch_velocity_mph) {
        s.velocityTrend.push(p.pitch_velocity_mph);
        if (p.pitch_velocity_mph > s.velocityPeak) s.velocityPeak = p.pitch_velocity_mph;
      }
      if (p.pitch_type) {
        s.pitchTypeCounts[p.pitch_type] = (s.pitchTypeCounts[p.pitch_type] || 0) + 1;
      }
      // Zone tracking (inner 3x3 of 5x5)
      if (p.pitch_location) {
        const { row, col } = p.pitch_location;
        if (row >= 1 && row <= 3 && col >= 1 && col <= 3) s.zonePct++;
      }
    }

    // Calculate rates
    for (const s of map.values()) {
      if (s.velocityTrend.length > 0) {
        s.velocityAvg = s.velocityTrend.reduce((a, b) => a + b, 0) / s.velocityTrend.length;
      }
      s.zonePct = s.pitchCount > 0 ? (s.zonePct / s.pitchCount) * 100 : 0;
      const swingMisses = pitcherPlays.filter(p => p.pitcher_name === s.name && p.pitch_result === 'swinging_strike').length;
      const swings = pitcherPlays.filter(p => p.pitcher_name === s.name && ['swinging_strike', 'foul', 'in_play_out', 'in_play_hit'].includes(p.pitch_result)).length;
      s.swingMissPct = swings > 0 ? (swingMisses / swings) * 100 : 0;

      // First pitch strike %
      const firstPitches = pitcherPlays.filter(p => p.pitcher_name === s.name && p.pitch_number === 1);
      const firstPitchStrikes = firstPitches.filter(p => ['called_strike', 'swinging_strike', 'foul', 'in_play_out', 'in_play_hit'].includes(p.pitch_result));
      s.firstPitchStrikePct = firstPitches.length > 0 ? (firstPitchStrikes.length / firstPitches.length) * 100 : 0;

      // K% and BB% from outcomes
      const outcomes = pitcherPlays.filter(p => p.pitcher_name === s.name && p.at_bat_outcome);
      const ks = outcomes.filter(p => p.at_bat_outcome === 'strikeout' || p.at_bat_outcome === 'strikeout_looking').length;
      const bbs = outcomes.filter(p => p.at_bat_outcome === 'walk').length;
      s.kPct = outcomes.length > 0 ? (ks / outcomes.length) * 100 : 0;
      s.bbPct = outcomes.length > 0 ? (bbs / outcomes.length) * 100 : 0;
    }

    return Array.from(map.values());
  }, [plays]);

  const teamScore = useMemo(() => {
    const myRuns = plays.filter(p => p.half === 'bottom' && p.rbi).reduce((sum, p) => sum + (p.rbi ?? 0), 0);
    const oppRuns = plays.filter(p => p.half === 'top' && p.rbi).reduce((sum, p) => sum + (p.rbi ?? 0), 0);
    return { myRuns, oppRuns };
  }, [plays]);

  const heatMapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const p of plays) {
      if (p.pitch_location) {
        grid[p.pitch_location.row][p.pitch_location.col]++;
      }
    }
    return grid;
  }, [plays]);

  const contactHeatMap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const p of plays) {
      if (p.pitch_location && ['in_play_out', 'in_play_hit'].includes(p.pitch_result)) {
        grid[p.pitch_location.row][p.pitch_location.col]++;
      }
    }
    return grid;
  }, [plays]);

  return { batterStats, pitcherStats, teamScore, heatMapData, contactHeatMap };
}
