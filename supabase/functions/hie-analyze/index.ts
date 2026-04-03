import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
}

// ═══════════════════════════════════════════════════════════════
// MICRO-DATA ANALYSIS ENGINE (replaces static LIMITER_MAP)
// ═══════════════════════════════════════════════════════════════

function analyzeHittingMicro(microReps: any[], drillBlocks: any[]): MicroPattern[] {
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
    // Identify worst chase zones
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
    r.contact_quality === 'miss' || r.swing_result === 'miss' || r.contact_type === 'swing_miss'
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
      const bucket = loc.col < midCol ? 'inside' : loc.col > midCol ? 'outside' : null;
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

  // Clean field %
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

  // Exchange time
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

  // Footwork grade
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

  // Throw accuracy
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

  // Zone %
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

  // Command grade by pitch type
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

  // Miss direction patterns
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
// PRESCRIPTIVE DRILL MAPPING (dynamic, data-driven)
// ═══════════════════════════════════════════════════════════════

function mapPatternToDrills(pattern: MicroPattern): PrescriptiveDrill[] {
  const drills: PrescriptiveDrill[] = [];

  switch (pattern.metric) {
    case "chase_rate":
    case "block_chase_rate":
      drills.push(
        { name: "Go/No-Go Recognition", description: "Decision-only tracking — identify pitches without swinging", module: "tex-vision", constraints: "0.35s window, 40 pitches", drill_type: "recognition" },
        { name: "Zone Awareness Tracking", description: "Call ball/strike before pitch crosses plate", module: "practice-hub", constraints: "30 pitches, verbal call only", drill_type: "pitch_recognition" },
      );
      break;
    case "whiff_rate":
      drills.push(
        { name: "Tee Work: Barrel Precision", description: "Center-mass contact focus with intent", module: "practice-hub", constraints: `3 sets × 15 reps, 80% intent`, drill_type: "tee_work" },
        { name: "Short Toss: Contact Focus", description: "Shortened swing to maximize barrel contact", module: "practice-hub", constraints: "20 reps, contact priority", drill_type: "soft_toss" },
      );
      break;
    case "velocity_weakness":
      drills.push(
        { name: "High Velocity Machine BP", description: `Train against elevated velocity to close timing gap`, module: "practice-hub", constraints: `Set machine to ${pattern.description.includes('80+') ? '82-85' : '75-80'} mph, 25 reps`, drill_type: "machine_bp" },
        { name: "Quick Hands Drill", description: "Accelerated bat speed through the zone", module: "practice-hub", constraints: "Overload bat → game bat, 15 reps each", drill_type: "bat_speed" },
      );
      break;
    case "inside_weakness":
      drills.push(
        { name: "Inside Pitch Tee Work", description: "Set tee on inside corner, drive pull-side", module: "practice-hub", constraints: "20 reps, pull focus, 90% intent", drill_type: "tee_work" },
        { name: "Front Toss Inside", description: "Quick hands inside, stay through the ball", module: "practice-hub", constraints: "15 reps from 15ft", drill_type: "front_toss" },
      );
      break;
    case "outside_weakness":
      drills.push(
        { name: "Opposite Field Soft Toss", description: "Late barrel path, plate coverage", module: "practice-hub", constraints: "20 reps, oppo-field only", drill_type: "soft_toss" },
        { name: "Two-Strike Approach", description: "Widen zone, shorten swing, use whole field", module: "practice-hub", constraints: "10 ABs, 2-strike count", drill_type: "situational" },
      );
      break;
    case "up_weakness":
    case "down_weakness":
      drills.push(
        { name: `${pattern.metric === 'up_weakness' ? 'High' : 'Low'} Pitch Tee Work`, description: `Set tee ${pattern.metric === 'up_weakness' ? 'chest high' : 'at knees'} and drive`, module: "practice-hub", constraints: "20 reps, level swing", drill_type: "tee_work" },
      );
      break;
    case "pitch_type_decision":
      const pitchType = pattern.description.match(/vs (\w+)/)?.[1] || "off-speed";
      drills.push(
        { name: `${pitchType} Recognition Drill`, description: `Identify ${pitchType} out of hand — no swing`, module: "tex-vision", constraints: "0.4s window, 30 pitches", drill_type: "recognition" },
        { name: "Pitch Tunneling Awareness", description: "Differentiate fastball vs breaking ball from same tunnel", module: "tex-vision", constraints: "3 min, chaos mode", drill_type: "vision" },
      );
      break;
    case "clean_field_pct":
      drills.push(
        { name: "Ground Ball Funnel", description: "Rapid ground ball reps with clean transfer", module: "practice-hub", constraints: "25 reps, clean field focus", drill_type: "fielding" },
        { name: "Bare Hand Drill", description: "Soft hands and clean exchange", module: "practice-hub", constraints: "15 reps, timed", drill_type: "fielding" },
      );
      break;
    case "slow_exchange":
      drills.push(
        { name: "Quick Exchange Drill", description: "Glove-to-throw in under 1.2s", module: "practice-hub", constraints: "20 reps, timed exchange", drill_type: "fielding" },
      );
      break;
    case "footwork_grade":
      drills.push(
        { name: "Footwork Pattern Drill", description: "Crossover, drop step, and approach angles", module: "practice-hub", constraints: "15 reps each pattern", drill_type: "fielding" },
      );
      break;
    case "throw_accuracy":
      drills.push(
        { name: "Target Throwing", description: "Hit specific target zones from game distances", module: "practice-hub", constraints: "20 throws, log accuracy", drill_type: "throwing" },
      );
      break;
    case "zone_pct":
      drills.push(
        { name: "Bullpen: Command Focus", description: "Hit specific quadrants with each pitch type", module: "practice-hub", constraints: "40 pitches, track zone %", drill_type: "bullpen" },
      );
      break;
    case "miss_direction":
      const dir = pattern.description.match(/go (\w+)/)?.[1] || "away";
      drills.push(
        { name: `${dir.charAt(0).toUpperCase() + dir.slice(1)} Correction Drill`, description: `Mechanical focus to correct ${dir} miss tendency`, module: "practice-hub", constraints: "30 pitches, intent on opposite correction", drill_type: "bullpen" },
      );
      break;
    default:
      if (pattern.category === "pitching") {
        drills.push(
          { name: "Command Bullpen", description: "Focus on locating all pitch types", module: "practice-hub", constraints: "40 pitches, chart location", drill_type: "bullpen" },
        );
      }
      break;
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

function computeReadiness(vaultData: any[]): { score: number; recommendation: string } {
  if (!vaultData || vaultData.length === 0) return { score: 70, recommendation: "No readiness data — train at moderate intensity" };
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
// BEFORE/AFTER TRENDS (real computation)
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
// DRILL EFFECTIVENESS (real tracking)
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
    // Extract JSON array from response
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
      .select("coach_validation_met, primary_coach_id")
      .eq("user_id", user_id)
      .maybeSingle();

    // 6. Speed Lab data (NOW CONNECTED)
    const { data: speedSessions } = await supabase
      .from("speed_sessions")
      .select("distances, steps_per_rep, rpe, session_date")
      .eq("user_id", user_id)
      .order("session_date", { ascending: false })
      .limit(10);

    // 7. Royal Timing data (NOW CONNECTED)
    const { data: timingSessions } = await supabase
      .from("royal_timing_sessions")
      .select("timer_data, ai_analysis, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    // 8. Tex Vision data (NOW CONNECTED)
    const { data: visionDrills } = await supabase
      .from("tex_vision_drill_results")
      .select("accuracy_percent, reaction_time_ms, drill_type, difficulty_level, completed_at")
      .eq("user_id", user_id)
      .order("completed_at", { ascending: false })
      .limit(20);

    // ── COMPUTE DEVELOPMENT STATUS ──
    const scoreHistory = (mpiScores ?? []).map((s: any) => ({
      score: s.adjusted_global_score ?? 0, date: s.calculation_date,
    }));
    const { status: developmentStatus, trend7d, trend30d } = computeDevelopmentStatus(scoreHistory);

    // ── AGGREGATE MICRO DATA FROM ALL SESSIONS ──
    const allMicroReps: any[] = [];
    const allDrillBlocks: any[] = [];
    (sessions ?? []).forEach((s: any) => {
      if (Array.isArray(s.micro_layer_data)) allMicroReps.push(...s.micro_layer_data);
      if (Array.isArray(s.drill_blocks)) allDrillBlocks.push(...s.drill_blocks);
    });

    // ── REAL MICRO-DATA ANALYSIS ──
    const hittingPatterns = analyzeHittingMicro(allMicroReps, allDrillBlocks);
    const fieldingPatterns = analyzeFieldingMicro(allMicroReps, allDrillBlocks);
    const pitchingPatterns = analyzePitchingMicro(allMicroReps, allDrillBlocks);
    const allPatterns = [...hittingPatterns, ...fieldingPatterns, ...pitchingPatterns]
      .sort((a, b) => {
        const sevOrder = { high: 0, medium: 1, low: 2 };
        return (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
      });

    // ── BUILD PRIMARY LIMITER (specific, not generic) ──
    let primaryLimiter: string;
    if (allPatterns.length > 0) {
      const top = allPatterns[0];
      primaryLimiter = top.description;
      if (top.zone_details) primaryLimiter += ` — ${top.zone_details}`;
    } else {
      // Fallback to composite comparison
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

    // ── WEAKNESS CLUSTERS (data-backed) ──
    const weaknessClusters: WeaknessCluster[] = allPatterns.slice(0, 3).map((p) => ({
      area: p.category,
      issue: p.description,
      why: p.zone_details || `${p.metric} at ${p.value}% exceeds threshold of ${p.threshold}%`,
      impact: p.severity,
      data_points: { metric: p.metric, value: p.value, threshold: p.threshold, category: p.category },
    }));

    // If no micro patterns, fall back to composite-based clusters
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

    // ── PRESCRIPTIVE ACTIONS (dynamic, pattern-based) ──
    const prescriptiveActions: PrescriptiveAction[] = [];
    const usedAreas = new Set<string>();
    allPatterns.slice(0, 5).forEach((p) => {
      const drills = mapPatternToDrills(p);
      if (drills.length > 0 && !usedAreas.has(p.metric)) {
        usedAreas.add(p.metric);
        prescriptiveActions.push({ weakness_area: p.description, drills });
      }
    });

    // ── READINESS ──
    const { score: readinessScore, recommendation: readinessRecommendation } = computeReadiness(vaultData ?? []);

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
      // Compute from distances data and steps_per_rep
      let strideEfficiency = 70;
      const stepsData = speedSessions.filter((s: any) => s.steps_per_rep);
      if (stepsData.length > 0) {
        // Lower steps per rep = better efficiency
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
        // Extract timing consistency from timer_data
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
          // Lower CV = more consistent = higher score
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
        // Fast reaction (< 350ms) + high accuracy = high score
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

    // ── SMART WEEK PLAN (AI-generated) ──
    const smartWeekPlan = await generateSmartWeekPlan(
      weaknessClusters, readinessScore, readinessRecommendation, developmentStatus, sessionCount
    );

    // ── SAVE PRESCRIPTIONS FOR ADAPTIVE LEARNING ──
    if (prescriptiveActions.length > 0) {
      const newPrescriptions = prescriptiveActions.flatMap(action =>
        action.drills.map(drill => ({
          user_id,
          weakness_area: action.weakness_area,
          drill_name: drill.name,
          module: drill.module,
          constraints: drill.constraints,
          pre_score: mpiScore,
        }))
      );
      // Update post_score on existing unresolved prescriptions
      const { data: existing } = await supabase
        .from('drill_prescriptions')
        .select('id, weakness_area, pre_score')
        .eq('user_id', user_id)
        .eq('resolved', false);
      if (existing && existing.length > 0) {
        for (const ex of existing) {
          await supabase.from('drill_prescriptions')
            .update({ post_score: mpiScore, effectiveness_score: mpiScore != null && ex.pre_score != null ? mpiScore - ex.pre_score : null })
            .eq('id', ex.id);
        }
      }
      // Insert new prescriptions (only if area is new)
      const existingAreas = new Set((existing ?? []).map((e: any) => e.weakness_area));
      const truly_new = newPrescriptions.filter(p => !existingAreas.has(p.weakness_area));
      if (truly_new.length > 0) {
        await supabase.from('drill_prescriptions').insert(truly_new);
      }
    }

    // ── UPSERT SNAPSHOT ──
    const snapshot = {
      user_id,
      sport,
      computed_at: new Date().toISOString(),
      development_status: developmentStatus,
      primary_limiter: primaryLimiter,
      weakness_clusters: weaknessClusters,
      prescriptive_actions: prescriptiveActions,
      readiness_score: readinessScore,
      readiness_recommendation: readinessRecommendation,
      risk_alerts: riskAlerts,
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
