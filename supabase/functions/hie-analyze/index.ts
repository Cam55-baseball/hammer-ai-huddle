import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveSeasonPhase, getSeasonProfile, type SeasonPhase } from "../_shared/seasonPhase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface WeaknessCluster {
  area: string;
  issue: string;
  why: string;
  impact: "high" | "medium" | "low";
  data_points: Record<string, any>;
}

interface PrescriptiveDrill {
  name: string;
  description: string;
  module: string;
  constraints: string;
  drill_type?: string;
  drill_id?: string;
}

interface PrescriptiveAction {
  weakness_area: string;
  drills: PrescriptiveDrill[];
}

interface RiskAlert {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

interface MicroPattern {
  category: string;
  metric: string;
  value: number;
  threshold: number;
  severity: "high" | "medium" | "low";
  description: string;
  zone_details?: string;
  data_points?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// MICRO-DATA ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════

function analyzeHittingMicro(microReps: any[], drillBlocks: any[], batterSide: string = 'R'): MicroPattern[] {
  const patterns: MicroPattern[] = [];
  const hittingReps = microReps.filter((r: any) =>
    r.contact_quality || r.swing_result || r.batted_ball_type || r.swing_decision
  );
  if (hittingReps.length < 5) return patterns;

  // 1. Chase rate by zone
  const outOfZone = hittingReps.filter((r: any) => r.in_zone === false);
  const chases = outOfZone.filter((r: any) =>
    r.swing_result && r.swing_result !== 'take' && r.swing_decision !== 'correct'
  );
  const chaseRate = outOfZone.length > 0 ? (chases.length / outOfZone.length) * 100 : 0;
  if (chaseRate > 30) {
    const zoneChases: Record<string, number> = {};
    chases.forEach((r: any) => {
      if (r.pitch_location) {
        const key = `${r.pitch_location.row},${r.pitch_location.col}`;
        zoneChases[key] = (zoneChases[key] || 0) + 1;
      }
    });
    const worstZone = Object.entries(zoneChases).sort(([, a], [, b]) => b - a)[0];
    patterns.push({
      category: "hitting", metric: "chase_rate", value: Math.round(chaseRate),
      threshold: 30, severity: chaseRate > 45 ? "high" : "medium",
      description: `${Math.round(chaseRate)}% chase rate on pitches outside the zone`,
      zone_details: worstZone ? `Worst zone: (${worstZone[0]}) — ${worstZone[1]} chases` : undefined,
    });
  }

  // 2. Whiff rate by zone
  const swings = hittingReps.filter((r: any) => r.swing_result && r.swing_result !== 'take');
  const whiffs = swings.filter((r: any) =>
    r.contact_quality === 'miss' || r.contact_quality === 'whiff' || r.swing_result === 'miss' || r.contact_type === 'swing_miss'
  );
  const whiffRate = swings.length > 0 ? (whiffs.length / swings.length) * 100 : 0;
  if (whiffRate > 25) {
    const zoneWhiffs: Record<string, number> = {};
    whiffs.forEach((r: any) => {
      if (r.pitch_location) {
        const key = `${r.pitch_location.row},${r.pitch_location.col}`;
        zoneWhiffs[key] = (zoneWhiffs[key] || 0) + 1;
      }
    });
    const worstZone = Object.entries(zoneWhiffs).sort(([, a], [, b]) => b - a)[0];
    patterns.push({
      category: "hitting", metric: "whiff_rate", value: Math.round(whiffRate),
      threshold: 25, severity: whiffRate > 40 ? "high" : "medium",
      description: `${Math.round(whiffRate)}% whiff rate — missing too many swings`,
      zone_details: worstZone ? `Most whiffs at zone (${worstZone[0]})` : undefined,
    });
  }

  // 3. Contact quality by velocity band
  const veloReps = hittingReps.filter((r: any) => r.machine_velocity_band);
  if (veloReps.length >= 5) {
    const veloBands: Record<string, { total: number; weak: number }> = {};
    veloReps.forEach((r: any) => {
      const band = r.machine_velocity_band;
      if (!veloBands[band]) veloBands[band] = { total: 0, weak: 0 };
      veloBands[band].total++;
      if (['weak_contact', 'miss', 'foul'].includes(r.contact_quality || r.contact_type || '')) {
        veloBands[band].weak++;
      }
    });
    Object.entries(veloBands).forEach(([band, data]) => {
      if (data.total >= 3) {
        const weakPct = (data.weak / data.total) * 100;
        if (weakPct > 60) {
          patterns.push({
            category: "hitting", metric: "velocity_weakness", value: Math.round(weakPct),
            threshold: 60, severity: weakPct > 75 ? "high" : "medium",
            description: `${Math.round(weakPct)}% weak contact vs ${band} mph velocity`,
            data_points: { velocity_band: band },
          });
        }
      }
    });
  }

  // 4. Contact quality by location (inside vs outside)
  const locReps = hittingReps.filter((r: any) => r.pitch_location && r.contact_quality);
  if (locReps.length >= 10) {
    const locationBuckets: Record<string, { total: number; weak: number }> = {
      inside: { total: 0, weak: 0 }, outside: { total: 0, weak: 0 },
      up: { total: 0, weak: 0 }, down: { total: 0, weak: 0 },
    };
    locReps.forEach((r: any) => {
      const loc = r.pitch_location;
      const gridSize = loc.row <= 2 && loc.col <= 2 ? 3 : 5;
      const midCol = Math.floor(gridSize / 2);
      const midRow = Math.floor(gridSize / 2);
      const isLefty = batterSide === 'L';
      const bucket = loc.col < midCol
        ? (isLefty ? 'outside' : 'inside')
        : loc.col > midCol
          ? (isLefty ? 'inside' : 'outside')
          : null;
      const vBucket = loc.row < midRow ? 'up' : loc.row > midRow ? 'down' : null;
      const isWeak = ['weak_contact', 'miss', 'foul'].includes(r.contact_quality || '');
      if (bucket) {
        locationBuckets[bucket].total++;
        if (isWeak) locationBuckets[bucket].weak++;
      }
      if (vBucket) {
        locationBuckets[vBucket].total++;
        if (isWeak) locationBuckets[vBucket].weak++;
      }
    });
    Object.entries(locationBuckets).forEach(([loc, data]) => {
      if (data.total >= 5) {
        const weakPct = (data.weak / data.total) * 100;
        if (weakPct > 55) {
          patterns.push({
            category: "hitting", metric: `${loc}_weakness`, value: Math.round(weakPct),
            threshold: 55, severity: weakPct > 70 ? "high" : "medium",
            description: `${Math.round(weakPct)}% weak contact on ${loc} pitches`,
          });
        }
      }
    });
  }

  // 5. Swing decision accuracy by pitch type
  const pitchTypeReps = hittingReps.filter((r: any) => r.pitch_type && r.swing_decision);
  if (pitchTypeReps.length >= 10) {
    const pitchDecisions: Record<string, { total: number; incorrect: number }> = {};
    pitchTypeReps.forEach((r: any) => {
      if (!pitchDecisions[r.pitch_type]) pitchDecisions[r.pitch_type] = { total: 0, incorrect: 0 };
      pitchDecisions[r.pitch_type].total++;
      if (r.swing_decision === 'incorrect') pitchDecisions[r.pitch_type].incorrect++;
    });
    Object.entries(pitchDecisions).forEach(([type, data]) => {
      if (data.total >= 5) {
        const errRate = (data.incorrect / data.total) * 100;
        if (errRate > 40) {
          patterns.push({
            category: "hitting", metric: "pitch_type_decision", value: Math.round(errRate),
            threshold: 40, severity: errRate > 55 ? "high" : "medium",
            description: `${Math.round(errRate)}% incorrect decisions vs ${type}`,
            data_points: { pitch_type: type },
          });
        }
      }
    });
  }

  // 6. Drill-block level chase/whiff from aggregated data
  const blockChase = drillBlocks.filter((b: any) => b.chase_pct != null);
  if (blockChase.length > 0) {
    const avg = blockChase.reduce((s: number, b: any) => s + b.chase_pct, 0) / blockChase.length;
    if (avg > 30 && !patterns.some(p => p.metric === 'chase_rate')) {
      patterns.push({
        category: "hitting", metric: "block_chase_rate", value: Math.round(avg),
        threshold: 30, severity: avg > 40 ? "high" : "medium",
        description: `${Math.round(avg)}% average chase rate across drill blocks`,
      });
    }
  }

  return patterns;
}

function analyzeFieldingMicro(microReps: any[], drillBlocks: any[]): MicroPattern[] {
  const patterns: MicroPattern[] = [];
  const fieldingReps = microReps.filter((r: any) =>
    r.footwork_grade || r.throw_accuracy || r.exchange_time_band || r.route_efficiency
  );

  const cleanFieldPcts = drillBlocks.filter((b: any) => b.clean_field_pct != null);
  if (cleanFieldPcts.length > 0) {
    const avg = cleanFieldPcts.reduce((s: number, b: any) => s + b.clean_field_pct, 0) / cleanFieldPcts.length;
    if (avg < 75) {
      patterns.push({
        category: "fielding", metric: "clean_field_pct", value: Math.round(avg),
        threshold: 75, severity: avg < 60 ? "high" : "medium",
        description: `${Math.round(avg)}% clean field rate — below target`,
      });
    }
  }

  const exchangeReps = fieldingReps.filter((r: any) => r.exchange_time_band);
  if (exchangeReps.length >= 3) {
    const slowCount = exchangeReps.filter((r: any) => r.exchange_time_band === 'slow').length;
    const slowPct = (slowCount / exchangeReps.length) * 100;
    if (slowPct > 30) {
      patterns.push({
        category: "fielding", metric: "slow_exchange", value: Math.round(slowPct),
        threshold: 30, severity: slowPct > 50 ? "high" : "medium",
        description: `${Math.round(slowPct)}% of exchanges graded slow`,
      });
    }
  }

  const fwGrades = fieldingReps.filter((r: any) => r.footwork_grade != null).map((r: any) => r.footwork_grade);
  if (fwGrades.length >= 3) {
    const avg = fwGrades.reduce((a: number, b: number) => a + b, 0) / fwGrades.length;
    if (avg < 50) {
      patterns.push({
        category: "fielding", metric: "footwork_grade", value: Math.round(avg),
        threshold: 50, severity: avg < 35 ? "high" : "medium",
        description: `Average footwork grade ${Math.round(avg)}/80 — needs improvement`,
      });
    }
  }

  const throwAccs = fieldingReps.filter((r: any) => r.throw_accuracy != null).map((r: any) => r.throw_accuracy);
  if (throwAccs.length >= 3) {
    const avg = throwAccs.reduce((a: number, b: number) => a + b, 0) / throwAccs.length;
    if (avg < 55) {
      patterns.push({
        category: "fielding", metric: "throw_accuracy", value: Math.round(avg),
        threshold: 55, severity: avg < 40 ? "high" : "medium",
        description: `Average throw accuracy ${Math.round(avg)}/80 — inconsistent`,
      });
    }
  }

  return patterns;
}

function analyzePitchingMicro(microReps: any[], drillBlocks: any[]): MicroPattern[] {
  const patterns: MicroPattern[] = [];
  const pitchingReps = microReps.filter((r: any) =>
    r.pitch_command_grade || r.pitch_result || r.pitch_type
  );
  if (pitchingReps.length < 5) return patterns;

  const zonePcts = drillBlocks.filter((b: any) => b.zone_pct != null);
  if (zonePcts.length > 0) {
    const avg = zonePcts.reduce((s: number, b: any) => s + b.zone_pct, 0) / zonePcts.length;
    if (avg < 55) {
      patterns.push({
        category: "pitching", metric: "zone_pct", value: Math.round(avg),
        threshold: 55, severity: avg < 40 ? "high" : "medium",
        description: `${Math.round(avg)}% zone rate — command needs work`,
      });
    }
  }

  const cmdByType: Record<string, number[]> = {};
  pitchingReps.forEach((r: any) => {
    if (r.pitch_type && r.pitch_command_grade) {
      if (!cmdByType[r.pitch_type]) cmdByType[r.pitch_type] = [];
      cmdByType[r.pitch_type].push(r.pitch_command_grade);
    }
  });
  Object.entries(cmdByType).forEach(([type, grades]) => {
    if (grades.length >= 3) {
      const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
      if (avg < 45) {
        patterns.push({
          category: "pitching", metric: `${type}_command`, value: Math.round(avg),
          threshold: 45, severity: avg < 30 ? "high" : "medium",
          description: `${type} command grade ${Math.round(avg)}/80 — poor control`,
        });
      }
    }
  });

  const misses = pitchingReps.filter((r: any) => r.pitch_result === 'ball' && r.pitch_location);
  if (misses.length >= 5) {
    const dirs: Record<string, number> = { up: 0, down: 0, inside: 0, outside: 0 };
    misses.forEach((r: any) => {
      const loc = r.pitch_location;
      const gs = loc.row <= 2 ? 3 : 5;
      if (loc.row === 0) dirs.up++;
      if (loc.row >= gs - 1) dirs.down++;
      if (loc.col === 0) dirs.inside++;
      if (loc.col >= gs - 1) dirs.outside++;
    });
    const worst = Object.entries(dirs).sort(([, a], [, b]) => b - a)[0];
    if (worst[1] > misses.length * 0.4) {
      patterns.push({
        category: "pitching", metric: "miss_direction", value: Math.round((worst[1] / misses.length) * 100),
        threshold: 40, severity: "medium",
        description: `${Math.round((worst[1] / misses.length) * 100)}% of misses go ${worst[0]}`,
      });
    }
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════════════
// MODULE MICRO-ANALYZERS (Speed Lab, Royal Timing, Tex Vision, Baserunning)
// ═══════════════════════════════════════════════════════════════

function analyzeSpeedLabMicro(speedSessions: any[]): MicroPattern[] {
  const patterns: MicroPattern[] = [];
  if (!speedSessions || speedSessions.length < 3) return patterns;

  // Stride inefficiency trend: compare first half vs second half of sessions
  const stepsData = speedSessions.filter((s: any) => s.steps_per_rep);
  if (stepsData.length >= 4) {
    const extractSteps = (s: any): number[] => {
      if (typeof s.steps_per_rep === 'object') return Object.values(s.steps_per_rep).filter((v: any) => typeof v === 'number') as number[];
      return [];
    };
    const recentHalf = stepsData.slice(0, Math.floor(stepsData.length / 2));
    const olderHalf = stepsData.slice(Math.floor(stepsData.length / 2));
    const recentAvg = recentHalf.flatMap(extractSteps);
    const olderAvg = olderHalf.flatMap(extractSteps);
    if (recentAvg.length > 0 && olderAvg.length > 0) {
      const recentMean = recentAvg.reduce((a, b) => a + b, 0) / recentAvg.length;
      const olderMean = olderAvg.reduce((a, b) => a + b, 0) / olderAvg.length;
      if (recentMean > olderMean * 1.08) {
        patterns.push({
          category: "speed", metric: "stride_inefficiency", value: Math.round(recentMean * 10) / 10,
          threshold: Math.round(olderMean * 10) / 10, severity: recentMean > olderMean * 1.15 ? "high" : "medium",
          description: `Decreasing stride efficiency — avg steps/rep rising from ${olderMean.toFixed(1)} to ${recentMean.toFixed(1)}`,
          data_points: { recent_avg: recentMean, older_avg: olderMean },
        });
      }
    }
  }

  // High RPE with low output
  const rpeOutputData = speedSessions.filter((s: any) => s.rpe != null && s.distances);
  if (rpeOutputData.length >= 3) {
    const highRpeLowOutput = rpeOutputData.filter((s: any) => {
      const dists = Array.isArray(s.distances) ? s.distances : Object.values(s.distances || {});
      const maxDist = Math.max(...(dists.filter((d: any) => typeof d === 'number') as number[]));
      return s.rpe >= 7 && maxDist < 30; // High effort, short distances
    });
    if (highRpeLowOutput.length >= 2) {
      const pct = Math.round((highRpeLowOutput.length / rpeOutputData.length) * 100);
      patterns.push({
        category: "speed", metric: "effort_output_mismatch", value: pct,
        threshold: 30, severity: pct > 50 ? "high" : "medium",
        description: `${pct}% of speed sessions show high effort (RPE 7+) with low output`,
        data_points: { high_rpe_low_output_count: highRpeLowOutput.length },
      });
    }
  }

  return patterns;
}

function analyzeTimingMicro(timingSessions: any[]): MicroPattern[] {
  const patterns: MicroPattern[] = [];
  if (!timingSessions || timingSessions.length < 3) return patterns;

  const allTimes: number[] = [];
  timingSessions.forEach((s: any) => {
    const td = s.timer_data;
    if (Array.isArray(td)) {
      td.forEach((t: any) => { if (typeof t === 'number') allTimes.push(t); });
    } else if (typeof td === 'object' && td) {
      Object.values(td).forEach((v: any) => { if (typeof v === 'number') allTimes.push(v); });
    }
  });

  if (allTimes.length >= 5) {
    const mean = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
    const variance = allTimes.reduce((s, v) => s + (v - mean) ** 2, 0) / allTimes.length;
    const cv = Math.sqrt(variance) / Math.max(mean, 0.01);
    if (cv > 0.15) {
      patterns.push({
        category: "timing", metric: "timing_inconsistency", value: Math.round(cv * 100),
        threshold: 15, severity: cv > 0.25 ? "high" : "medium",
        description: `Timing inconsistency during stride phase — CV ${(cv * 100).toFixed(0)}% (target: <15%)`,
        data_points: { cv, mean_time: mean, sample_size: allTimes.length },
      });
    }
  }

  return patterns;
}

function analyzeVisionMicro(visionDrills: any[]): MicroPattern[] {
  const patterns: MicroPattern[] = [];
  if (!visionDrills || visionDrills.length < 3) return patterns;

  // Group by drill_type and detect low accuracy
  const byType: Record<string, { accuracies: number[]; reactions: number[] }> = {};
  visionDrills.forEach((d: any) => {
    const type = d.drill_type || 'general';
    if (!byType[type]) byType[type] = { accuracies: [], reactions: [] };
    if (d.accuracy_percent != null) byType[type].accuracies.push(d.accuracy_percent);
    if (d.reaction_time_ms != null) byType[type].reactions.push(d.reaction_time_ms);
  });

  Object.entries(byType).forEach(([type, data]) => {
    if (data.accuracies.length >= 2) {
      const avgAcc = data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length;
      if (avgAcc < 70) {
        patterns.push({
          category: "vision", metric: "vision_accuracy_low", value: Math.round(avgAcc),
          threshold: 70, severity: avgAcc < 50 ? "high" : "medium",
          description: `Recognition accuracy ${Math.round(avgAcc)}% on ${type} drills — below 70% target`,
          data_points: { drill_type: type, avg_accuracy: avgAcc },
        });
      }
    }
  });

  // Overall reaction time check
  const allReactions = visionDrills.filter((d: any) => d.reaction_time_ms).map((d: any) => d.reaction_time_ms);
  if (allReactions.length >= 3) {
    const avgReaction = allReactions.reduce((a: number, b: number) => a + b, 0) / allReactions.length;
    if (avgReaction > 400) {
      patterns.push({
        category: "vision", metric: "slow_reaction_time", value: Math.round(avgReaction),
        threshold: 400, severity: avgReaction > 500 ? "high" : "medium",
        description: `Avg reaction time ${Math.round(avgReaction)}ms — above 400ms threshold`,
        data_points: { avg_reaction_ms: avgReaction },
      });
    }
  }

  return patterns;
}

function analyzeBaserunningMicro(microReps: any[], drillBlocks: any[]): MicroPattern[] {
  const patterns: MicroPattern[] = [];

  // Filter baserunning reps from micro_layer_data
  const brReps = microReps.filter((r: any) =>
    r.jump_grade != null || r.read_grade != null || r.time_to_base_band
  );
  const brBlocks = drillBlocks.filter((b: any) =>
    b.drill_type && ['baserunning', 'base_stealing', 'lead_off', 'sprint'].some(t => (b.drill_type || '').toLowerCase().includes(t))
  );

  // Jump grade analysis
  const jumpGrades = brReps.filter((r: any) => r.jump_grade != null).map((r: any) => r.jump_grade);
  if (jumpGrades.length >= 3) {
    const avg = jumpGrades.reduce((a: number, b: number) => a + b, 0) / jumpGrades.length;
    if (avg < 40) {
      patterns.push({
        category: "baserunning", metric: "poor_jump_timing", value: Math.round(avg),
        threshold: 40, severity: avg < 25 ? "high" : "medium",
        description: `Delayed jump timing — avg jump grade ${Math.round(avg)}/80`,
        data_points: { avg_jump_grade: avg, sample_size: jumpGrades.length },
      });
    }
  }

  // Read grade analysis
  const readGrades = brReps.filter((r: any) => r.read_grade != null).map((r: any) => r.read_grade);
  if (readGrades.length >= 3) {
    const avg = readGrades.reduce((a: number, b: number) => a + b, 0) / readGrades.length;
    if (avg < 40) {
      patterns.push({
        category: "baserunning", metric: "poor_read_timing", value: Math.round(avg),
        threshold: 40, severity: avg < 25 ? "high" : "medium",
        description: `Poor read timing — avg read grade ${Math.round(avg)}/80`,
        data_points: { avg_read_grade: avg, sample_size: readGrades.length },
      });
    }
  }

  // Time to base band — slow band detection
  const timeBands = brReps.filter((r: any) => r.time_to_base_band);
  if (timeBands.length >= 3) {
    const slowCount = timeBands.filter((r: any) => r.time_to_base_band === 'slow').length;
    const slowPct = (slowCount / timeBands.length) * 100;
    if (slowPct > 40) {
      patterns.push({
        category: "baserunning", metric: "slow_base_times", value: Math.round(slowPct),
        threshold: 40, severity: slowPct > 60 ? "high" : "medium",
        description: `${Math.round(slowPct)}% of base times graded slow`,
        data_points: { slow_count: slowCount, total: timeBands.length },
      });
    }
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT-AWARE DETECTION: Game vs Practice Gap
// ═══════════════════════════════════════════════════════════════

function detectGamePracticeGap(allReps: any[]): MicroPattern[] {
  const gameReps = allReps.filter((r: any) => ['game', 'live_scrimmage', 'live_abs'].includes(r._session_type));
  const practiceReps = allReps.filter((r: any) => !['game', 'live_scrimmage', 'live_abs'].includes(r._session_type));
  if (gameReps.length < 5 || practiceReps.length < 5) return [];

  const gameWeak = gameReps.filter((r: any) => ['weak_contact', 'miss', 'foul'].includes(r.contact_quality)).length / gameReps.length * 100;
  const practiceWeak = practiceReps.filter((r: any) => ['weak_contact', 'miss', 'foul'].includes(r.contact_quality)).length / practiceReps.length * 100;
  const gap = gameWeak - practiceWeak;

  if (gap > 20) {
    return [{
      category: 'hitting', metric: 'practice_game_gap', value: Math.round(gap),
      threshold: 20, severity: gap > 35 ? 'high' : 'medium',
      description: `Game performance ${Math.round(gap)}% worse than practice — transfer gap detected`,
      data_points: { game_weak_pct: Math.round(gameWeak), practice_weak_pct: Math.round(practiceWeak), game_reps: gameReps.length, practice_reps: practiceReps.length, context: 'game_gap' },
    }];
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════
// TEMPORAL INTELLIGENCE: Fatigue Drop-off Detection
// ═══════════════════════════════════════════════════════════════

function detectFatigueDropoff(sessions: any[]): MicroPattern[] {
  let fatigueSessionCount = 0;
  let totalMagnitude = 0;
  for (const s of sessions) {
    const reps = Array.isArray(s.micro_layer_data) ? s.micro_layer_data : [];
    if (reps.length < 15) continue;
    const third = Math.floor(reps.length / 3);
    const earlyReps = reps.slice(0, third);
    const lateReps = reps.slice(-third);
    if (earlyReps.length === 0 || lateReps.length === 0) continue;
    const earlyWeak = earlyReps.filter((r: any) => ['weak_contact', 'miss', 'foul'].includes(r.contact_quality)).length / earlyReps.length * 100;
    const lateWeak = lateReps.filter((r: any) => ['weak_contact', 'miss', 'foul'].includes(r.contact_quality)).length / lateReps.length * 100;
    const dropoff = lateWeak - earlyWeak;
    if (dropoff > 20) {
      fatigueSessionCount++;
      totalMagnitude += dropoff;
    }
  }
  if (fatigueSessionCount >= 3) {
    const avgMagnitude = Math.round(totalMagnitude / fatigueSessionCount);
    return [{
      category: 'hitting', metric: 'fatigue_dropoff', value: fatigueSessionCount,
      threshold: 3, severity: fatigueSessionCount >= 5 ? 'high' : 'medium',
      description: `Performance drops ${avgMagnitude}% in final third of ${fatigueSessionCount} recent sessions — fatigue pattern detected`,
      data_points: { sessions_with_dropoff: fatigueSessionCount, avg_magnitude: avgMagnitude, context: 'fatigue' },
    }];
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════
// PRESCRIPTIVE DRILL MAPPING (with adaptive rotation)
// ═══════════════════════════════════════════════════════════════

interface DrillRotation {
  primary: PrescriptiveDrill;
  alternatives: PrescriptiveDrill[];
}

function buildDrillRotations(pattern: MicroPattern): DrillRotation[] {
  const rotations: DrillRotation[] = [];

  switch (pattern.metric) {
    case "chase_rate":
    case "block_chase_rate":
      rotations.push({
        primary: { name: "Go/No-Go Recognition", description: "Decision-only tracking — identify pitches without swinging", module: "tex-vision", constraints: "0.35s window, 40 pitches", drill_type: "recognition" },
        alternatives: [
          { name: "Zone Discipline Trainer", description: "Track zone boundaries, no swing required", module: "tex-vision", constraints: "0.4s window, 35 pitches", drill_type: "vision" },
          { name: "Take Drill: Off-Speed Only", description: "Practice taking all off-speed pitches", module: "practice-hub", constraints: "20 pitches, take all breaking", drill_type: "pitch_recognition" },
        ],
      });
      rotations.push({
        primary: { name: "Zone Awareness Tracking", description: "Call ball/strike before pitch crosses plate", module: "practice-hub", constraints: "30 pitches, verbal call only", drill_type: "pitch_recognition" },
        alternatives: [
          { name: "2-Strike Discipline Drill", description: "Protect the zone with 2 strikes, expand nothing", module: "practice-hub", constraints: "15 ABs, 2-strike count start", drill_type: "situational" },
        ],
      });
      break;
    case "whiff_rate":
      rotations.push({
        primary: { name: "Tee Work: Barrel Precision", description: "Center-mass contact focus with intent", module: "practice-hub", constraints: "3 sets × 15 reps, 80% intent", drill_type: "tee_work" },
        alternatives: [
          { name: "Overload/Underload Bat Drill", description: "Alternate heavy and light bats for barrel control", module: "practice-hub", constraints: "10 reps each weight, 3 rounds", drill_type: "bat_speed" },
          { name: "One-Hand Tee Drill", description: "Top hand and bottom hand isolation for barrel path", module: "practice-hub", constraints: "10 reps each hand", drill_type: "tee_work" },
        ],
      });
      rotations.push({
        primary: { name: "Short Toss: Contact Focus", description: "Shortened swing to maximize barrel contact", module: "practice-hub", constraints: "20 reps, contact priority", drill_type: "soft_toss" },
        alternatives: [
          { name: "Flat Ground BP: Barrel Path", description: "Focus on line-drive contact with flat bat path", module: "practice-hub", constraints: "25 reps, line drives only", drill_type: "machine_bp" },
        ],
      });
      break;
    case "velocity_weakness": {
      const veloBand = pattern.data_points?.velocity_band || "75-80";
      rotations.push({
        primary: { name: "High Velocity Machine BP", description: `Train against elevated velocity to close timing gap`, module: "practice-hub", constraints: `Set machine to ${veloBand} mph, 25 reps`, drill_type: "machine_bp" },
        alternatives: [
          { name: "Rapid Fire Front Toss", description: "Quick-paced front toss to train fast-twitch bat speed", module: "practice-hub", constraints: `20 reps, rapid pace, ${veloBand} simulate`, drill_type: "front_toss" },
          { name: "Velocity Ladder Drill", description: "Progressive speed increase across rounds", module: "practice-hub", constraints: "5 reps per speed increment", drill_type: "machine_bp" },
        ],
      });
      rotations.push({
        primary: { name: "Quick Hands Drill", description: "Accelerated bat speed through the zone", module: "practice-hub", constraints: "Overload bat → game bat, 15 reps each", drill_type: "bat_speed" },
        alternatives: [
          { name: "Short Bat Velocity Drill", description: "Use shortened bat to train quick path to contact", module: "practice-hub", constraints: "15 reps, quick hands focus", drill_type: "bat_speed" },
        ],
      });
      break;
    }
    case "inside_weakness":
      rotations.push({
        primary: { name: "Inside Pitch Tee Work", description: "Set tee on inside corner, drive pull-side", module: "practice-hub", constraints: "20 reps, pull focus, 90% intent", drill_type: "tee_work" },
        alternatives: [
          { name: "Turn & Burn Drill", description: "Quick rotation focus — get barrel to inside pitch fast", module: "practice-hub", constraints: "15 reps, max rotation speed", drill_type: "bat_speed" },
        ],
      });
      rotations.push({
        primary: { name: "Front Toss Inside", description: "Quick hands inside, stay through the ball", module: "practice-hub", constraints: "15 reps from 15ft", drill_type: "front_toss" },
        alternatives: [
          { name: "Inside Soft Toss Variation", description: "Inside location from multiple arm angles", module: "practice-hub", constraints: "20 reps, varied angles", drill_type: "soft_toss" },
        ],
      });
      break;
    case "outside_weakness":
      rotations.push({
        primary: { name: "Opposite Field Soft Toss", description: "Late barrel path, plate coverage", module: "practice-hub", constraints: "20 reps, oppo-field only", drill_type: "soft_toss" },
        alternatives: [
          { name: "Outside Tee: Stay Inside Ball", description: "Tee on outer third, drive opposite field", module: "practice-hub", constraints: "20 reps, oppo focus", drill_type: "tee_work" },
        ],
      });
      rotations.push({
        primary: { name: "Two-Strike Approach", description: "Widen zone, shorten swing, use whole field", module: "practice-hub", constraints: "10 ABs, 2-strike count", drill_type: "situational" },
        alternatives: [
          { name: "Plate Coverage Drill", description: "Hit to all fields from various locations", module: "practice-hub", constraints: "15 reps, all-field approach", drill_type: "soft_toss" },
        ],
      });
      break;
    case "up_weakness":
    case "down_weakness":
      rotations.push({
        primary: { name: `${pattern.metric === 'up_weakness' ? 'High' : 'Low'} Pitch Tee Work`, description: `Set tee ${pattern.metric === 'up_weakness' ? 'chest high' : 'at knees'} and drive`, module: "practice-hub", constraints: "20 reps, level swing", drill_type: "tee_work" },
        alternatives: [
          { name: `${pattern.metric === 'up_weakness' ? 'High' : 'Low'} Zone Front Toss`, description: `Front toss to ${pattern.metric === 'up_weakness' ? 'elevated' : 'low'} zone`, module: "practice-hub", constraints: "15 reps, zone focus", drill_type: "front_toss" },
        ],
      });
      break;
    case "pitch_type_decision": {
      const pitchType = pattern.data_points?.pitch_type || pattern.description.match(/vs (\w+)/)?.[1] || "off-speed";
      rotations.push({
        primary: { name: `${pitchType} Recognition Drill`, description: `Identify ${pitchType} out of hand — no swing`, module: "tex-vision", constraints: "0.4s window, 30 pitches", drill_type: "recognition" },
        alternatives: [
          { name: `${pitchType} Spin Identification`, description: `Focus on spin axis to identify ${pitchType} early`, module: "tex-vision", constraints: "0.35s window, 25 pitches", drill_type: "vision" },
        ],
      });
      rotations.push({
        primary: { name: "Pitch Tunneling Awareness", description: "Differentiate fastball vs breaking ball from same tunnel", module: "tex-vision", constraints: "3 min, chaos mode", drill_type: "vision" },
        alternatives: [
          { name: "Sequence Recognition Drill", description: "Identify pitch sequences and patterns", module: "tex-vision", constraints: "5 min, progressive difficulty", drill_type: "recognition" },
        ],
      });
      break;
    }
    case "clean_field_pct":
      rotations.push({
        primary: { name: "Ground Ball Funnel", description: "Rapid ground ball reps with clean transfer", module: "practice-hub", constraints: "25 reps, clean field focus", drill_type: "fielding" },
        alternatives: [
          { name: "Short Hop Drill", description: "Read and react to short hops at game speed", module: "practice-hub", constraints: "20 reps, varied hops", drill_type: "fielding" },
        ],
      });
      rotations.push({
        primary: { name: "Bare Hand Drill", description: "Soft hands and clean exchange", module: "practice-hub", constraints: "15 reps, timed", drill_type: "fielding" },
        alternatives: [
          { name: "Backhand/Forehand Mix", description: "Alternate backhand and forehand reps", module: "practice-hub", constraints: "10 each side", drill_type: "fielding" },
        ],
      });
      break;
    case "slow_exchange":
      rotations.push({
        primary: { name: "Quick Exchange Drill", description: "Glove-to-throw in under 1.2s", module: "practice-hub", constraints: "20 reps, timed exchange", drill_type: "fielding" },
        alternatives: [
          { name: "Flip Drill", description: "Quick flip transfers to partner", module: "practice-hub", constraints: "15 reps, target 0.8s", drill_type: "fielding" },
        ],
      });
      break;
    case "footwork_grade":
      rotations.push({
        primary: { name: "Footwork Pattern Drill", description: "Crossover, drop step, and approach angles", module: "practice-hub", constraints: "15 reps each pattern", drill_type: "fielding" },
        alternatives: [
          { name: "Cone Agility Footwork", description: "Lateral movement and plant-and-throw patterns", module: "practice-hub", constraints: "3 sets × 5 reps", drill_type: "fielding" },
        ],
      });
      break;
    case "throw_accuracy":
      rotations.push({
        primary: { name: "Target Throwing", description: "Hit specific target zones from game distances", module: "practice-hub", constraints: "20 throws, log accuracy", drill_type: "throwing" },
        alternatives: [
          { name: "Long Toss Accuracy", description: "Maintain accuracy through progressively longer throws", module: "practice-hub", constraints: "15 throws, track accuracy", drill_type: "throwing" },
        ],
      });
      break;
    case "zone_pct":
      rotations.push({
        primary: { name: "Bullpen: Command Focus", description: "Hit specific quadrants with each pitch type", module: "practice-hub", constraints: "40 pitches, track zone %", drill_type: "bullpen" },
        alternatives: [
          { name: "Spot Drill: Four Corners", description: "Target each corner of the zone sequentially", module: "practice-hub", constraints: "10 per corner, chart results", drill_type: "bullpen" },
        ],
      });
      break;
    case "miss_direction": {
      const dir = pattern.description.match(/go (\w+)/)?.[1] || "away";
      rotations.push({
        primary: { name: `${dir.charAt(0).toUpperCase() + dir.slice(1)} Correction Drill`, description: `Mechanical focus to correct ${dir} miss tendency`, module: "practice-hub", constraints: "30 pitches, intent on opposite correction", drill_type: "bullpen" },
        alternatives: [
          { name: "Mirror Drill: Release Point", description: "Video and repeat release mechanics for consistency", module: "practice-hub", constraints: "20 reps, check video each 5", drill_type: "bullpen" },
        ],
      });
      break;
    }
    // ── NEW: Speed Lab patterns
    case "stride_inefficiency":
      rotations.push({
        primary: { name: "Sprint Mechanics Drill", description: "Focus on efficient stride length and ground contact", module: "speed-lab", constraints: "4 × 30yd, film and review stride", drill_type: "sprint" },
        alternatives: [
          { name: "Resisted Sprint Starts", description: "Sled or band resisted starts for power", module: "speed-lab", constraints: "6 × 10yd, 60s rest", drill_type: "sprint" },
        ],
      });
      break;
    case "effort_output_mismatch":
      rotations.push({
        primary: { name: "Resisted Acceleration Starts", description: "Build first-step explosiveness", module: "speed-lab", constraints: "5 × 10yd, full recovery", drill_type: "sprint" },
        alternatives: [
          { name: "Plyometric Acceleration Drill", description: "Box jumps to sprint transitions", module: "speed-lab", constraints: "4 sets × 3 reps", drill_type: "sprint" },
        ],
      });
      break;
    // ── NEW: Timing patterns
    case "timing_inconsistency":
      rotations.push({
        primary: { name: "Load/Stride Sync Drill", description: "Synchronize load timing with stride landing", module: "practice-hub", constraints: "20 reps, metronome pacing", drill_type: "timing" },
        alternatives: [
          { name: "Tempo Hitting Drill", description: "Hit to a consistent rhythmic count", module: "practice-hub", constraints: "15 reps, 3-count tempo", drill_type: "timing" },
        ],
      });
      rotations.push({
        primary: { name: "Rhythm Training Block", description: "Progressive timing with varied pitch speeds", module: "practice-hub", constraints: "3 rounds × 10 pitches", drill_type: "timing" },
        alternatives: [
          { name: "Dry Swing Timing Drill", description: "No-ball swings focusing on consistent trigger timing", module: "practice-hub", constraints: "20 dry swings, film and check", drill_type: "timing" },
        ],
      });
      break;
    // ── NEW: Vision patterns
    case "vision_accuracy_low": {
      const drillType = pattern.data_points?.drill_type || "recognition";
      rotations.push({
        primary: { name: `${drillType} Focused Training`, description: `Targeted accuracy improvement on ${drillType} drills`, module: "tex-vision", constraints: "0.4s window, 30 pitches", drill_type: "recognition" },
        alternatives: [
          { name: "Progressive Difficulty Vision", description: "Start easy, ramp to hard difficulty", module: "tex-vision", constraints: "10 easy → 10 medium → 10 hard", drill_type: "vision" },
        ],
      });
      break;
    }
    case "slow_reaction_time":
      rotations.push({
        primary: { name: "Reaction Compression Training", description: "Progressively shorten decision windows", module: "tex-vision", constraints: "Start 0.5s, compress to 0.3s", drill_type: "recognition" },
        alternatives: [
          { name: "Flash Recognition Drill", description: "Ultra-short exposure pitch identification", module: "tex-vision", constraints: "0.25s flash, 25 pitches", drill_type: "vision" },
        ],
      });
      break;
    // ── NEW: Baserunning patterns
    case "poor_jump_timing":
      rotations.push({
        primary: { name: "First-Step Reaction Drill", description: "React to visual cue, explosive first step", module: "speed-lab", constraints: "8 reps, max effort start", drill_type: "baserunning" },
        alternatives: [
          { name: "Lead-Off Jump Drill", description: "Practice primary and secondary leads with timed jumps", module: "practice-hub", constraints: "10 reps, time each jump", drill_type: "baserunning" },
        ],
      });
      break;
    case "poor_read_timing":
      rotations.push({
        primary: { name: "Read-Based Baserunning Drill", description: "React to pitcher movement cues for go/no-go", module: "practice-hub", constraints: "10 reps, randomized go/stay", drill_type: "baserunning" },
        alternatives: [
          { name: "Video Read Drill", description: "Watch pitcher video clips, call go or stay", module: "tex-vision", constraints: "20 clips, timed decisions", drill_type: "recognition" },
        ],
      });
      break;
    case "slow_base_times":
      rotations.push({
        primary: { name: "Base Path Sprint Work", description: "Timed sprints on full base paths", module: "speed-lab", constraints: "4 reps home-to-first, 2 reps home-to-second", drill_type: "sprint" },
        alternatives: [
          { name: "Curved Sprint Drill", description: "Practice efficient rounding technique", module: "speed-lab", constraints: "4 reps around bases, focus on angles", drill_type: "sprint" },
        ],
      });
      break;
    case "practice_game_gap":
      rotations.push({
        primary: { name: "Pressure Simulation BP", description: "Live at-bats with simulated game counts and consequences", module: "practice-hub", constraints: "15 ABs, full count scenarios", drill_type: "situational" },
        alternatives: [
          { name: "Competitive Rounds", description: "Score-based hitting rounds against teammates", module: "practice-hub", constraints: "3 rounds × 5 ABs, track results", drill_type: "situational" },
        ],
      });
      rotations.push({
        primary: { name: "Mental Performance Routine", description: "Pre-AB breathing and visualization routine under pressure", module: "practice-hub", constraints: "5 min visualization + 10 live ABs", drill_type: "mental" },
        alternatives: [
          { name: "Distraction Training", description: "Practice with crowd noise and distractions", module: "practice-hub", constraints: "10 ABs with audio distractions", drill_type: "mental" },
        ],
      });
      break;
    case "fatigue_dropoff":
      rotations.push({
        primary: { name: "Quality-Over-Quantity Protocol", description: "Reduce session volume, increase rest between sets", module: "practice-hub", constraints: "Max 15 reps per set, 2 min rest", drill_type: "volume_management" },
        alternatives: [
          { name: "Endurance Conditioning Circuit", description: "Build stamina to maintain quality through full sessions", module: "speed-lab", constraints: "3 circuits, moderate intensity", drill_type: "conditioning" },
        ],
      });
      break;
    // ── Tool-Performance Gap: skill_transfer cases
    case "tool_gap_hit_skill_transfer":
      rotations.push({
        primary: { name: "Live BP Situational Hitting", description: "Game-speed at-bats focusing on pitch recognition and application", module: "practice-hub", constraints: "15 ABs, track contact quality", drill_type: "skill_transfer" },
        alternatives: [
          { name: "Vision-to-Swing Drill", description: "Pitch recognition followed by immediate swing decisions", module: "tex-vision", constraints: "20 pitches, timed response", drill_type: "recognition" },
        ],
      });
      break;
    case "tool_gap_power_skill_transfer":
      rotations.push({
        primary: { name: "High-Intent BP", description: "Max-effort swings with intent to drive, tracking exit velo", module: "practice-hub", constraints: "10 swings, measure EV", drill_type: "skill_transfer" },
        alternatives: [
          { name: "Overload/Underload Swings", description: "Alternate heavy and light bat swings for power transfer", module: "practice-hub", constraints: "3 sets × 6 swings each weight", drill_type: "power_transfer" },
        ],
      });
      break;
    case "tool_gap_run_skill_transfer":
      rotations.push({
        primary: { name: "Lead-Off Read Drill", description: "Practice reading pitcher cues for optimal jump timing", module: "practice-hub", constraints: "10 reps, video review", drill_type: "baserunning" },
        alternatives: [
          { name: "Situational Baserunning", description: "Game scenarios with go/no-go decisions under time pressure", module: "practice-hub", constraints: "8 scenarios, timed", drill_type: "decision" },
        ],
      });
      break;
    case "tool_gap_field_skill_transfer":
      rotations.push({
        primary: { name: "Game-Speed Fungo", description: "Fielding reps at game speed with timed exchanges", module: "practice-hub", constraints: "20 reps, clock exchange time", drill_type: "skill_transfer" },
        alternatives: [
          { name: "Pressure Fielding Circuit", description: "Rapid-fire ground balls with throw-to-base requirements", module: "practice-hub", constraints: "15 reps, scorecard", drill_type: "pressure" },
        ],
      });
      break;
    case "tool_gap_arm_skill_transfer":
      rotations.push({
        primary: { name: "Target Throwing from Position", description: "Throws to bases from game-position fielding", module: "practice-hub", constraints: "15 throws, chart accuracy", drill_type: "skill_transfer" },
        alternatives: [
          { name: "Accuracy Long Toss", description: "Long toss with target zones for accuracy transfer", module: "practice-hub", constraints: "20 throws, track accuracy %", drill_type: "arm_accuracy" },
        ],
      });
      break;
    // ── Tool-Performance Gap: physical_development cases
    case "tool_gap_hit_physical":
      rotations.push({
        primary: { name: "Bat Speed Overload Training", description: "Heavy bat drills to increase raw bat speed", module: "practice-hub", constraints: "3 sets × 8 swings, heavy bat", drill_type: "physical_development" },
        alternatives: [
          { name: "Tee Precision Work", description: "Focus on barrel accuracy at various heights and depths", module: "practice-hub", constraints: "30 swings, target zones", drill_type: "mechanics" },
        ],
      });
      break;
    case "tool_gap_power_physical":
      rotations.push({
        primary: { name: "Explosive Strength Circuit", description: "Med ball throws, plyometrics, and jump training for power development", module: "speed-lab", constraints: "3 circuits, max effort", drill_type: "physical_development" },
        alternatives: [
          { name: "Lower Body Power Complex", description: "Squat jumps, broad jumps, and rotational throws", module: "speed-lab", constraints: "4 sets × 5 reps each", drill_type: "strength" },
        ],
      });
      break;
    case "tool_gap_run_physical":
      rotations.push({
        primary: { name: "Sprint Mechanics Lab", description: "Focus on acceleration mechanics and stride efficiency", module: "speed-lab", constraints: "6 × 30yd sprints, video review", drill_type: "physical_development" },
        alternatives: [
          { name: "Pro Agility Work", description: "Lateral quickness and change-of-direction training", module: "speed-lab", constraints: "8 reps, timed", drill_type: "agility" },
        ],
      });
      break;
    case "tool_gap_field_physical":
      rotations.push({
        primary: { name: "Lateral Shuffle Circuit", description: "Improve lateral range and first-step quickness", module: "speed-lab", constraints: "4 sets × 10 shuffles each direction", drill_type: "physical_development" },
        alternatives: [
          { name: "Agility Cone Drill", description: "Multi-directional cone patterns for fielding range", module: "speed-lab", constraints: "6 patterns, timed", drill_type: "agility" },
        ],
      });
      break;
    case "tool_gap_arm_physical":
      rotations.push({
        primary: { name: "Weighted Ball Program", description: "Progressive weighted ball throwing for arm strength", module: "practice-hub", constraints: "Prescribed weight progression, 25 throws", drill_type: "physical_development" },
        alternatives: [
          { name: "Long Toss Program", description: "Structured long toss to build arm strength and endurance", module: "practice-hub", constraints: "Build to max distance, 30 throws", drill_type: "arm_strength" },
        ],
      });
      break;
    default:
      if (pattern.metric?.startsWith('tool_gap_')) {
        console.error(`UNHANDLED_METRIC: ${pattern.metric} for athlete, category=${pattern.category}`);
      }
      if (pattern.category === "pitching") {
        rotations.push({
          primary: { name: "Command Bullpen", description: "Focus on locating all pitch types", module: "practice-hub", constraints: "40 pitches, chart location", drill_type: "bullpen" },
          alternatives: [
            { name: "Targeted Bullpen", description: "Focus on weakest pitch type only", module: "practice-hub", constraints: "25 pitches, single pitch type", drill_type: "bullpen" },
          ],
        });
      }
      break;
  }

  return rotations;
}

function mapPatternToDrills(
  pattern: MicroPattern,
  ineffectiveDrills: Set<string>,
  drillUsageCounts: Record<string, number>,
  drillCatalog: Map<string, string>,
): PrescriptiveDrill[] {
  const rotations = buildDrillRotations(pattern);
  const drills: PrescriptiveDrill[] = [];

  for (const rotation of rotations) {
    let chosen = rotation.primary;
    // If primary is ineffective or overused (3+), rotate
    if (ineffectiveDrills.has(chosen.name) || (drillUsageCounts[chosen.name] ?? 0) >= 3) {
      const alt = rotation.alternatives.find(a => !ineffectiveDrills.has(a.name) && (drillUsageCounts[a.name] ?? 0) < 3);
      if (alt) chosen = alt;
      else if (rotation.alternatives.length > 0) chosen = rotation.alternatives[0]; // fallback to first alt
    }
    // Attach drill_id from catalog
    chosen.drill_id = drillCatalog.get(chosen.name) || undefined;
    drills.push(chosen);
  }

  return drills;
}

// ═══════════════════════════════════════════════════════════════
// DEVELOPMENT STATUS
// ═══════════════════════════════════════════════════════════════

function computeDevelopmentStatus(scores: { score: number; date: string }[]): { status: string; trend7d: number; trend30d: number } {
  if (scores.length < 2) return { status: "stalled", trend7d: 0, trend30d: 0 };
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const recent = scores[0];
  const week = scores.find(s => new Date(s.date) <= d7) ?? scores[scores.length - 1];
  const month = scores.find(s => new Date(s.date) <= d30) ?? scores[scores.length - 1];
  const trend7d = recent.score - week.score;
  const trend30d = recent.score - month.score;
  const last30 = scores.filter(s => new Date(s.date) >= d30);
  const mean = last30.reduce((a, b) => a + b.score, 0) / last30.length;
  const stddev = Math.sqrt(last30.reduce((a, b) => a + (b.score - mean) ** 2, 0) / last30.length);
  let status = "stalled";
  if (trend30d > 5 && trend7d > 2) status = "accelerating";
  else if (trend30d > 2) status = "improving";
  else if (stddev > 8) status = "inconsistent";
  else if (Math.abs(trend30d) <= 1) status = "stalled";
  return { status, trend7d: Math.round(trend7d * 10) / 10, trend30d: Math.round(trend30d * 10) / 10 };
}

function computeReadiness(vaultData: any[]): { score: number | null; recommendation: string } {
  // No silent fallback: if athlete hasn't logged a focus quiz we have no
  // subjective readiness signal at all and the snapshot must reflect that.
  if (!vaultData || vaultData.length === 0) {
    return { score: null, recommendation: "Log a focus quiz (sleep / stress / pain) to calibrate readiness." };
  }
  const latest = vaultData[0];
  const sleep = latest.sleep_quality ?? 3;
  const stress = latest.stress_level ?? 3;
  const pain = latest.pain_level ?? 0;
  const sleepScore = (sleep / 5) * 40;
  const stressScore = ((5 - stress) / 5) * 30;
  const painPenalty = Math.min(pain * 5, 30);
  const score = Math.round(Math.max(0, Math.min(100, sleepScore + stressScore + 30 - painPenalty)));
  let recommendation: string;
  if (score >= 80) recommendation = `You are ${score}% ready → Train full intent`;
  else if (score >= 60) recommendation = `You are ${score}% ready → Standard training volume`;
  else if (score >= 40) recommendation = `You are ${score}% ready → Reduce volume, focus on timing and mechanics`;
  else recommendation = `You are ${score}% ready → Active recovery only`;
  return { score, recommendation };
}

/**
 * Training Load Readiness — derived from Hammers behavioral data.
 * Returns null when the athlete has no consistency snapshot yet, so two
 * users with different training histories no longer collapse to the same
 * subjective-only readiness number.
 *
 * Components (weights):
 *   consistency_score      0.50  (canonical Hammers adherence 0-100)
 *   nn_freshness           0.30  (1 - nn_miss_count_7d/7, clamped 0..1)
 *   cns_headroom           0.20  (1 - avg7d_cns_load/100, clamped 0..1; neutral 0.7 if no logs)
 */
function computeTrainingReadiness(
  consistencySnap: { consistency_score?: number | null; nn_miss_count_7d?: number | null } | null,
  dailyLogs: Array<{ cns_load_actual?: number | null; entry_date?: string }> | null,
): number | null {
  if (!consistencySnap || consistencySnap.consistency_score == null) return null;

  const consistency = Math.max(0, Math.min(100, Number(consistencySnap.consistency_score)));
  const nnMiss = Math.max(0, Math.min(7, Number(consistencySnap.nn_miss_count_7d ?? 0)));
  const nnFreshness = 1 - nnMiss / 7;

  const recentCns = (dailyLogs ?? [])
    .slice(0, 7)
    .map((d) => Number(d.cns_load_actual ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  const avgCns = recentCns.length ? recentCns.reduce((a, b) => a + b, 0) / recentCns.length : null;
  // Treat 100 as full daily CNS budget; headroom = how much capacity is unused.
  const cnsHeadroom = avgCns == null ? 0.7 : Math.max(0, Math.min(1, 1 - avgCns / 100));

  const raw = consistency * 0.5 + nnFreshness * 100 * 0.3 + cnsHeadroom * 100 * 0.2;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function computeConfidence(sessionCount: number, dataRecencyDays: number, hasCoachValidation: boolean): number {
  let score = 0;
  score += Math.min(sessionCount / 30 * 40, 40);
  if (dataRecencyDays <= 2) score += 30;
  else if (dataRecencyDays <= 7) score += 20;
  else if (dataRecencyDays <= 14) score += 10;
  if (hasCoachValidation) score += 30;
  return Math.round(score);
}

// ═══════════════════════════════════════════════════════════════
// BEFORE/AFTER TRENDS
// ═══════════════════════════════════════════════════════════════

function computeBeforeAfterTrends(
  currentComposites: Record<string, number>,
  mpiScores: any[]
): any[] {
  if (mpiScores.length < 2) return [];
  const trends: any[] = [];
  const twoWeeksAgo = mpiScores.find((s: any) => {
    const d = new Date(s.calculation_date);
    return d <= new Date(Date.now() - 14 * 86400000);
  });
  if (!twoWeeksAgo) return [];

  const areas = [
    { key: 'composite_bqi', label: 'Batting Quality' },
    { key: 'composite_fqi', label: 'Fielding Quality' },
    { key: 'composite_pei', label: 'Pitching Effectiveness' },
    { key: 'composite_decision', label: 'Decision Making' },
    { key: 'composite_competitive', label: 'Competitive Execution' },
  ];

  areas.forEach(({ key, label }) => {
    const before = twoWeeksAgo[key] ?? 50;
    const after = currentComposites[key] ?? 50;
    const delta = after - before;
    if (Math.abs(delta) > 1) {
      trends.push({
        area: label,
        before: Math.round(before * 10) / 10,
        after: Math.round(after * 10) / 10,
        delta: Math.round(delta * 10) / 10,
        improving: delta > 0,
      });
    }
  });

  return trends;
}

// ═══════════════════════════════════════════════════════════════
// DRILL EFFECTIVENESS
// ═══════════════════════════════════════════════════════════════

async function computeDrillEffectiveness(supabase: any, userId: string): Promise<any[]> {
  const { data: prescriptions } = await supabase
    .from('drill_prescriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('prescribed_at', { ascending: false })
    .limit(10);

  if (!prescriptions || prescriptions.length === 0) return [];

  const effectiveness: any[] = [];
  for (const rx of prescriptions) {
    if (rx.pre_score != null && rx.post_score != null) {
      const delta = rx.post_score - rx.pre_score;
      effectiveness.push({
        name: rx.drill_name,
        area: rx.weakness_area,
        pre: rx.pre_score,
        post: rx.post_score,
        delta: Math.round(delta * 10) / 10,
        effective: delta > 2,
        adherence: rx.adherence_count ?? 0,
      });
    } else if (rx.pre_score != null) {
      effectiveness.push({
        name: rx.drill_name,
        area: rx.weakness_area,
        pre: rx.pre_score,
        post: null,
        delta: null,
        effective: null,
        adherence: rx.adherence_count ?? 0,
      });
    }
  }
  return effectiveness;
}

// ═══════════════════════════════════════════════════════════════
// SMART WEEK PLAN (AI-generated)
// ═══════════════════════════════════════════════════════════════

async function generateSmartWeekPlan(
  weaknesses: WeaknessCluster[],
  readinessScore: number,
  readinessRec: string,
  developmentStatus: string,
  sessionCount: number,
): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return buildFallbackWeekPlan(weaknesses, readinessScore);
  }

  try {
    const prompt = `You are a baseball/softball development coach. Generate a 7-day training plan.

Context:
- Player has ${sessionCount} sessions logged
- Development status: ${developmentStatus}
- Readiness: ${readinessScore}/100 (${readinessRec})
- Top weaknesses: ${weaknesses.map(w => w.issue).join(', ')}

Rules:
- Return a JSON array of 7 objects
- Each object: { "day": "Monday", "focus": "string", "description": "string", "intensity": "high|medium|low|rest" }
- Include 1-2 rest/recovery days
- Prioritize weak areas
- Label "Suggested — Not Mandatory"
- Keep descriptions under 20 words each

Return ONLY the JSON array, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return buildFallbackWeekPlan(weaknesses, readinessScore);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const plan = JSON.parse(match[0]);
      if (Array.isArray(plan) && plan.length > 0) return plan;
    }
    return buildFallbackWeekPlan(weaknesses, readinessScore);
  } catch (e) {
    console.error("Smart week plan AI error:", e);
    return buildFallbackWeekPlan(weaknesses, readinessScore);
  }
}

function buildFallbackWeekPlan(weaknesses: WeaknessCluster[], readinessScore: number): any[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const focusAreas = weaknesses.map(w => w.issue);
  const plan: any[] = [];

  for (let i = 0; i < 7; i++) {
    if (i === 3 || i === 6) {
      plan.push({ day: days[i], focus: "Recovery", description: "Active recovery, stretching, and mental visualization", intensity: "rest" });
    } else {
      const focus = focusAreas[i % focusAreas.length] || "General Development";
      const intensity = readinessScore >= 70 ? (i < 3 ? "high" : "medium") : "medium";
      plan.push({ day: days[i], focus, description: `Focus on ${focus.toLowerCase()} with structured reps`, intensity });
    }
  }
  return plan;
}

// ═══════════════════════════════════════════════════════════════
// TOOL-PERFORMANCE GAP DETECTION
// ═══════════════════════════════════════════════════════════════

interface ToolPerformanceGap {
  tool: string;
  tool_grade: number;
  perf_output: number;
  perf_source: string;
  gap: number;
  direction: 'tool_exceeds' | 'perf_exceeds';
  issue: string;
  prescription_class: 'skill_transfer' | 'physical';
}

function mapCompositeToToolScale(compositeScore: number): number {
  // Map 0-100 composite → 20-80 tool scale
  return Math.round(20 + (compositeScore / 100) * 60);
}

function analyzeToolPerformanceGaps(
  toolGrades: Record<string, number | null> | null,
  composites: { bqi?: number; fqi?: number; pei?: number; decision?: number; competitive?: number },
): MicroPattern[] {
  if (!toolGrades) return [];
  const patterns: MicroPattern[] = [];

  const mappings: { tool: string; perfKey: keyof typeof composites; perfLabel: string }[] = [
    { tool: 'hit', perfKey: 'bqi', perfLabel: 'BQI' },
    { tool: 'power', perfKey: 'bqi', perfLabel: 'BQI (power output)' },
    { tool: 'field', perfKey: 'fqi', perfLabel: 'FQI' },
    { tool: 'arm', perfKey: 'pei', perfLabel: 'PEI' },
    { tool: 'run', perfKey: 'competitive', perfLabel: 'Competitive Index' },
  ];

  for (const { tool, perfKey, perfLabel } of mappings) {
    const tg = toolGrades[tool];
    const perfRaw = composites[perfKey];
    if (tg == null || perfRaw == null) continue;

    const perfMapped = mapCompositeToToolScale(perfRaw);
    const delta = tg - perfMapped;
    const absDelta = Math.abs(delta);

    if (absDelta < 15) continue; // No significant gap

    const direction: 'tool_exceeds' | 'perf_exceeds' = delta > 0 ? 'tool_exceeds' : 'perf_exceeds';
    const prescriptionClass = direction === 'tool_exceeds' ? 'skill_transfer' : 'physical';
    const severity: 'high' | 'medium' = absDelta >= 20 ? 'high' : 'medium';

    const issue = direction === 'tool_exceeds'
      ? `${tool.charAt(0).toUpperCase() + tool.slice(1)} tool (${tg}) not translating to ${perfLabel} (${perfMapped})`
      : `${perfLabel} performance (${perfMapped}) exceeding ${tool} tool (${tg}) — ceiling risk`;

    const metricName = `tool_gap_${tool}_${prescriptionClass}`;

    patterns.push({
      category: 'tool_performance_gap',
      metric: metricName,
      value: absDelta,
      threshold: 15,
      severity,
      description: issue,
      data_points: {
        tool, tool_grade: tg, perf_output: perfMapped, perf_source: perfLabel,
        gap: delta, direction, prescription_class: prescriptionClass,
      },
    });
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { user_id, sport = "baseball" } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── FETCH ENGINE SETTINGS ──
    const { data: engineSettingsRows } = await supabase
      .from('engine_settings')
      .select('setting_key, setting_value');
    const engineSettings: Record<string, any> = {};
    (engineSettingsRows ?? []).forEach((r: any) => { engineSettings[r.setting_key] = r.setting_value; });
    const dataGateMinSessions = engineSettings.data_gate_min_sessions ?? 60;

    // ── FETCH ALL DATA SOURCES ──

    // 1. MPI scores
    const { data: mpiScores } = await supabase
      .from("mpi_scores")
      .select("adjusted_global_score, composite_bqi, composite_fqi, composite_pei, composite_competitive, composite_decision, calculation_date")
      .eq("user_id", user_id)
      .order("calculation_date", { ascending: false })
      .limit(30);

    // 2. Recent sessions (90 days) with micro data
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    const { data: sessions } = await supabase
      .from("performance_sessions")
      .select("id, session_type, session_date, player_grade, drill_blocks, micro_layer_data, coach_grade, composite_indexes, created_at")
      .eq("user_id", user_id)
      .gte("session_date", ninetyDaysAgo)
      .is("deleted_at", null)
      .order("session_date", { ascending: false });

    // 3. Vault readiness
    const { data: vaultData } = await supabase
      .from("vault_focus_quizzes")
      .select("sleep_quality, stress_level, pain_level, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(7);

    // 4. Daily logs
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const { data: dailyLogs } = await supabase
      .from("athlete_daily_log")
      .select("day_status, entry_date, cns_load_actual")
      .eq("user_id", user_id)
      .gte("entry_date", fourteenDaysAgo)
      .order("entry_date", { ascending: false });

    // 5. Settings
    const { data: settings } = await supabase
      .from("athlete_mpi_settings")
      .select("coach_validation_met, primary_coach_id, primary_batting_side, primary_throwing_hand, primary_position, date_of_birth, season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date")
      .eq("user_id", user_id)
      .maybeSingle();

    // ── SEASON PHASE RESOLUTION (drives recommendation filters) ──
    const seasonResolution = resolveSeasonPhase(settings ?? null);
    const seasonProfile = getSeasonProfile(seasonResolution.phase);
    console.log(`[hie-analyze] user=${user_id} phase=${seasonResolution.phase} source=${seasonResolution.source}`);

    // 6. Speed Lab data
    const { data: speedSessions } = await supabase
      .from("speed_sessions")
      .select("distances, steps_per_rep, rpe, session_date")
      .eq("user_id", user_id)
      .order("session_date", { ascending: false })
      .limit(10);

    // 7. Royal Timing data
    const { data: timingSessions } = await supabase
      .from("royal_timing_sessions")
      .select("timer_data, ai_analysis, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 8. Tex Vision data
    const { data: visionDrills } = await supabase
      .from("tex_vision_drill_results")
      .select("accuracy_percent, reaction_time_ms, drill_type, difficulty_level, completed_at")
      .eq("user_id", user_id)
      .order("completed_at", { ascending: false })
      .limit(20);

    // 9. Drill catalog for ID mapping
    const { data: drillCatalogRows } = await supabase
      .from("drills")
      .select("id, name");
    const drillCatalog = new Map<string, string>();
    (drillCatalogRows ?? []).forEach((d: any) => drillCatalog.set(d.name, d.id));

    // 10. Vault performance tests (tool grades for gap detection)
    const { data: vaultTests } = await supabase
      .from("vault_performance_tests")
      .select("tool_grades, test_date")
      .eq("user_id", user_id)
      .not("tool_grades", "is", null)
      .order("test_date", { ascending: false })
      .limit(1);
    const latestToolGrades = vaultTests?.[0]?.tool_grades as Record<string, number | null> | null;

    // 11. Existing prescriptions for adaptive loop
    const { data: existingPrescriptions } = await supabase
      .from('drill_prescriptions')
      .select('id, drill_name, weakness_area, pre_score, effectiveness_score, adherence_count, targeted_metric, weakness_metric, pre_weakness_value')
      .eq('user_id', user_id)
      .eq('resolved', false);

    // Build ineffective drills set and usage counts
    const ineffectiveDrills = new Set<string>();
    const drillUsageCounts: Record<string, number> = {};
    (existingPrescriptions ?? []).forEach((rx: any) => {
      drillUsageCounts[rx.drill_name] = (drillUsageCounts[rx.drill_name] ?? 0) + 1;
      if (rx.effectiveness_score != null && rx.effectiveness_score <= 0) {
        ineffectiveDrills.add(rx.drill_name);
      }
    });

    // ── COMPUTE DEVELOPMENT STATUS ──
    const scoreHistory = (mpiScores ?? []).map((s: any) => ({
      score: s.adjusted_global_score ?? 0, date: s.calculation_date,
    }));
    const { status: developmentStatus, trend7d, trend30d } = computeDevelopmentStatus(scoreHistory);

    // ── AGGREGATE MICRO DATA FROM ALL SESSIONS (with context) ──
    const allMicroReps: any[] = [];
    const allDrillBlocks: any[] = [];
    (sessions ?? []).forEach((s: any) => {
      const sessionType = s.session_type || 'personal_practice';
      if (Array.isArray(s.micro_layer_data)) {
        s.micro_layer_data.forEach((rep: any) => {
          allMicroReps.push({ ...rep, _session_type: sessionType });
        });
      }
      if (Array.isArray(s.drill_blocks)) allDrillBlocks.push(...s.drill_blocks);
    });

    // ── REAL MICRO-DATA ANALYSIS (ALL MODULES) ──
    const hittingPatterns = analyzeHittingMicro(allMicroReps, allDrillBlocks, settings?.primary_batting_side || 'R');
    const fieldingPatterns = analyzeFieldingMicro(allMicroReps, allDrillBlocks);
    const pitchingPatterns = analyzePitchingMicro(allMicroReps, allDrillBlocks);
    const speedPatterns = analyzeSpeedLabMicro(speedSessions ?? []);
    const timingPatterns = analyzeTimingMicro(timingSessions ?? []);
    const visionPatterns = analyzeVisionMicro(visionDrills ?? []);
    const baserunningPatterns = analyzeBaserunningMicro(allMicroReps, allDrillBlocks);

    // ── CONTEXT-AWARE PATTERNS ──
    const gamePracticePatterns = detectGamePracticeGap(allMicroReps);
    const fatiguePatterns = detectFatigueDropoff(sessions ?? []);

    // ── TOOL-PERFORMANCE GAP PATTERNS ──
    const latestMPIForGap = mpiScores?.[0];
    const toolGapPatterns = analyzeToolPerformanceGaps(latestToolGrades, {
      bqi: latestMPIForGap?.composite_bqi ?? undefined,
      fqi: latestMPIForGap?.composite_fqi ?? undefined,
      pei: latestMPIForGap?.composite_pei ?? undefined,
      decision: latestMPIForGap?.composite_decision ?? undefined,
      competitive: latestMPIForGap?.composite_competitive ?? undefined,
    });

    const allPatterns = [
      ...hittingPatterns, ...fieldingPatterns, ...pitchingPatterns,
      ...speedPatterns, ...timingPatterns, ...visionPatterns, ...baserunningPatterns,
      ...gamePracticePatterns, ...fatiguePatterns, ...toolGapPatterns,
    ].sort((a, b) => {
      const sevWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aGameBonus = a.data_points?.context === 'game_gap' ? 0.5 : 0;
      const aFatigueBonus = a.metric === 'fatigue_dropoff' ? 0.3 : 0;
      const aToolGapBonus = a.metric?.startsWith('tool_gap_') ? 0.4 : 0;
      const bGameBonus = b.data_points?.context === 'game_gap' ? 0.5 : 0;
      const bFatigueBonus = b.metric === 'fatigue_dropoff' ? 0.3 : 0;
      const bToolGapBonus = b.metric?.startsWith('tool_gap_') ? 0.4 : 0;
      const aScore = (sevWeight[a.severity] ?? 1) * (1 + aGameBonus + aFatigueBonus + aToolGapBonus);
      const bScore = (sevWeight[b.severity] ?? 1) * (1 + bGameBonus + bFatigueBonus + bToolGapBonus);
      return bScore - aScore;
    });

    // ── WRITE WEAKNESS SCORES ──
    const weaknessScoreRows = allPatterns.map(p => ({
      user_id, weakness_metric: p.metric, score: p.value, computed_at: new Date().toISOString(),
    }));
    if (weaknessScoreRows.length > 0) {
      // Deduplicate: remove previous weakness_scores for this athlete before inserting fresh ones
      const { data: delData, error: delErr, count: delCount } = await supabase
        .from('weakness_scores')
        .delete({ count: 'exact' })
        .eq('user_id', user_id);
      console.log(`weakness_scores cleanup: deleted=${delCount}, error=${delErr?.message ?? 'none'}`);
      const { error: insErr } = await supabase.from('weakness_scores').insert(weaknessScoreRows);
      if (insErr) console.warn('weakness_scores insert failed:', insErr.message);
    }

    // ── BUILD PRIMARY LIMITER ──
    let primaryLimiter: string;
    if (allPatterns.length > 0) {
      const top = allPatterns[0];
      primaryLimiter = top.description;
      if (top.zone_details) primaryLimiter += ` — ${top.zone_details}`;
    } else {
      const latestMPI = mpiScores?.[0];
      const composites: Record<string, number> = {
        "Batting Quality": latestMPI?.composite_bqi ?? 50,
        "Fielding Quality": latestMPI?.composite_fqi ?? 50,
        "Pitching Effectiveness": latestMPI?.composite_pei ?? 50,
        "Decision Making": latestMPI?.composite_decision ?? 50,
        "Competitive Execution": latestMPI?.composite_competitive ?? 50,
      };
      const sorted = Object.entries(composites).sort(([, a], [, b]) => a - b);
      primaryLimiter = `${sorted[0][0]} is your lowest area at ${Math.round(sorted[0][1])}`;
    }

    // ── WEAKNESS CLUSTERS ──
    const weaknessClusters: WeaknessCluster[] = allPatterns.slice(0, 3).map((p) => ({
      area: p.category,
      issue: p.description,
      why: p.zone_details || `${p.metric} at ${p.value}% exceeds threshold of ${p.threshold}%`,
      impact: p.severity,
      data_points: { metric: p.metric, value: p.value, threshold: p.threshold, category: p.category, ...(p.data_points || {}) },
    }));

    if (weaknessClusters.length === 0) {
      const latestMPI = mpiScores?.[0];
      const compositeList = [
        { key: "composite_bqi", label: "Batting Quality", val: latestMPI?.composite_bqi ?? 50 },
        { key: "composite_fqi", label: "Fielding Quality", val: latestMPI?.composite_fqi ?? 50 },
        { key: "composite_pei", label: "Pitching Effectiveness", val: latestMPI?.composite_pei ?? 50 },
        { key: "composite_decision", label: "Decision Making", val: latestMPI?.composite_decision ?? 50 },
        { key: "composite_competitive", label: "Competitive Execution", val: latestMPI?.composite_competitive ?? 50 },
      ].sort((a, b) => a.val - b.val);

      compositeList.slice(0, 3).forEach((c) => {
        weaknessClusters.push({
          area: c.key, issue: `${c.label} needs improvement`, why: `Score at ${Math.round(c.val)}/100`,
          impact: c.val < 35 ? "high" : c.val < 45 ? "medium" : "low",
          data_points: { score: Math.round(c.val) },
        });
      });
    }

    // ── READINESS (must be computed before prescription engine needs it) ──
    const { score: readinessScore, recommendation: readinessRecommendation } = computeReadiness(vaultData ?? []);

    // ── PRESCRIPTIVE ACTIONS (AI + scoring hybrid with fallback) ──
    const prescriptiveActions: PrescriptiveAction[] = [];
    const usedAreas = new Set<string>();

    // Attempt prescription-engine call
    let aiPrescriptions: any[] = [];
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const { data: drillCatalogFull } = await supabase.from("drills").select("id, name, module, skill_target, default_constraints");
      const athleteAge = settings?.date_of_birth
        ? Math.floor((Date.now() - new Date(settings.date_of_birth).getTime()) / (365.25 * 86400000))
        : 18;
      const { data: profileData } = await supabase.from("profiles").select("experience_level").eq("id", user_id).maybeSingle();

      const prescriptionInput = {
        user_id,
        patterns: allPatterns.slice(0, 10),
        weakness_scores: weaknessScoreRows.map(w => ({ metric: w.weakness_metric, value: w.score, prev_value: null })),
        recent_prescriptions: (existingPrescriptions ?? []).map((rx: any) => ({
          drill_name: rx.drill_name, weakness_area: rx.weakness_area,
          effectiveness_score: rx.effectiveness_score, adherence_count: rx.adherence_count ?? 0,
          targeted_metric: rx.targeted_metric ?? null,
        })),
        athlete_profile: {
          age: athleteAge,
          level: profileData?.experience_level || 'hs',
          batting_side: settings?.primary_batting_side || 'R',
          throwing_hand: settings?.primary_throwing_hand || 'R',
        },
        readiness_score: readinessScore,
        available_drills: (drillCatalogFull ?? []).map((d: any) => ({
          id: d.id, name: d.name, module: d.module, skill_target: d.skill_target || '', default_constraints: d.default_constraints || {},
        })),
      };

      const engineResp = await fetch(`${supabaseUrl}/functions/v1/prescription-engine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(prescriptionInput),
      });

      if (engineResp.ok) {
        const engineData = await engineResp.json();
        aiPrescriptions = engineData.prescriptions ?? [];
      } else {
        console.warn(`Prescription engine returned ${engineResp.status}, falling back to switch statement`);
      }
    } catch (engineErr: any) {
      console.error("Prescription engine call failed, using fallback:", engineErr.message);
    }

    // If AI prescriptions returned, use them; otherwise fall back to switch statement
    if (aiPrescriptions.length > 0) {
      // Group AI prescriptions by targeted_metric for prescriptive actions
      for (const aiRx of aiPrescriptions) {
        if (!usedAreas.has(aiRx.targeted_metric)) {
          usedAreas.add(aiRx.targeted_metric);
          prescriptiveActions.push({
            weakness_area: aiRx.rationale || aiRx.targeted_metric,
            drills: [{
              name: aiRx.name,
              description: aiRx.rationale,
              module: aiRx.module,
              constraints: JSON.stringify(aiRx.constraints),
              drill_type: aiRx.targeted_metric,
              drill_id: aiRx.drill_id,
            }],
          });
        }
      }
    } else {
      // Fallback: original switch-statement logic
      allPatterns.slice(0, 5).forEach((p) => {
        const drills = mapPatternToDrills(p, ineffectiveDrills, drillUsageCounts, drillCatalog);
        if (drills.length > 0 && !usedAreas.has(p.metric)) {
          usedAreas.add(p.metric);
          prescriptiveActions.push({ weakness_area: p.description, drills });
        }
      });
    }

    // ── READINESS (already computed above, before prescription engine) ──

    // ── RISK ALERTS ──
    const riskAlerts: RiskAlert[] = [];
    const heavyDays = (dailyLogs ?? []).filter((l: any) => ["full_training", "game_only"].includes(l.day_status));
    if (heavyDays.length >= 12) {
      riskAlerts.push({ type: "overtraining", severity: "warning", message: `${heavyDays.length} heavy days in last 14. Schedule recovery.` });
    }
    const recentGrades = (sessions ?? []).slice(0, 5).map((s: any) => s.player_grade).filter(Boolean);
    if (recentGrades.length >= 3) {
      const declining = recentGrades.every((g: number, i: number) => i === 0 || g <= recentGrades[i - 1]);
      if (declining && recentGrades[0] < recentGrades[recentGrades.length - 1]) {
        riskAlerts.push({ type: "decline", severity: "warning", message: "Performance declining across recent sessions" });
      }
    }
    if (developmentStatus === "stalled" && (sessions ?? []).length > 10) {
      riskAlerts.push({ type: "stagnation", severity: "info", message: "Progress has plateaued. Consider varying training approach." });
    }

    // ── DEVELOPMENT CONFIDENCE ──
    const sessionCount = (sessions ?? []).length;
    const lastSessionDate = sessions?.[0]?.session_date;
    const dataRecencyDays = lastSessionDate ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / 86400000) : 999;
    const developmentConfidence = computeConfidence(sessionCount, dataRecencyDays, settings?.coach_validation_met ?? false);

    // ── MODULE INTEGRATION: Speed Lab → Movement Efficiency ──
    let movementEfficiencyScore: number | null = null;
    if (speedSessions && speedSessions.length > 0) {
      const rpes = speedSessions.filter((s: any) => s.rpe != null).map((s: any) => s.rpe);
      const avgRpe = rpes.length > 0 ? rpes.reduce((a: number, b: number) => a + b, 0) / rpes.length : 5;
      let strideEfficiency = 70;
      const stepsData = speedSessions.filter((s: any) => s.steps_per_rep);
      if (stepsData.length > 0) {
        const allSteps: number[] = [];
        stepsData.forEach((s: any) => {
          if (typeof s.steps_per_rep === 'object') {
            Object.values(s.steps_per_rep).forEach((v: any) => { if (typeof v === 'number') allSteps.push(v); });
          }
        });
        if (allSteps.length > 0) {
          const avgSteps = allSteps.reduce((a, b) => a + b, 0) / allSteps.length;
          strideEfficiency = Math.min(100, Math.max(0, 100 - (avgSteps - 3) * 10));
        }
      }
      movementEfficiencyScore = Math.round(strideEfficiency * 0.6 + (10 - avgRpe) * 4);
      movementEfficiencyScore = Math.min(100, Math.max(0, movementEfficiencyScore));
    }

    // ── MODULE INTEGRATION: Royal Timing → Transfer Score ──
    let transferScore: number | null = null;
    if (timingSessions && timingSessions.length > 0) {
      const timerDataArr = timingSessions.filter((s: any) => s.timer_data).map((s: any) => s.timer_data);
      if (timerDataArr.length > 0) {
        const allTimes: number[] = [];
        timerDataArr.forEach((td: any) => {
          if (Array.isArray(td)) {
            td.forEach((t: any) => { if (typeof t === 'number') allTimes.push(t); });
          } else if (typeof td === 'object') {
            Object.values(td).forEach((v: any) => { if (typeof v === 'number') allTimes.push(v); });
          }
        });
        if (allTimes.length >= 2) {
          const mean = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
          const variance = allTimes.reduce((s, v) => s + (v - mean) ** 2, 0) / allTimes.length;
          const cv = Math.sqrt(variance) / Math.max(mean, 0.01);
          transferScore = Math.round(Math.min(100, Math.max(0, 100 - cv * 100)));
        }
      }
    }

    // ── MODULE INTEGRATION: Tex Vision → Decision Speed Index ──
    let decisionSpeedIndex: number | null = null;
    if (visionDrills && visionDrills.length > 0) {
      const reactionTimes = visionDrills.filter((d: any) => d.reaction_time_ms).map((d: any) => d.reaction_time_ms);
      const accuracies = visionDrills.filter((d: any) => d.accuracy_percent).map((d: any) => d.accuracy_percent);
      if (reactionTimes.length > 0 && accuracies.length > 0) {
        const avgReaction = reactionTimes.reduce((a: number, b: number) => a + b, 0) / reactionTimes.length;
        const avgAccuracy = accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length;
        const reactionScore = Math.min(100, Math.max(0, (500 - avgReaction) / 3));
        decisionSpeedIndex = Math.round(reactionScore * 0.5 + avgAccuracy * 0.5);
        decisionSpeedIndex = Math.min(100, Math.max(0, decisionSpeedIndex));
      }
    }

    // ── MPI SCORE ──
    const latestMPI = mpiScores?.[0];
    const mpiScore = latestMPI?.adjusted_global_score ?? null;

    // ── BEFORE/AFTER TRENDS ──
    const currentComposites: Record<string, number> = {
      composite_bqi: latestMPI?.composite_bqi ?? 50,
      composite_fqi: latestMPI?.composite_fqi ?? 50,
      composite_pei: latestMPI?.composite_pei ?? 50,
      composite_decision: latestMPI?.composite_decision ?? 50,
      composite_competitive: latestMPI?.composite_competitive ?? 50,
    };
    const beforeAfterTrends = computeBeforeAfterTrends(currentComposites, mpiScores ?? []);

    // ── DRILL EFFECTIVENESS ──
    const drillEffectiveness = await computeDrillEffectiveness(supabase, user_id);

    // ── SMART WEEK PLAN ──
    const smartWeekPlan = await generateSmartWeekPlan(
      weaknessClusters, readinessScore, readinessRecommendation, developmentStatus, sessionCount
    );

    // ── SAVE PRESCRIPTIONS FOR ADAPTIVE LEARNING ──
    if (prescriptiveActions.length > 0) {
      const newPrescriptions = prescriptiveActions.flatMap(action =>
        action.drills.map(drill => {
          const matchingPattern = allPatterns.find(p => p.description === action.weakness_area);
          const targetedMetric = matchingPattern?.metric || drill.drill_type || action.weakness_area;
          const weaknessVal = weaknessScoreRows.find(w => w.weakness_metric === targetedMetric)?.score ?? null;
          // Parse constraints_json from structured constraints or text
          let constraintsJson: any = {};
          try {
            if (typeof drill.constraints === 'string' && drill.constraints.startsWith('{')) {
              constraintsJson = JSON.parse(drill.constraints);
            }
          } catch { /* leave as empty */ }
          return {
            user_id,
            weakness_area: action.weakness_area,
            drill_name: drill.name,
            module: drill.module,
            constraints: typeof drill.constraints === 'string' ? drill.constraints : JSON.stringify(drill.constraints),
            constraints_json: constraintsJson,
            pre_score: mpiScore,
            targeted_metric: targetedMetric,
            pre_weakness_value: weaknessVal,
            drill_id: drill.drill_id || drillCatalog.get(drill.name) || null,
          };
        })
      );
      // Update post_score on existing unresolved prescriptions using weakness-specific scores
      if (existingPrescriptions && existingPrescriptions.length > 0) {
      for (const ex of existingPrescriptions) {
          // Auto-repair stale targeted_metric that doesn't match any current weakness_score
          let exMetric = (ex as any).targeted_metric || (ex as any).weakness_metric;
          if (exMetric && !weaknessScoreRows.find(w => w.weakness_metric === exMetric)) {
            const matchingPattern = allPatterns.find(p => p.description === (ex as any).weakness_area);
            if (matchingPattern) {
              exMetric = matchingPattern.metric;
              await supabase.from('drill_prescriptions').update({ targeted_metric: exMetric }).eq('id', ex.id);
            }
          }
          // Direction map: metrics where higher value = worse performance
          const HIGHER_IS_WORSE = new Set([
            'slow_reaction_time', 'fatigue_dropoff', 'chase_rate_high',
            'practice_game_gap',
          ]);
          let effectivenessScore: number | null = null;
          let postWeaknessValue: number | null = null;
          if (exMetric) {
            const currentWS = weaknessScoreRows.find(w => w.weakness_metric === exMetric);
            const preVal = (ex as any).pre_weakness_value ?? (ex as any).pre_score;
            if (currentWS) {
              postWeaknessValue = currentWS.score;
              if (preVal != null) {
                const higherIsWorse = HIGHER_IS_WORSE.has(exMetric) || exMetric.startsWith('tool_gap_');
                effectivenessScore = higherIsWorse
                  ? preVal - currentWS.score   // lower score = improvement = positive
                  : currentWS.score - preVal;  // higher score = improvement = positive
              }
            } else if (preVal != null) {
              // Pattern resolved — no longer detected = max improvement
              postWeaknessValue = 0;
              effectivenessScore = preVal;
            }
          }
          // Fall back to MPI-level if no weakness-specific data
          if (effectivenessScore == null && mpiScore != null && ex.pre_score != null) {
            effectivenessScore = mpiScore - ex.pre_score;
          }

          await supabase.from('drill_prescriptions')
            .update({
              post_score: mpiScore,
              post_weakness_value: postWeaknessValue,
              effectiveness_score: effectivenessScore,
              adherence_count: (ex.adherence_count ?? 0) + 1,
            })
            .eq('id', ex.id);
        }
        // Resolve prescriptions that have been tracked 5+ times
        const resolvedIds = existingPrescriptions
          .filter((ex: any) => (ex.adherence_count ?? 0) >= 4)
          .map((ex: any) => ex.id);
        if (resolvedIds.length > 0) {
          await supabase.from('drill_prescriptions')
            .update({ resolved: true })
            .in('id', resolvedIds);
        }
      }
      // ── PRESCRIPTION UPSERT BY targeted_metric ──
      // Ensures exactly 1 active prescription per targeted_metric per athlete
      for (const np of newPrescriptions) {
        // Validate required fields before write
        if (!np.targeted_metric || !np.drill_name || !np.user_id) {
          console.error('Skipping malformed prescription:', JSON.stringify({
            targeted_metric: np.targeted_metric, drill_name: np.drill_name, user_id: np.user_id,
          }));
          continue;
        }
        try {
          const existingMatch = (existingPrescriptions ?? []).find(
            (e: any) => e.targeted_metric === np.targeted_metric && !e.resolved
          );
          if (existingMatch) {
            // Update existing prescription with latest drill data
            await supabase.from('drill_prescriptions').update({
              drill_name: np.drill_name,
              module: np.module,
              constraints: np.constraints,
              constraints_json: np.constraints_json,
              drill_id: np.drill_id,
              weakness_area: np.weakness_area,
              pre_weakness_value: np.pre_weakness_value,
              pre_score: np.pre_score,
              updated_at: new Date().toISOString(),
            }).eq('id', existingMatch.id);
          } else {
            await supabase.from('drill_prescriptions').insert(np);
          }
        } catch (insertErr: any) {
          console.error(`Prescription save failed for metric=${np.targeted_metric}:`, insertErr.message);
        }
      }
    }

    // ── PHASE-AWARE FILTER on prescriptive actions ──
    // In-season / post-season: suppress aggressive "tool development" / mechanical-overhaul
    // recommendations. We keep refinement & maintenance drills.
    const OVERHAUL_KEYWORDS = ['rebuild', 'overhaul', 'rework', 'new mechanic', 'mechanical change'];
    const isRestrictivePhase = seasonResolution.phase === 'in_season' || seasonResolution.phase === 'post_season';
    const filteredPrescriptiveActions = isRestrictivePhase
      ? prescriptiveActions
          .map(a => ({
            ...a,
            drills: a.drills.filter(d => {
              const text = `${d.name} ${d.description} ${d.constraints}`.toLowerCase();
              return !OVERHAUL_KEYWORDS.some(k => text.includes(k));
            }),
          }))
          .filter(a => a.drills.length > 0)
      : prescriptiveActions;

    const phaseRiskAlerts: RiskAlert[] = [];
    if (seasonResolution.phase === 'in_season') {
      phaseRiskAlerts.push({
        type: 'season_phase',
        severity: 'info',
        message: `In-Season: protecting performance — refinement only, no mechanical overhauls.`,
      });
    } else if (seasonResolution.phase === 'post_season') {
      phaseRiskAlerts.push({
        type: 'season_phase',
        severity: 'info',
        message: `Post-Season: prioritize recovery and mobility before any rebuild work.`,
      });
    }

    // ── UPSERT SNAPSHOT ──
    const snapshot = {
      user_id,
      sport,
      computed_at: new Date().toISOString(),
      development_status: developmentStatus,
      primary_limiter: primaryLimiter,
      weakness_clusters: weaknessClusters,
      prescriptive_actions: filteredPrescriptiveActions,
      readiness_score: readinessScore,
      readiness_recommendation: readinessRecommendation,
      risk_alerts: [...phaseRiskAlerts, ...riskAlerts],
      development_confidence: developmentConfidence,
      smart_week_plan: smartWeekPlan,
      before_after_trends: beforeAfterTrends,
      drill_effectiveness: drillEffectiveness,
      mpi_score: mpiScore,
      mpi_trend_7d: trend7d,
      mpi_trend_30d: trend30d,
      transfer_score: transferScore,
      decision_speed_index: decisionSpeedIndex,
      movement_efficiency_score: movementEfficiencyScore,
      season_phase: seasonResolution.phase,
      season_phase_source: seasonResolution.source,
      season_phase_label: seasonProfile.label,
    };

    const { error: upsertError } = await supabase
      .from("hie_snapshots")
      .upsert(snapshot, { onConflict: "user_id,sport" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify(snapshot), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("HIE analyze error:", err);
    // Log failure to audit_log
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);
      const body2 = await req.clone().json().catch(() => ({}));
      await supabase.from('audit_log').insert({
        user_id: body2.user_id || '00000000-0000-0000-0000-000000000000',
        action: 'hie_analyze_failure',
        table_name: 'hie_snapshots',
        metadata: { error: err.message, sport: body2.sport || 'unknown' },
      });
    } catch (_) { /* best-effort logging */ }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
