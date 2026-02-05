import { describe, it, expect } from "vitest";
import {
  calculateExerciseCNS,
  calculateBlockCNS,
  calculateWorkoutCNS,
  calculateRunningCNS,
  calculateExerciseFasciaBias,
  calculateWorkoutFasciaBias,
  formatCNSLoad,
  formatFasciaBias,
  detectOverlaps,
  calculateWorkoutVolume,
} from "@/utils/loadCalculation";
import { EnhancedExercise, WorkoutBlock, RunningSession } from "@/types/eliteWorkout";

// =====================================================
// EXERCISE CNS TESTS
// =====================================================

describe("calculateExerciseCNS", () => {
  it("returns correct base values by exercise type", () => {
    const plyometric: EnhancedExercise = { id: "1", name: "Box Jump", type: "plyometric", sets: 1, reps: 1 };
    const strength: EnhancedExercise = { id: "2", name: "Squat", type: "strength", sets: 1, reps: 1 };
    const flexibility: EnhancedExercise = { id: "3", name: "Stretch", type: "flexibility", sets: 1, reps: 1 };
    const core: EnhancedExercise = { id: "4", name: "Plank", type: "core", sets: 1, reps: 1 };
    const cardio: EnhancedExercise = { id: "5", name: "Run", type: "cardio", sets: 1, reps: 1 };
    
    // Plyometric has highest base (40), flexibility lowest (5)
    expect(calculateExerciseCNS(plyometric)).toBeGreaterThan(calculateExerciseCNS(strength));
    expect(calculateExerciseCNS(strength)).toBeGreaterThan(calculateExerciseCNS(cardio));
    expect(calculateExerciseCNS(flexibility)).toBeLessThan(calculateExerciseCNS(core));
  });

  it("applies velocity intent multipliers correctly", () => {
    const baseExercise: EnhancedExercise = { id: "1", name: "Jump", type: "plyometric", sets: 1, reps: 1 };
    const ballisticExercise: EnhancedExercise = { ...baseExercise, velocity_intent: "ballistic" };
    const slowExercise: EnhancedExercise = { ...baseExercise, velocity_intent: "slow" };
    
    const baseCNS = calculateExerciseCNS(baseExercise);
    const ballisticCNS = calculateExerciseCNS(ballisticExercise);
    const slowCNS = calculateExerciseCNS(slowExercise);
    
    // Ballistic should be ~1.5x higher, slow ~0.75x lower
    expect(ballisticCNS).toBeGreaterThan(baseCNS);
    expect(slowCNS).toBeLessThan(baseCNS);
  });

  it("applies volume modifier based on sets and reps", () => {
    const lowVolume: EnhancedExercise = { id: "1", name: "Jump", type: "plyometric", sets: 1, reps: 5 };
    const highVolume: EnhancedExercise = { id: "2", name: "Jump", type: "plyometric", sets: 5, reps: 10 };
    
    expect(calculateExerciseCNS(highVolume)).toBeGreaterThan(calculateExerciseCNS(lowVolume));
  });

  it("applies CNS demand override correctly", () => {
    const base: EnhancedExercise = { id: "1", name: "Squat", type: "strength", sets: 3, reps: 10 };
    const highDemand: EnhancedExercise = { ...base, cns_demand: "high" };
    const lowDemand: EnhancedExercise = { ...base, cns_demand: "low" };
    
    expect(calculateExerciseCNS(highDemand)).toBeGreaterThan(calculateExerciseCNS(base));
    expect(calculateExerciseCNS(lowDemand)).toBeLessThan(calculateExerciseCNS(base));
  });

  it("applies unilateral modifier correctly", () => {
    const bilateral: EnhancedExercise = { id: "1", name: "Squat", type: "strength", sets: 3, reps: 10 };
    const unilateral: EnhancedExercise = { ...bilateral, is_unilateral: true };
    
    expect(calculateExerciseCNS(unilateral)).toBeGreaterThan(calculateExerciseCNS(bilateral));
  });

  it("handles missing/undefined fields gracefully", () => {
    const minimal: EnhancedExercise = { id: "1", name: "Exercise", type: "other" };
    
    expect(() => calculateExerciseCNS(minimal)).not.toThrow();
    expect(typeof calculateExerciseCNS(minimal)).toBe("number");
  });
});

// =====================================================
// BLOCK CNS TESTS
// =====================================================

