// Lightweight sims for all generic demo modules.
// Each returns a benchmark + diagramProps the GenericModuleDemo can render.
import { rng, seedFromString, between } from './simEngine';

export type Severity = 'minor' | 'moderate' | 'critical';
export interface GenericBenchmark {
  yourLabel: string;
  yourValue: string;
  eliteLabel: string;
  eliteValue: string;
  gapLabel: string;
  gapValue: string;
  projected: string;
  whyItMatters: string;
  yourNumeric: number;
  eliteNumeric: number;
  projectedNumeric: number;
  unit: string;
  decimals?: number;
  severity: Severity;
  gap: number;
}

export interface GenericResult {
  benchmark: GenericBenchmark;
  stats: { label: string; value: number; unit?: string; decimals?: number }[];
  diagramProps: any;
  headline?: string;
}

const sev = (gapPct: number): Severity => gapPct >= 35 ? 'critical' : gapPct >= 15 ? 'moderate' : 'minor';

const PITCH_COLORS: Record<string, string> = {
  fastball: 'hsl(var(--destructive))',
  curveball: 'hsl(217 90% 60%)',
  changeup: 'hsl(38 92% 55%)',
  slider: 'hsl(280 70% 60%)',
  cutter: 'hsl(160 70% 50%)',
  sinker: 'hsl(20 85% 55%)',
};

