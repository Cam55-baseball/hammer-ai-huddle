import { describe, it, expect } from 'vitest';
import {
  computeDrillRecommendations,
  type DrillInput,
  type WeaknessInput,
  type RecommendationInput,
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
    ...overrides,
  };
}

const baseDrills: DrillInput[] = [
  makeDrill({ id: '1', name: 'Tee Work', module: 'hitting', skill_target: 'barrel_contact', tags: ['barrel_contact', 'tee'], difficulty_levels: ['beginner', 'intermediate'] }),
  makeDrill({ id: '2', name: 'Front Toss', module: 'hitting', skill_target: 'pitch_recognition', tags: ['pitch_recognition'], difficulty_levels: ['intermediate'] }),
  makeDrill({ id: '3', name: 'Long Toss', module: 'throwing', skill_target: 'arm_speed', tags: ['arm_speed', 'arm'], difficulty_levels: ['beginner', 'intermediate', 'advanced'] }),
  makeDrill({ id: '4', name: 'Ground Balls', module: 'fielding', skill_target: 'fielding_mechanics', tags: ['fielding_mechanics', 'full_body'] }),
  makeDrill({ id: '5', name: 'Premium Drill', module: 'hitting', skill_target: 'barrel_contact', tags: ['barrel_contact'], premium: true }),
  makeDrill({ id: '6', name: 'Softball Slap', module: 'hitting', sport: 'softball', skill_target: 'barrel_contact', tags: ['barrel_contact'] }),
  makeDrill({ id: '7', name: 'Inactive Drill', module: 'hitting', skill_target: 'barrel_contact', is_active: false }),
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
    // Top drill should target barrel_contact
    const top = result.recommended[0];
    expect(top.drill.skill_target).toBe('barrel_contact');
    expect(top.score).toBeGreaterThan(0);
  });

  it('2. is deterministic — identical input produces identical output', () => {
    const input: RecommendationInput = {
      drills: baseDrills,
      weaknesses: [{ area: 'arm_speed', score: 40 }],
      sport: 'baseball',
      userHasPremium: false,
    };

    const r1 = computeDrillRecommendations(input);
    const r2 = computeDrillRecommendations(input);

    expect(r1.recommended.map((r) => r.drill.id)).toEqual(
      r2.recommended.map((r) => r.drill.id),
    );
    expect(r1.recommended.map((r) => r.score)).toEqual(
      r2.recommended.map((r) => r.score),
    );
  });

  it('3. scoring breakdown sums correctly', () => {
    const result = computeDrillRecommendations({
      drills: baseDrills,
      weaknesses: [{ area: 'barrel_contact', score: 0 }],
      sport: 'baseball',
      userHasPremium: true,
    });

    for (const r of result.recommended) {
      const { skillMatch, tagRelevance, difficultyFit, variety } = r.breakdown;
      expect(skillMatch + tagRelevance + difficultyFit + variety).toBe(r.score);
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

    // Softball drill should not appear
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

    // Same drills appear in both
    expect(free.recommended.map((r) => r.drill.id).sort()).toEqual(
      premium.recommended.map((r) => r.drill.id).sort(),
    );

    // Free user: premium drill is locked
    const freePremiumDrill = free.recommended.find((r) => r.drill.id === '5');
    expect(freePremiumDrill).toBeDefined();
    expect(freePremiumDrill!.locked).toBe(true);

    // Premium user: same drill is unlocked
    const premPremiumDrill = premium.recommended.find((r) => r.drill.id === '5');
    expect(premPremiumDrill).toBeDefined();
    expect(premPremiumDrill!.locked).toBe(false);

    // Scores are identical (only locked differs)
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

    // Admin changes Drill B tags to also target barrel_contact
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

    // After update, Drill B should now have a higher score
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
    expect(result.recommended.length).toBeGreaterThan(0);
    // All scores should be 0 in fallback mode
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

  it('13. STRESS TEST: 1,000 drills × 20 weaknesses in <100ms', () => {
    const stressDrills: DrillInput[] = [];
    const skills = ['barrel_contact', 'pitch_recognition', 'arm_speed', 'fielding_mechanics', 'baserunning_speed'];
    const modules = ['hitting', 'pitching', 'throwing', 'fielding', 'baserunning'];

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
        }),
      );
    }

    const stressWeaknesses: WeaknessInput[] = [];
    for (let i = 0; i < 20; i++) {
      stressWeaknesses.push({
        area: skills[i % skills.length],
        score: (i * 5) % 100,
      });
    }

    const start = performance.now();
    const result = computeDrillRecommendations({
      drills: stressDrills,
      weaknesses: stressWeaknesses,
      sport: 'baseball',
      userHasPremium: false,
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
    expect(result.recommended.length).toBe(10);
    expect(result.fallbackUsed).toBe(false);

    // Verify premium gating under stress
    const lockedCount = result.recommended.filter((r) => r.locked).length;
    const premiumInResults = result.recommended.filter((r) => r.drill.premium).length;
    expect(lockedCount).toBe(premiumInResults);
  });
});
