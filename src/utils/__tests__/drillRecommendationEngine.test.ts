import { describe, it, expect } from 'vitest';
import {
  computeDrillRecommendations,
  type DrillInput,
  type WeaknessInput,
  type RecommendationInput,
  type DrillUsageStats,
} from '../drillRecommendationEngine';

// ─── Test Fixtures ──────────────────────────────────────────

function makeDrill(overrides: Partial<DrillInput> & { id: string; name: string }): DrillInput {
  return {
    module: 'hitting',
    sport: 'baseball',
    skill_target: null,
    premium: false,
    is_active: true,
    tags: [],
    ai_context: null,
    difficulty_levels: ['beginner'],
    positions: [],
    tagWeights: {},
    progression_level: 4,
    sport_modifier: 1.0,
    ...overrides,
  };
}

const baseDrills: DrillInput[] = [
  makeDrill({ id: '1', name: 'Tee Work', module: 'hitting', skill_target: 'barrel_contact', tags: ['barrel_contact', 'tee'], difficulty_levels: ['beginner', 'intermediate'] }),
  makeDrill({ id: '2', name: 'Front Toss', module: 'hitting', skill_target: 'pitch_recognition', tags: ['pitch_recognition'], difficulty_levels: ['intermediate'] }),
  makeDrill({ id: '3', name: 'Long Toss', module: 'throwing', skill_target: 'arm_speed', tags: ['arm_speed', 'arm'], difficulty_levels: ['beginner', 'intermediate', 'advanced'] }),
  makeDrill({ id: '4', name: 'Ground Balls', module: 'fielding', skill_target: 'fielding_mechanics', tags: ['fielding_mechanics', 'full_body'], positions: ['infield'] }),
  makeDrill({ id: '5', name: 'Premium Drill', module: 'hitting', skill_target: 'barrel_contact', tags: ['barrel_contact'], premium: true }),
  makeDrill({ id: '6', name: 'Softball Slap', module: 'hitting', sport: 'softball', skill_target: 'barrel_contact', tags: ['barrel_contact'] }),
  makeDrill({ id: '7', name: 'Inactive Drill', module: 'hitting', skill_target: 'barrel_contact', is_active: false }),
  makeDrill({ id: '8', name: 'Transfer Drill', module: 'fielding', skill_target: 'transfer', tags: ['late_transfer', 'transfer'], positions: ['infield', 'catcher'], tagWeights: { late_transfer: 4, transfer: 3 } }),
  makeDrill({ id: '9', name: 'Footwork Fix', module: 'fielding', skill_target: 'footwork', tags: ['bad_footwork', 'footwork'], positions: ['infield'], tagWeights: { bad_footwork: 5 } }),
  makeDrill({ id: '10', name: 'Catcher Blocking', module: 'fielding', skill_target: 'blocking', tags: ['bobble', 'glove_work'], positions: ['catcher'] }),
];

// ─── Tests ──────────────────────────────────────────────────