export const genericSims: Record<string, (state: Record<string, any>, userId: string | null) => GenericResult> = {

  'pitching-analysis': (s, uid) => {
    const r = rng(seedFromString(`pa:${s.pitch}:${s.intent}:${uid ?? 'a'}`));
    const velo = Math.round(78 + (s.pitch === 'fastball' ? 6 : s.pitch === 'cutter' ? 3 : 0) + between(r, 0, 6));
    const eliteVelo = s.pitch === 'fastball' ? 92 : s.pitch === 'cutter' ? 88 : 82;
    const command = Math.round(58 + between(r, 0, 30));
    const gap = Math.max(0, eliteVelo - velo);
    const gapPct = (gap / eliteVelo) * 100;
    return {
      benchmark: {
        yourLabel: 'Your velo', yourValue: `${velo} mph`,
        eliteLabel: 'Elite', eliteValue: `${eliteVelo} mph`,
        gapLabel: 'Gap', gapValue: `${gap} mph`,
        projected: `+${Math.min(gap, 5)} mph in 8 weeks with sequencing fixes`,
        whyItMatters: `Each 1 mph adds ~0.4 inches of perceived rise. Your ${gap} mph gap drops your whiff rate by ~${gap * 4}%.`,
        yourNumeric: velo, eliteNumeric: eliteVelo, projectedNumeric: velo + Math.min(gap, 5),
        unit: 'mph', severity: sev(gapPct), gap,
      },
      stats: [
        { label: 'Velo', value: velo, unit: 'mph' },
        { label: 'Command', value: command, unit: '%' },
        { label: 'Spin Eff', value: 78 + Math.round(between(r, 0, 18)), unit: '%' },
      ],
      diagramProps: {
        pitches: [
          { id: 'fb', color: PITCH_COLORS.fastball, endX: 100, endY: 92, bend: -2, label: 'FB' },
          { id: 'cb', color: PITCH_COLORS.curveball, endX: 130, endY: 115, bend: 18, label: 'CB' },
          { id: 'ch', color: PITCH_COLORS.changeup, endX: 95, endY: 110, bend: -8, label: 'CH' },
          { id: 'sl', color: PITCH_COLORS.slider, endX: 132, endY: 100, bend: 12, label: 'SL' },
        ],
        highlightId: { fastball: 'fb', curveball: 'cb', changeup: 'ch', slider: 'sl' }[s.pitch as string] ?? 'fb',
      },
    };
  },

  'throwing-analysis': (s, uid) => {
    const r = rng(seedFromString(`ta:${s.position}:${s.slot}:${uid ?? 'a'}`));
    const popPos: Record<string, number> = { catcher: 2.05, infield: 1.42, outfield: 0 };
    const yours = popPos[s.position] ? +(popPos[s.position] + between(r, 0.05, 0.35)).toFixed(2) : +(between(r, 1.55, 2.05)).toFixed(2);
    const elite = s.position === 'catcher' ? 1.95 : s.position === 'infield' ? 1.32 : 1.65;
    const gap = Math.max(0, +(yours - elite).toFixed(2));
    const gapPct = (gap / elite) * 100;
    return {
      benchmark: {
        yourLabel: 'Your time', yourValue: `${yours.toFixed(2)}s`,
        eliteLabel: 'Elite', eliteValue: `${elite.toFixed(2)}s`,
        gapLabel: 'Gap', gapValue: `+${gap.toFixed(2)}s`,
        projected: `−${Math.min(gap, 0.2).toFixed(2)}s in 6 weeks`,
        whyItMatters: `${gap.toFixed(2)}s of arm-time = ~${Math.round(gap * 27)} ft of base advance. That's the difference between a steal and an out.`,
        yourNumeric: yours, eliteNumeric: elite, projectedNumeric: Math.max(elite, yours - 0.2),
        unit: 's', decimals: 2, severity: sev(gapPct * 4), gap,
      },
      stats: [
        { label: 'Pop time', value: yours, unit: 's', decimals: 2 },
        { label: 'Accuracy', value: 65 + Math.round(between(r, 0, 25)), unit: '%' },
        { label: 'Carry', value: 180 + Math.round(between(r, 0, 80)), unit: 'ft' },
      ],
      diagramProps: { yourSec: yours, eliteSec: elite, distanceLabel: `${s.position} release` },
    };
  },

  'pickoff-trainer': (s, uid) => {
    const r = rng(seedFromString(`po:${s.lead}:${s.move}:${uid ?? 'a'}`));
    const success = Math.round(40 + (s.move === 'spin' ? 18 : s.move === 'jump' ? 10 : 0) + (s.lead === 'big' ? 12 : 0) + between(r, 0, 18));
    const elite = 78;
    const gap = Math.max(0, elite - success);
    return {
      benchmark: {
        yourLabel: 'Pick %', yourValue: `${success}%`,
        eliteLabel: 'Elite', eliteValue: `${elite}%`,
        gapLabel: 'Gap', gapValue: `${gap} pts`,
        projected: `+${Math.min(gap, 18)} pts in 4 weeks of randomized signals`,
        whyItMatters: `Predictable pickoff timing tips off elite baserunners. Randomized signals cut steals by ~${Math.min(40, gap + 10)}%.`,
        yourNumeric: success, eliteNumeric: elite, projectedNumeric: Math.min(elite, success + 18),
        unit: '%', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Success', value: success, unit: '%' },
        { label: 'Tag time', value: +(1.2 - between(r, 0, 0.2)).toFixed(2), unit: 's', decimals: 2 },
        { label: 'Deception', value: 50 + Math.round(between(r, 0, 35)), unit: '/100' },
      ],
      diagramProps: { value: success, label: 'PICK %' },
      headline: 'Randomized signal sequence',
    };
  },

  'pitch-design': (s, uid) => {
    const r = rng(seedFromString(`pd:${s.pitch}:${s.grip}:${uid ?? 'a'}`));
    const whiff = Math.round(22 + (s.grip === 'spike' ? 10 : s.grip === 'split' ? 8 : 0) + between(r, 0, 15));
    const elite = 42;
    const gap = Math.max(0, elite - whiff);
    return {
      benchmark: {
        yourLabel: 'Your whiff%', yourValue: `${whiff}%`,
        eliteLabel: 'Elite', eliteValue: `${elite}%`,
        gapLabel: 'Gap', gapValue: `${gap} pts`,
        projected: `+${Math.min(gap, 12)} pts whiff with grip + axis tweak`,
        whyItMatters: `A 5pt whiff% bump converts ~${gap * 1.4 | 0} swings into outs over 100 PA. That's a starter's career-defining number.`,
        yourNumeric: whiff, eliteNumeric: elite, projectedNumeric: Math.min(elite, whiff + 12),
        unit: '%', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Whiff', value: whiff, unit: '%' },
        { label: 'Spin axis', value: 1 + Math.round(between(r, 0, 11)), unit: 'o\'clock' },
        { label: 'Break', value: 4 + Math.round(between(r, 0, 8)), unit: 'in' },
      ],
      diagramProps: {
        pitches: [
          { id: 'a', color: 'hsl(var(--muted-foreground))', endX: 120, endY: 95, bend: 0, label: 'Std' },
          { id: 'b', color: 'hsl(var(--primary))', endX: 130, endY: 110, bend: 14, label: 'New' },
        ],
        highlightId: 'b',
      },
    };
  },

  'command-grid': (s, uid) => {
    const r = rng(seedFromString(`cg:${s.zone}:${s.count}:${uid ?? 'a'}`));
    const intent = Number(s.zone);
    const accuracy = Math.round(48 + (s.count === 'ahead' ? 14 : 0) + between(r, 0, 22));
    const hits: number[] = [];
    for (let i = 0; i < 6; i++) {
      const drift = Math.round(between(r, -2, 2));
      const cell = Math.max(0, Math.min(24, intent + drift));
      if (!hits.includes(cell)) hits.push(cell);
    }
    const elite = 78;
    const gap = Math.max(0, elite - accuracy);
    return {
      benchmark: {
        yourLabel: 'Hit zone%', yourValue: `${accuracy}%`,
        eliteLabel: 'Elite', eliteValue: `${elite}%`,
        gapLabel: 'Gap', gapValue: `${gap} pts`,
        projected: `+${Math.min(gap, 18)} pts with grid-pattern reps`,
        whyItMatters: `Missing your spot by 1 cell = ~0.150 OPS jump for the hitter. Command pays compounding interest.`,
        yourNumeric: accuracy, eliteNumeric: elite, projectedNumeric: Math.min(elite, accuracy + 18),
        unit: '%', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Accuracy', value: accuracy, unit: '%' },
        { label: 'Hits', value: hits.length, unit: '/6' },
        { label: 'Drift', value: 1 + Math.round(between(r, 0, 2)), unit: 'cells' },
      ],
      diagramProps: { intent, actual: hits },
    };
  },

  'royal-timing': (s, uid) => {
    const r = rng(seedFromString(`rt:${s.tempo}:${uid ?? 'a'}`));
    const balance = Math.round((s.tempo === 'medium' ? 78 : s.tempo === 'slow' ? 65 : 60) + between(r, 0, 18));
    const variance = +(0.18 - (balance / 100) * 0.12 + between(r, 0, 0.05)).toFixed(2);
    const elite = 90;
    const gap = Math.max(0, elite - balance);
    return {
      benchmark: {
        yourLabel: 'Balance', yourValue: `${balance}`,
        eliteLabel: 'Elite', eliteValue: `${elite}`,
        gapLabel: 'Gap', gapValue: `${gap}`,
        projected: `+${Math.min(gap, 14)} balance points with tempo metronome reps`,
        whyItMatters: `Timing variance over 0.10s breaks pitch tunneling. You're at ${variance.toFixed(2)}s — elite is < 0.06s.`,
        yourNumeric: balance, eliteNumeric: elite, projectedNumeric: Math.min(elite, balance + 14),
        unit: '/100', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Balance', value: balance, unit: '/100' },
        { label: 'Variance', value: variance, unit: 's', decimals: 2 },
        { label: 'Tempo lock', value: 60 + Math.round(between(r, 0, 30)), unit: '%' },
      ],
      diagramProps: { value: balance, label: 'BALANCE' },
    };
  },

  'bullpen-planner': (s, uid) => {
    const r = rng(seedFromString(`bp:${s.intensity}:${uid ?? 'a'}`));
    const totalPitches = s.intensity === 'recovery' ? 25 : s.intensity === 'tune' ? 40 : 65;
    const fb = Math.round(totalPitches * 0.55);
    const off = totalPitches - fb;
    return {
      benchmark: {
        yourLabel: 'Pitch count', yourValue: `${totalPitches}`,
        eliteLabel: 'Optimal', eliteValue: `${s.intensity === 'recovery' ? 25 : 50}`,
        gapLabel: 'Variance', gapValue: `±${Math.abs(totalPitches - 50)}`,
        projected: `Tunneling overlap improves ${10 + Math.round(between(r, 0, 15))}% with planned mix`,
        whyItMatters: `Random bullpens leave you flat. Periodized counts protect your arm and sharpen command on game day.`,
        yourNumeric: totalPitches, eliteNumeric: 50, projectedNumeric: 50,
        unit: 'pitches', severity: 'moderate', gap: Math.abs(totalPitches - 50),
      },
      stats: [
        { label: 'Total', value: totalPitches },
        { label: 'Fastballs', value: fb },
        { label: 'Offspeed', value: off },
      ],
      diagramProps: {
        pitches: [
          { id: 'fb', color: PITCH_COLORS.fastball, endX: 105, endY: 95, bend: -2, label: `FB ${fb}` },
          { id: 'sl', color: PITCH_COLORS.slider, endX: 130, endY: 110, bend: 14, label: `SL ${Math.round(off / 2)}` },
          { id: 'ch', color: PITCH_COLORS.changeup, endX: 95, endY: 115, bend: -10, label: `CH ${Math.round(off / 2)}` },
        ],
        highlightId: 'fb',
      },
    };
  },

  'speed-lab': (s, uid) => {
    const r = rng(seedFromString(`sl:${s.distance}:${s.experience}:${uid ?? 'a'}`));
    const baseElite: Record<string, number> = { '10': 1.62, '30': 3.85, '60': 6.65 };
    const elite = baseElite[String(s.distance)] ?? 6.65;
    const yours = +(elite + between(r, 0.25, 0.85) + (s.experience === 'beginner' ? 0.4 : 0)).toFixed(2);
    const gap = +(yours - elite).toFixed(2);
    const gapPct = (gap / elite) * 100;
    return {
      benchmark: {
        yourLabel: 'Your time', yourValue: `${yours.toFixed(2)}s`,
        eliteLabel: 'Elite', eliteValue: `${elite.toFixed(2)}s`,
        gapLabel: 'Gap', gapValue: `+${gap.toFixed(2)}s`,
        projected: `−${Math.min(gap, 0.4).toFixed(2)}s in 6 weeks of sprint mechanics`,
        whyItMatters: `${gap.toFixed(2)}s costs you ~${Math.round(gap * 9)} ft on a contested fly ball. That's an out vs an extra base.`,
        yourNumeric: yours, eliteNumeric: elite, projectedNumeric: Math.max(elite, yours - 0.4),
        unit: 's', decimals: 2, severity: sev(gapPct * 5), gap,
      },
      stats: [
        { label: 'Time', value: yours, unit: 's', decimals: 2 },
        { label: 'Top speed', value: 16 + Math.round(between(r, 0, 6)), unit: 'mph' },
        { label: 'Accel', value: 65 + Math.round(between(r, 0, 25)), unit: '/100' },
      ],
      diagramProps: { yourSec: yours, eliteSec: elite, distanceLabel: `${s.distance}yd sprint` },
    };
  },

  'base-stealing': (s, uid) => {
    const r = rng(seedFromString(`bs:${s.lead}:${s.jump}:${uid ?? 'a'}`));
    const success = Math.round(45 + (s.lead === 'aggressive' ? 12 : 0) + (s.jump === 'elite' ? 18 : s.jump === 'good' ? 8 : 0) + between(r, 0, 12));
    const yours = +(3.45 - (success - 45) * 0.005 + between(r, 0, 0.1)).toFixed(2);
    const elite = 3.15;
    const gap = +(yours - elite).toFixed(2);
    return {
      benchmark: {
        yourLabel: 'Steal time', yourValue: `${yours.toFixed(2)}s`,
        eliteLabel: 'Elite', eliteValue: `${elite.toFixed(2)}s`,
        gapLabel: 'Gap', gapValue: `+${gap.toFixed(2)}s`,
        projected: `−${Math.min(gap, 0.25).toFixed(2)}s with optimized first-step + slide`,
        whyItMatters: `Slide-adjusted, every 0.05s = +9% steal probability. Elite jumps multiply that.`,
        yourNumeric: yours, eliteNumeric: elite, projectedNumeric: Math.max(elite, yours - 0.25),
        unit: 's', decimals: 2, severity: sev(gap * 30), gap,
      },
      stats: [
        { label: 'Success', value: success, unit: '%' },
        { label: 'Lead', value: 9 + Math.round(between(r, 0, 5)), unit: 'ft' },
        { label: 'Slide adj', value: 0.17, unit: 's', decimals: 2 },
      ],
      diagramProps: { yourSec: yours, eliteSec: elite, distanceLabel: 'Steal of 2B' },
    };
  },

  'baserunning-iq': (s, uid) => {
    const r = rng(seedFromString(`biq:${s.situation}:${s.outs}:${uid ?? 'a'}`));
    const score = Math.round(55 + (s.situation === '2nd' ? 8 : 0) + (s.outs === '0' ? 6 : s.outs === '2' ? -4 : 0) + between(r, 0, 18));
    const elite = 92;
    const gap = elite - score;
    return {
      benchmark: {
        yourLabel: 'Read score', yourValue: `${score}`,
        eliteLabel: 'Elite', eliteValue: `${elite}`,
        gapLabel: 'Gap', gapValue: `${gap}`,
        projected: `+${Math.min(gap, 22)} pts with 37 micro-lessons in 4 weeks`,
        whyItMatters: `Wrong reads with 2 outs cost ~0.30 runs each. Elite pressure reads turn singles into doubles.`,
        yourNumeric: score, eliteNumeric: elite, projectedNumeric: Math.min(elite, score + 22),
        unit: '/100', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Read', value: score, unit: '/100' },
        { label: 'Reaction', value: +(0.55 - score * 0.002).toFixed(2), unit: 's', decimals: 2 },
        { label: 'Pressure', value: 55 + Math.round(between(r, 0, 30)), unit: '/100' },
      ],
      diagramProps: { value: score, label: 'IQ' },
    };
  },

  'explosive-conditioning': (s, uid) => {
    const r = rng(seedFromString(`ec:${s.focus}:${uid ?? 'a'}`));
    const watts = Math.round(1200 + (s.focus === 'jump' ? 400 : s.focus === 'sprint' ? 250 : 150) + between(r, 0, 350));
    const elite = 2200;
    const gap = Math.max(0, elite - watts);
    const gapPct = (gap / elite) * 100;
    return {
      benchmark: {
        yourLabel: 'Peak power', yourValue: `${watts}W`,
        eliteLabel: 'Elite', eliteValue: `${elite}W`,
        gapLabel: 'Gap', gapValue: `${gap}W`,
        projected: `+${Math.min(gap, 350)}W in 8 weeks with reactive plyo blocks`,
        whyItMatters: `Power output is the #1 separator at every level. ${gap}W = the gap between varsity and starter.`,
        yourNumeric: watts, eliteNumeric: elite, projectedNumeric: Math.min(elite, watts + 350),
        unit: 'W', severity: sev(gapPct), gap,
      },
      stats: [
        { label: 'Watts', value: watts, unit: 'W' },
        { label: 'RFD', value: 4 + Math.round(between(r, 0, 6)), unit: 'kN/s' },
        { label: 'Jump', value: 22 + Math.round(between(r, 0, 12)), unit: 'in' },
      ],
      diagramProps: {
        blocks: [
          { label: 'Jump', intensity: s.focus === 'jump' ? 0.95 : 0.4 },
          { label: 'Sprint', intensity: s.focus === 'sprint' ? 0.9 : 0.45 },
          { label: 'Throw', intensity: s.focus === 'throw' ? 0.92 : 0.4 },
          { label: 'Plyo', intensity: 0.7 },
          { label: 'Med Ball', intensity: 0.6 },
          { label: 'Recovery', intensity: 0.5 },
        ],
      },
    };
  },

  'heat-factory': (s, uid) => {
    const r = rng(seedFromString(`hf:${s.phase}:${s.days}:${uid ?? 'a'}`));
    const yours = Number(s.days);
    const elite = 5;
    const gap = Math.max(0, elite - yours);
    const phaseBoost = s.phase === 'in-season' ? 0.6 : s.phase === 'pre-season' ? 0.95 : 0.8;
    return {
      benchmark: {
        yourLabel: 'Days', yourValue: `${yours}/wk`,
        eliteLabel: 'Elite', eliteValue: `${elite}/wk`,
        gapLabel: 'Missing', gapValue: `${gap} d`,
        projected: `+${Math.round(gap * 8)}% strength gain with full ${elite}-day plan`,
        whyItMatters: `Full-body, no splits — every session must hit squat, hinge, push, pull, carry, jump.`,
        yourNumeric: yours, eliteNumeric: elite, projectedNumeric: elite,
        unit: 'd/wk', severity: sev(gap * 20), gap,
      },
      stats: [
        { label: 'Days', value: yours, unit: '/wk' },
        { label: 'Volume', value: Math.round(yours * 18 * phaseBoost), unit: 'sets' },
        { label: 'Intensity', value: Math.round(75 * phaseBoost + between(r, 0, 10)), unit: '%' },
      ],
      diagramProps: {
        blocks: [
          { label: 'Squat', intensity: 0.85 },
          { label: 'Hinge', intensity: 0.9 },
          { label: 'Push', intensity: 0.7 },
          { label: 'Pull', intensity: 0.75 },
          { label: 'Carry', intensity: 0.55 },
          { label: 'Jump', intensity: 0.8 },
        ],
      },
    };
  },

  'hammer-block-builder': (s, uid) => {
    const r = rng(seedFromString(`hb:${s.emphasis}:${uid ?? 'a'}`));
    const map: Record<string, number[]> = {
      power: [0.95, 0.7, 0.65, 0.6, 0.4, 0.85],
      speed: [0.55, 0.6, 0.5, 0.55, 0.45, 0.95],
      hypertrophy: [0.75, 0.85, 0.85, 0.85, 0.55, 0.45],
    };
    const intensities = map[s.emphasis] ?? map.power;
    return {
      benchmark: {
        yourLabel: 'Block fit', yourValue: `${75 + Math.round(between(r, 0, 18))}`,
        eliteLabel: 'Optimal', eliteValue: '95',
        gapLabel: 'Gap', gapValue: '15',
        projected: '+18% block efficiency with periodized 24-week loop',
        whyItMatters: 'Random blocks plateau in 4 weeks. Hammer 24-week loops compound.',
        yourNumeric: 78, eliteNumeric: 95, projectedNumeric: 95,
        unit: '/100', severity: 'moderate', gap: 17,
      },
      stats: [
        { label: 'Volume', value: 18 + Math.round(between(r, 0, 8)), unit: 'sets' },
        { label: 'Sessions', value: 4 },
        { label: 'Recovery', value: 70 + Math.round(between(r, 0, 20)), unit: '/100' },
      ],
      diagramProps: {
        blocks: [
          { label: 'Squat', intensity: intensities[0] },
          { label: 'Hinge', intensity: intensities[1] },
          { label: 'Push', intensity: intensities[2] },
          { label: 'Pull', intensity: intensities[3] },
          { label: 'Carry', intensity: intensities[4] },
          { label: 'Jump', intensity: intensities[5] },
        ],
      },
    };
  },

  'nutrition': (s, uid) => {
    const r = rng(seedFromString(`nu:${s.preset}:${uid ?? 'a'}`));
    const presets: Record<string, [number, number, number]> = {
      lean: [40, 35, 25], build: [30, 50, 20], recover: [25, 55, 20],
    };
    const [p, c, f] = presets[s.preset] ?? presets.build;
    const score = 60 + Math.round(between(r, 0, 28));
    const elite = 92;
    const gap = elite - score;
    return {
      benchmark: {
        yourLabel: 'Fuel score', yourValue: `${score}`,
        eliteLabel: 'Elite', eliteValue: `${elite}`,
        gapLabel: 'Gap', gapValue: `${gap}`,
        projected: `+${Math.min(gap, 22)} pts in 4 weeks targeting top-2 limiters`,
        whyItMatters: 'Macros gate strength gains; micros gate recovery. Both must hit daily.',
        yourNumeric: score, eliteNumeric: elite, projectedNumeric: Math.min(elite, score + 22),
        unit: '/100', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Protein', value: p, unit: '%' },
        { label: 'Carbs', value: c, unit: '%' },
        { label: 'Fat', value: f, unit: '%' },
      ],
      diagramProps: { protein: p, carbs: c, fat: f },
    };
  },

  'regulation': (s, uid) => {
    const r = rng(seedFromString(`rg:${s.sleep}:${s.hrv}:${s.soreness}:${uid ?? 'a'}`));
    const sleepScore = (Number(s.sleep) / 9) * 40;
    const hrvScore = ({ low: 8, ok: 22, high: 35 }[s.hrv as string] ?? 20);
    const sorenessPenalty = ({ low: 0, mid: 8, high: 18 }[s.soreness as string] ?? 8);
    const index = Math.max(0, Math.min(100, Math.round(sleepScore + hrvScore + 20 - sorenessPenalty + between(r, 0, 6))));
    const elite = 85;
    const gap = Math.max(0, elite - index);
    return {
      benchmark: {
        yourLabel: 'Readiness', yourValue: `${index}`,
        eliteLabel: 'Elite', eliteValue: `${elite}`,
        gapLabel: 'Gap', gapValue: `${gap}`,
        projected: `+${Math.min(gap, 18)} pts with sleep-first protocol`,
        whyItMatters: `Training under 50 = 40% higher injury risk. Hammer regulates load against your true score.`,
        yourNumeric: index, eliteNumeric: elite, projectedNumeric: Math.min(elite, index + 18),
        unit: '/100', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Sleep', value: Number(s.sleep), unit: 'h' },
        { label: 'HRV', value: Math.round(hrvScore * 2), unit: 'ms' },
        { label: 'Soreness', value: sorenessPenalty, unit: '/20' },
      ],
      diagramProps: { index },
    };
  },

  'tex-vision': (s, uid) => {
    const r = rng(seedFromString(`tv:${s.focus}:${uid ?? 'a'}`));
    const completed = 6 + Math.round(between(r, 0, 7));
    const elite = 16;
    const gap = elite - completed;
    return {
      benchmark: {
        yourLabel: 'Drills done', yourValue: `${completed}/16`,
        eliteLabel: 'Elite', eliteValue: '16/16',
        gapLabel: 'Missing', gapValue: `${gap}`,
        projected: `+${gap * 6}% pitch recognition with full 16-drill daily`,
        whyItMatters: 'Vision is trainable. Skipping drills compounds — elite hitters never miss a day.',
        yourNumeric: completed, eliteNumeric: elite, projectedNumeric: elite,
        unit: 'drills', severity: sev((gap / elite) * 100), gap,
      },
      stats: [
        { label: 'Completed', value: completed, unit: '/16' },
        { label: 'Streak', value: 3 + Math.round(between(r, 0, 12)), unit: 'd' },
        { label: 'Recognition', value: 60 + completed * 2, unit: '%' },
      ],
      diagramProps: {
        completed,
        drills: ['Tracking', 'Recognition', 'Timing', 'Spin ID', 'Quiet eye', 'Convergence', 'Saccade', 'Depth'],
      },
    };
  },

  'custom-cards': (s, uid) => {
    const r = rng(seedFromString(`cc:${s.type}:${s.difficulty}:${uid ?? 'a'}`));
    const points = ({ easy: 5, medium: 12, hard: 25 }[s.difficulty as string] ?? 12);
    const repValue = points * (s.type === 'mental' ? 1.4 : s.type === 'mechanical' ? 1.2 : 1);
    return {
      benchmark: {
        yourLabel: 'Card value', yourValue: `${repValue.toFixed(0)} pts`,
        eliteLabel: 'Elite stack', eliteValue: '180 pts',
        gapLabel: 'Gap', gapValue: `${180 - repValue | 0}`,
        projected: 'Build 12-card decks for category mastery',
        whyItMatters: 'Custom cards turn boring practice into a daily game with real rep value.',
        yourNumeric: repValue, eliteNumeric: 180, projectedNumeric: 180,
        unit: 'pts', severity: 'moderate', gap: 180 - repValue,
      },
      stats: [
        { label: 'Points', value: points },
        { label: 'Multiplier', value: +(repValue / points).toFixed(1), decimals: 1, unit: 'x' },
        { label: 'Difficulty', value: ({ easy: 1, medium: 2, hard: 3 }[s.difficulty as string] ?? 2), unit: '/3' },
      ],
      diagramProps: {
        cards: [
          { id: 'a', title: 'Two-Strike Slug', tag: '12pt', hue: 12 },
          { id: 'b', title: '5-Pitch Battle', tag: '18pt', hue: 200 },
          { id: 's', title: `${s.type} · ${s.difficulty}`, tag: `${repValue.toFixed(0)}pt`, hue: 280 },
          { id: 'c', title: 'Mound Visit', tag: '8pt', hue: 40 },
          { id: 'd', title: 'Pickoff Read', tag: '10pt', hue: 160 },
        ],
        selectedId: 's',
      },
    };
  },

  'drill-library': (s, uid) => {
    const r = rng(seedFromString(`dl:${s.skill}:${uid ?? 'a'}`));
    const drills = [
      { id: 'a', title: 'Tee Reset', tag: 'L1', hue: 12 },
      { id: 'b', title: 'Front Toss', tag: 'L2', hue: 200 },
      { id: 'c', title: 'Live BP', tag: 'L4', hue: 280 },
      { id: 'd', title: 'Pressure Sim', tag: 'L5', hue: 40 },
      { id: 'e', title: 'Mechanics', tag: 'L3', hue: 160 },
    ];
    return {
      benchmark: {
        yourLabel: 'Drills tagged', yourValue: `${20 + Math.round(between(r, 0, 60))}`,
        eliteLabel: 'Library', eliteValue: '180+',
        gapLabel: 'Untagged', gapValue: '60+',
        projected: 'Auto-prescribed every session via Hammer engine',
        whyItMatters: '180+ tagged drills mean every weakness has a 7-tier progression.',
        yourNumeric: 40, eliteNumeric: 180, projectedNumeric: 180,
        unit: 'drills', severity: 'critical', gap: 140,
      },
      stats: [
        { label: 'Tagged', value: 40 },
        { label: 'Tiers', value: 7 },
        { label: 'Coverage', value: 22, unit: '%' },
      ],
      diagramProps: { cards: drills, selectedId: 'c' },
    };
  },

  'video-library': (s, uid) => {
    const r = rng(seedFromString(`vl:${s.category}:${uid ?? 'a'}`));
    const videos = [
      { id: '1', title: 'Hitting Fund', tag: 'NEW', hue: 12 },
      { id: '2', title: 'Pitching Mech', tag: 'HOT', hue: 200 },
      { id: '3', title: 'Speed Lab', tag: '4K', hue: 280 },
      { id: '4', title: 'Vault Tour', tag: 'PRO', hue: 40 },
      { id: '5', title: 'Mental Game', tag: 'NEW', hue: 160 },
    ];
    return {
      benchmark: {
        yourLabel: 'Watched', yourValue: `${5 + Math.round(between(r, 0, 20))}`,
        eliteLabel: 'Library', eliteValue: '500+',
        gapLabel: 'Locked', gapValue: '475+',
        projected: 'Streamed prescriptions update every session',
        whyItMatters: 'Owner-curated, professional-grade content. No noise — only what wins.',
        yourNumeric: 25, eliteNumeric: 500, projectedNumeric: 500,
        unit: 'videos', severity: 'critical', gap: 475,
      },
      stats: [
        { label: 'Watched', value: 25 },
        { label: 'Categories', value: 9 },
        { label: 'New/wk', value: 6 },
      ],
      diagramProps: { cards: videos, selectedId: '2' },
    };
  },

  'unicorn-engine': (s, uid) => {
    const r = rng(seedFromString(`ue:${s.split}:${uid ?? 'a'}`));
    const hitterPct = Number(s.split);
    const pitcherPct = 100 - hitterPct;
    const balance = 100 - Math.abs(50 - hitterPct);
    const elite = 95;
    const gap = elite - balance;
    return {
      benchmark: {
        yourLabel: 'Two-way bal.', yourValue: `${balance}`,
        eliteLabel: 'Elite', eliteValue: `${elite}`,
        gapLabel: 'Gap', gapValue: `${gap}`,
        projected: `+${Math.min(gap, 14)} pts with merged 24-week unicorn loop`,
        whyItMatters: 'Two-way athletes need synchronized periodization or one side regresses.',
        yourNumeric: balance, eliteNumeric: elite, projectedNumeric: Math.min(elite, balance + 14),
        unit: '/100', severity: sev(gap), gap,
      },
      stats: [
        { label: 'Hitter', value: hitterPct, unit: '%' },
        { label: 'Pitcher', value: pitcherPct, unit: '%' },
        { label: 'Recovery', value: 65 + Math.round(between(r, 0, 25)), unit: '/100' },
      ],
      diagramProps: {
        blocks: [
          { label: 'Hit Vol', intensity: hitterPct / 100 },
          { label: 'Hit CNS', intensity: hitterPct / 130 },
          { label: 'Pitch Vol', intensity: pitcherPct / 100 },
          { label: 'Pitch CNS', intensity: pitcherPct / 130 },
          { label: 'Recovery', intensity: 0.7 },
          { label: 'Vision', intensity: 0.6 },
        ],
      },
    };
  },
};