describe("calculateBlockCNS", () => {
  it("sums exercise CNS correctly", () => {
    const exercises: EnhancedExercise[] = [
      { id: "1", name: "Jump", type: "plyometric", sets: 1, reps: 1 },
      { id: "2", name: "Squat", type: "strength", sets: 1, reps: 1 },
    ];
    
    const block: WorkoutBlock = {
      id: "block-1",
      name: "Test Block",
      blockType: "activation",
      intent: "submax_technical",
      orderIndex: 0,
      isCustom: false,
      exercises,
      metadata: {},
    };
    
    const expectedTotal = exercises.reduce((sum, ex) => sum + calculateExerciseCNS(ex), 0);
    expect(calculateBlockCNS(block)).toBe(expectedTotal);
  });

  it("returns 0 for empty block", () => {
    const emptyBlock: WorkoutBlock = {
      id: "block-1",
      name: "Empty",
      blockType: "activation",
      intent: "submax_technical",
      orderIndex: 0,
      isCustom: false,
      exercises: [],
      metadata: {},
    };
    
    expect(calculateBlockCNS(emptyBlock)).toBe(0);
  });
});

// =====================================================
// WORKOUT CNS TESTS
// =====================================================

describe("calculateWorkoutCNS", () => {
  it("aggregates block CNS correctly", () => {
    const block1: WorkoutBlock = {
      id: "block-1",
      name: "Block 1",
      blockType: "activation",
      intent: "submax_technical",
      orderIndex: 0,
      isCustom: false,
      exercises: [{ id: "1", name: "Jump", type: "plyometric", sets: 3, reps: 5 }],
      metadata: {},
    };
    
    const block2: WorkoutBlock = {
      id: "block-2",
      name: "Block 2",
      blockType: "strength_output",
      intent: "accumulation",
      orderIndex: 1,
      isCustom: false,
      exercises: [{ id: "2", name: "Squat", type: "strength", sets: 4, reps: 8 }],
      metadata: {},
    };
    
    const blocks = [block1, block2];
    const expectedTotal = calculateBlockCNS(block1) + calculateBlockCNS(block2);
    
    expect(calculateWorkoutCNS(blocks)).toBe(expectedTotal);
  });

  it("returns 0 for empty blocks array", () => {
    expect(calculateWorkoutCNS([])).toBe(0);
  });
});

// =====================================================
// RUNNING CNS TESTS
// =====================================================

describe("calculateRunningCNS", () => {
  it("handles all run types without errors", () => {
    const runTypes: Array<RunningSession["runType"]> = [
      "linear_sprint", "tempo", "conditioning", "elastic", "accel_decel", "curve", "cod", "gait"
    ];
    
    runTypes.forEach(runType => {
      const session: RunningSession = {
        id: "1",
        runType,
        intent: "submax",
      };
      
      expect(() => calculateRunningCNS(session)).not.toThrow();
      expect(typeof calculateRunningCNS(session)).toBe("number");
    });
  });

  it("applies intent modifiers correctly", () => {
    const base: RunningSession = { id: "1", runType: "linear_sprint", intent: "submax" };
    const max: RunningSession = { ...base, intent: "max" };
    const recovery: RunningSession = { ...base, intent: "recovery" };
    
    expect(calculateRunningCNS(max)).toBeGreaterThan(calculateRunningCNS(base));
    expect(calculateRunningCNS(recovery)).toBeLessThan(calculateRunningCNS(base));
  });

  it("applies fatigue state modifiers", () => {
    const fresh: RunningSession = { id: "1", runType: "linear_sprint", intent: "submax", fatigueState: "fresh" };
    const gameDay: RunningSession = { ...fresh, fatigueState: "game_day" };
    
    expect(calculateRunningCNS(gameDay)).toBeGreaterThan(calculateRunningCNS(fresh));
  });
});

// =====================================================
// FASCIA BIAS TESTS
// =====================================================