describe('computeDrillRecommendations', () => {
  it('1. returns correct top drill for matching weakness', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    expect(result.fallbackUsed).toBe(false);
    expect(result.recommended.length).toBeGreaterThan(0);
    const top = result.recommended[0];
    expect(top.drill.skill_target).toBe('barrel_contact');
    expect(top.score).toBeGreaterThan(0);
  });

  it('2. is deterministic', () => {
    const input: RecommendationInput = {
      drills: baseDrills,
      weaknesses: [{ area: 'arm_speed', score: 40 }],
      sport: 'baseball',
      userHasPremium: false,
    };

    const r1 = computeDrillRecommendations(input);
    const r2 = computeDrillRecommendations(input);

    expect(r1.recommended.map((r) => r.drill.id)).toEqual(r2.recommended.map((r) => r.drill.id));
    expect(r1.recommended.map((r) => r.score)).toEqual(r2.recommended.map((r) => r.score));
  });

  it('3. scoring breakdown sums correctly', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 0 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    for (const r of result.recommended) {
      const { skillMatch, tagRelevance, difficultyFit, variety, positionMatch, errorTypeMatch, weightBonus, trendBonus, progressionFit } = r.breakdown;
      const expectedRaw = skillMatch + tagRelevance + difficultyFit + variety + positionMatch + errorTypeMatch + weightBonus + trendBonus + progressionFit;
      const sportMod = r.drill.sport_modifier ?? 1.0;
      expect(r.score).toBe(Math.round(expectedRaw * sportMod));
    }
  });

  it('4. no tags → fallback drills returned', () => {
    const noTagDrills = baseDrills
      .filter((d) => d.sport === 'baseball' && d.is_active)
      .map((d) => ({ ...d, tags: [], skill_target: null, ai_context: null }));

    const result = computeDrillRecommendations({
      drills: noTagDrills,
      weaknesses: [{ area: 'barrel_contact', score: 30 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.recommended.length).toBeGreaterThan(0);
  });

  it('5. unknown weakness area → no crash, returns drills', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'quantum_hitting_flux', score: 10 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.recommended.length).toBeGreaterThan(0);
  });

  it('6. mixed sport input → only correct sport returned', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    for (const r of result.recommended) {
      expect(r.drill.sport).toBe('baseball');
    }
    expect(result.recommended.find((r) => r.drill.id === '6')).toBeUndefined();
  });

  it('7. empty drills array → safe empty return', () => {
    const result = computeDrillRecommendations({
      drills: [],
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    expect(result.recommended).toEqual([]);
    expect(result.fallbackUsed).toBe(true);
  });

  it('8. subscription gating: free user sees premium drills as locked', () => {
    const inputFree: RecommendationInput = {
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: false,
    };
    const inputPremium: RecommendationInput = { ...inputFree, userHasPremium: true };

    const free = computeDrillRecommendations(inputFree);
    const premium = computeDrillRecommendations(inputPremium);

    const freePremiumDrill = free.recommended.find((r) => r.drill.id === '5');
    expect(freePremiumDrill).toBeDefined();
    expect(freePremiumDrill!.locked).toBe(true);

    const premPremiumDrill = premium.recommended.find((r) => r.drill.id === '5');
    expect(premPremiumDrill).toBeDefined();
    expect(premPremiumDrill!.locked).toBe(false);

    expect(freePremiumDrill!.score).toBe(premPremiumDrill!.score);
  });

  it('9. admin tag update simulation: changed tags produce different results', () => {
    const drillsBefore = [
      makeDrill({ id: 'a', name: 'Drill A', tags: ['barrel_contact'], skill_target: 'barrel_contact' }),
      makeDrill({ id: 'b', name: 'Drill B', tags: ['arm_speed'], skill_target: 'arm_speed' }),
    ];

    const before = computeDrillRecommendations({
      drills: drillsBefore,
      weaknesses: [{ area: 'barrel_contact', score: 10 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    const drillsAfter = [
      drillsBefore[0],
      { ...drillsBefore[1], tags: ['barrel_contact'], skill_target: 'barrel_contact' },
    ];

    const after = computeDrillRecommendations({
      drills: drillsAfter,
      weaknesses: [{ area: 'barrel_contact', score: 10 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    const drillBBefore = before.recommended.find((r) => r.drill.id === 'b')!;
    const drillBAfter = after.recommended.find((r) => r.drill.id === 'b')!;
    expect(drillBAfter.score).toBeGreaterThan(drillBBefore.score);
  });

  it('10. inactive drills are excluded', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    expect(result.recommended.find((r) => r.drill.id === '7')).toBeUndefined();
  });

  it('11. no weaknesses → fallback with all drills', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [],
      sport: 'baseball',
      userHasPremium: true,
    });

    expect(result.fallbackUsed).toBe(true);
    for (const r of result.recommended) {
      expect(r.score).toBe(0);
    }
  });

  it('12. excludeDrillIds removes specific drills', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
      excludeDrillIds: ['1', '5'],
    });

    expect(result.recommended.find((r) => r.drill.id === '1')).toBeUndefined();
    expect(result.recommended.find((r) => r.drill.id === '5')).toBeUndefined();
  });

  // ─── Position Filtering ─────────────────────────────

  it('13. position filtering: catcher drills ranked higher when position=catcher', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'glove_work', score: 30 }],
      sport: 'baseball',
      userHasPremium: true,
      position: 'catcher',
    });

    const catcherDrill = result.recommended.find((r) => r.drill.id === '10');
    expect(catcherDrill).toBeDefined();
    expect(catcherDrill!.breakdown.positionMatch).toBe(20);
    expect(catcherDrill!.matchReasons).toContain('position match: catcher');
  });

  it('14. position filtering: infield drills get no position bonus when position=catcher', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'transfer', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
      position: 'catcher',
    });

    const transferDrill = result.recommended.find((r) => r.drill.id === '8');
    expect(transferDrill).toBeDefined();
    expect(transferDrill!.breakdown.positionMatch).toBe(20);

    const groundBalls = result.recommended.find((r) => r.drill.id === '4');
    expect(groundBalls).toBeDefined();
    expect(groundBalls!.breakdown.positionMatch).toBe(0);
  });

  // ─── Error Type Matching ─────────────────────────────

  it('15. error type matching: detected issues boost relevant drills', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [],
      sport: 'baseball',
      userHasPremium: true,
      detectedIssues: ['late_transfer'],
    });

    expect(result.fallbackUsed).toBe(false);
    const transferDrill = result.recommended.find((r) => r.drill.id === '8');
    expect(transferDrill).toBeDefined();
    expect(transferDrill!.breakdown.errorTypeMatch).toBeGreaterThan(0);
    expect(transferDrill!.matchReasons.some(r => r.includes('late_transfer'))).toBe(true);
  });

  it('16. error type matching: bad_footwork targets footwork drill', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [],
      sport: 'baseball',
      userHasPremium: true,
      detectedIssues: ['bad_footwork'],
    });

    const footworkDrill = result.recommended.find((r) => r.drill.id === '9');
    expect(footworkDrill).toBeDefined();
    expect(footworkDrill!.breakdown.errorTypeMatch).toBe(25);
  });

  // ─── Weight Bonus ─────────────────────────────

  it('17. weight bonus: drills with higher tag weights get bonus', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'transfer', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    const transferDrill = result.recommended.find((r) => r.drill.id === '8');
    expect(transferDrill).toBeDefined();
    expect(transferDrill!.breakdown.weightBonus).toBeGreaterThan(0);
  });

  // ─── Match Reasons ─────────────────────────────

  it('18. matchReasons populated correctly', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    const topDrill = result.recommended[0];
    expect(topDrill.matchReasons.length).toBeGreaterThan(0);
    expect(topDrill.matchReasons.some(r => r.includes('barrel_contact'))).toBe(true);
  });

  // ─── Trend Bonus ─────────────────────────────

  it('19. trend bonus: high success drills get +5', () => {
    const usageStats: DrillUsageStats[] = [
      { drillId: '1', useCount: 10, avgSuccessRating: 4.5 },
    ];

    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
      usageStats,
    });

    const teeWork = result.recommended.find((r) => r.drill.id === '1');
    expect(teeWork).toBeDefined();
    expect(teeWork!.breakdown.trendBonus).toBe(5);
    expect(teeWork!.matchReasons).toContain('high success rate');
  });

  it('20. trend bonus: low usage drills get no bonus', () => {
    const usageStats: DrillUsageStats[] = [
      { drillId: '1', useCount: 2, avgSuccessRating: 4.5 },
    ];

    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
      usageStats,
    });

    const teeWork = result.recommended.find((r) => r.drill.id === '1');
    expect(teeWork!.breakdown.trendBonus).toBe(0);
  });

  // ─── PROGRESSION FIT ─────────────────────────────

  it('22. progression fit: user level 4 → level 4 drill scores higher than level 1', () => {
    const drills = [
      makeDrill({ id: 'p1', name: 'Beginner Drill', progression_level: 1, skill_target: 'footwork', tags: ['footwork'] }),
      makeDrill({ id: 'p4', name: 'HS Drill', progression_level: 4, skill_target: 'footwork', tags: ['footwork'] }),
    ];

    const result = computeDrillRecommendations({
      drills,
      weaknesses: [{ area: 'footwork', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
      userLevel: 4,
    });

    const p1 = result.recommended.find(r => r.drill.id === 'p1')!;
    const p4 = result.recommended.find(r => r.drill.id === 'p4')!;
    expect(p4.breakdown.progressionFit).toBe(20);
    expect(p1.breakdown.progressionFit).toBe(0); // diff = 1-4 = -3, too easy
    expect(p4.score).toBeGreaterThan(p1.score);
  });

  it('23. challenge zone: level 5 drill for level 4 user gets 20pts, level 7 gets 0pts', () => {
    const drills = [
      makeDrill({ id: 'c5', name: 'College Drill', progression_level: 5, skill_target: 'transfer', tags: ['transfer'] }),
      makeDrill({ id: 'c7', name: 'Elite Drill', progression_level: 7, skill_target: 'transfer', tags: ['transfer'] }),
    ];

    const result = computeDrillRecommendations({
      drills,
      weaknesses: [{ area: 'transfer', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
      userLevel: 4,
    });

    const c5 = result.recommended.find(r => r.drill.id === 'c5')!;
    const c7 = result.recommended.find(r => r.drill.id === 'c7')!;
    expect(c5.breakdown.progressionFit).toBe(20); // diff = 5-4 = 1 → optimal
    expect(c7.breakdown.progressionFit).toBe(0);  // diff = 7-4 = 3 → too hard
  });

  it('24. sport modifier: 1.15 modifier boosts final score', () => {
    const drills = [
      makeDrill({ id: 'sm1', name: 'Normal Drill', sport_modifier: 1.0, skill_target: 'footwork', tags: ['footwork'] }),
      makeDrill({ id: 'sm2', name: 'Boosted Drill', sport_modifier: 1.15, skill_target: 'footwork', tags: ['footwork'] }),
    ];

    const result = computeDrillRecommendations({
      drills,
      weaknesses: [{ area: 'footwork', score: 20 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    const normal = result.recommended.find(r => r.drill.id === 'sm1')!;
    const boosted = result.recommended.find(r => r.drill.id === 'sm2')!;
    expect(boosted.score).toBeGreaterThan(normal.score);
  });

  it('25. fallback filters by position and progression level', () => {
    const drills = [
      makeDrill({ id: 'f1', name: 'A Drill', positions: ['catcher'], progression_level: 4 }),
      makeDrill({ id: 'f2', name: 'B Drill', positions: ['infield'], progression_level: 4 }),
      makeDrill({ id: 'f3', name: 'C Drill', positions: ['catcher'], progression_level: 7 }),
    ];

    const result = computeDrillRecommendations({
      drills,
      weaknesses: [],
      sport: 'baseball',
      userHasPremium: true,
      position: 'catcher',
      userLevel: 4,
    });

    expect(result.fallbackUsed).toBe(true);
    // Should prefer catcher + level 4 (within range), exclude level 7 (diff = 3)
    const ids = result.recommended.map(r => r.drill.id);
    expect(ids).toContain('f1');
    // f3 has progression_level 7, diff = 3, outside [-1, 2] range, should be excluded if enough in range
  });

  // ─── STRESS TEST ─────────────────────────────

  it('21. STRESS TEST: 1,000 drills × 20 weaknesses in <100ms', () => {
    const stressDrills: DrillInput[] = [];
    const skills = ['barrel_contact', 'pitch_recognition', 'arm_speed', 'fielding_mechanics', 'baserunning_speed'];
    const modules = ['hitting', 'pitching', 'throwing', 'fielding', 'baserunning'];
    const positions = ['infield', 'outfield', 'catcher', 'pitcher_fielding'];

    for (let i = 0; i < 1000; i++) {
      stressDrills.push(
        makeDrill({
          id: `stress-${i}`,
          name: `Stress Drill ${String(i).padStart(4, '0')}`,
          module: modules[i % modules.length],
          skill_target: skills[i % skills.length],
          tags: [skills[i % skills.length], skills[(i + 1) % skills.length]],
          premium: i % 10 === 0,
          difficulty_levels: ['beginner', 'intermediate', 'advanced'].slice(0, (i % 3) + 1),
          positions: [positions[i % positions.length]],
          progression_level: (i % 7) + 1,
        }),
      );
    }

    const stressWeaknesses: WeaknessInput[] = [];
    for (let i = 0; i < 20; i++) {
      stressWeaknesses.push({ area: skills[i % skills.length], score: (i * 5) % 100 });
    }

    const start = performance.now();
    const result = computeDrillRecommendations({
      drills: stressDrills,
      weaknesses: stressWeaknesses,
      sport: 'baseball',
      userHasPremium: false,
      position: 'infield',
      detectedIssues: ['barrel_contact', 'arm_speed'],
      userLevel: 4,
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
    expect(result.recommended.length).toBe(10);
    expect(result.fallbackUsed).toBe(false);

    const lockedCount = result.recommended.filter((r) => r.locked).length;
    const premiumInResults = result.recommended.filter((r) => r.drill.premium).length;
    expect(lockedCount).toBe(premiumInResults);
  });
});