describe("calculateExerciseFasciaBias", () => {
  it("uses explicit fascia_bias when provided", () => {
    const exercise: EnhancedExercise = { 
      id: "1", 
      name: "Compression", 
      type: "strength", 
      fascia_bias: "compression" 
    };
    
    const bias = calculateExerciseFasciaBias(exercise);
    expect(bias.compression).toBeGreaterThan(bias.elastic);
    expect(bias.compression).toBeGreaterThan(bias.glide);
  });

  it("auto-detects based on exercise type when not explicit", () => {
    const plyometric: EnhancedExercise = { id: "1", name: "Jump", type: "plyometric" };
    const strength: EnhancedExercise = { id: "2", name: "Squat", type: "strength" };
    const flexibility: EnhancedExercise = { id: "3", name: "Stretch", type: "flexibility" };
    
    const plyoBias = calculateExerciseFasciaBias(plyometric);
    const strengthBias = calculateExerciseFasciaBias(strength);
    const flexBias = calculateExerciseFasciaBias(flexibility);
    
    // Plyometric should favor elastic
    expect(plyoBias.elastic).toBeGreaterThan(plyoBias.compression);
    
    // Strength should favor compression
    expect(strengthBias.compression).toBeGreaterThan(strengthBias.elastic);
    
    // Flexibility should favor glide
    expect(flexBias.glide).toBeGreaterThan(flexBias.compression);
  });
});

describe("calculateWorkoutFasciaBias", () => {
  it("returns zeroed bias for empty blocks", () => {
    const bias = calculateWorkoutFasciaBias([]);
    expect(bias.compression).toBe(0);
    expect(bias.elastic).toBe(0);
    expect(bias.glide).toBe(0);
  });
});

// =====================================================
// FORMATTING TESTS
// =====================================================

describe("formatCNSLoad", () => {
  it("returns correct severity labels", () => {
    expect(formatCNSLoad(160).label).toBe("Very High");
    expect(formatCNSLoad(120).label).toBe("High");
    expect(formatCNSLoad(80).label).toBe("Moderate");
    expect(formatCNSLoad(40).label).toBe("Low");
    expect(formatCNSLoad(10).label).toBe("Minimal");
  });

  it("returns color classes for styling", () => {
    const result = formatCNSLoad(160);
    expect(result.color).toContain("text-");
  });
});

describe("formatFasciaBias", () => {
  it("identifies dominant bias correctly", () => {
    expect(formatFasciaBias({ compression: 80, elastic: 10, glide: 10 })).toBe("Compression");
    expect(formatFasciaBias({ compression: 10, elastic: 80, glide: 10 })).toBe("Elastic");
    expect(formatFasciaBias({ compression: 10, elastic: 10, glide: 80 })).toBe("Glide");
  });
});

// =====================================================
// OVERLAP DETECTION TESTS
// =====================================================

describe("detectOverlaps", () => {
  it("warns on high CNS load", () => {
    const metrics = { cnsLoad: 160, fascialLoad: { compression: 0, elastic: 0, glide: 0 }, volumeLoad: 100, recoveryDebt: 0 };
    const warnings = detectOverlaps(metrics, null);
    
    expect(warnings.some(w => w.type === "cns")).toBe(true);
    expect(warnings.some(w => w.severity === "warning")).toBe(true);
  });

  it("returns empty warnings for normal load", () => {
    const metrics = { cnsLoad: 50, fascialLoad: { compression: 30, elastic: 30, glide: 30 }, volumeLoad: 100, recoveryDebt: 0 };
    const warnings = detectOverlaps(metrics, null);
    
    expect(warnings.length).toBe(0);
  });

  it("detects load spikes compared to weekly average", () => {
    const metrics = { cnsLoad: 50, fascialLoad: { compression: 0, elastic: 0, glide: 0 }, volumeLoad: 200, recoveryDebt: 0 };
    const weeklyAvg = { cnsLoad: 50, fascialLoad: { compression: 0, elastic: 0, glide: 0 }, volumeLoad: 100, recoveryDebt: 0 };
    const warnings = detectOverlaps(metrics, weeklyAvg);
    
    expect(warnings.some(w => w.type === "load_spike")).toBe(true);
  });
});

// =====================================================
// VOLUME CALCULATION TESTS
// =====================================================

describe("calculateWorkoutVolume", () => {
  it("calculates total sets × reps across blocks", () => {
    const blocks: WorkoutBlock[] = [
      {
        id: "1",
        name: "Block",
        blockType: "strength_output",
        intent: "accumulation",
        orderIndex: 0,
        isCustom: false,
        exercises: [
          { id: "1", name: "Squat", type: "strength", sets: 3, reps: 10 },
          { id: "2", name: "Press", type: "strength", sets: 4, reps: 8 },
        ],
        metadata: {},
      },
    ];
    
    // 3*10 + 4*8 = 30 + 32 = 62
    expect(calculateWorkoutVolume(blocks)).toBe(62);
  });

  it("returns 0 for empty blocks", () => {
    expect(calculateWorkoutVolume([])).toBe(0);
  });
});
