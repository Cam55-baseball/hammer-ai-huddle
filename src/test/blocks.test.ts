import { describe, it, expect } from "vitest";
import { 
  BLOCK_TYPE_CONFIGS, 
  createEmptyBlock,
  WorkoutBlock,
  BlockType,
  EnhancedExercise,
} from "@/types/eliteWorkout";

// =====================================================
// BLOCK TYPE CONFIG TESTS
// =====================================================

describe("BLOCK_TYPE_CONFIGS", () => {
  it("has all required block types", () => {
    const expectedTypes: BlockType[] = [
      "activation",
      "elastic_prep",
      "cns_primer",
      "strength_output",
      "power_speed",
      "capacity",
      "skill_transfer",
      "decompression",
      "recovery",
      "custom",
    ];
    
    expectedTypes.forEach(type => {
      expect(BLOCK_TYPE_CONFIGS[type]).toBeDefined();
    });
  });

  it("each config has required fields", () => {
    Object.values(BLOCK_TYPE_CONFIGS).forEach(config => {
      expect(config.type).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.description).toBeDefined();
      expect(config.icon).toBeDefined();
      expect(config.defaultIntent).toBeDefined();
      expect(config.color).toBeDefined();
      expect(Array.isArray(config.suggestedExerciseTypes)).toBe(true);
    });
  });

  it("all color classes follow Tailwind pattern", () => {
    Object.values(BLOCK_TYPE_CONFIGS).forEach(config => {
      expect(config.color).toMatch(/^bg-\w+-\d+\/\d+ border-\w+-\d+\/\d+$/);
    });
  });
});

// =====================================================
// CREATE EMPTY BLOCK TESTS
// =====================================================

describe("createEmptyBlock", () => {
  it("generates valid block structure", () => {
    const block = createEmptyBlock("activation", 0);
    
    expect(block.id).toBeDefined();
    expect(block.id.startsWith("block-")).toBe(true);
    expect(block.blockType).toBe("activation");
    expect(block.orderIndex).toBe(0);
    expect(block.isCustom).toBe(false); // activation is not 'custom' type
    expect(Array.isArray(block.exercises)).toBe(true);
    expect(block.exercises.length).toBe(0);
  });

  it("uses config defaults for name and intent", () => {
    const block = createEmptyBlock("strength_output", 5);
    const config = BLOCK_TYPE_CONFIGS.strength_output;
    
    expect(block.name).toBe(config.label);
    expect(block.intent).toBe(config.defaultIntent);
    expect(block.orderIndex).toBe(5);
  });

  it("creates unique IDs for each block", () => {
    const block1 = createEmptyBlock("activation", 0);
    const block2 = createEmptyBlock("activation", 1);
    
    expect(block1.id).not.toBe(block2.id);
  });

  it("handles custom block type", () => {
    const block = createEmptyBlock("custom", 0);
    
    expect(block.blockType).toBe("custom");
    expect(block.name).toBe("Custom Block");
    expect(block.isCustom).toBe(true); // 'custom' type sets isCustom to true
  });
});

// =====================================================
// BLOCK OPERATIONS TESTS
// =====================================================

describe("Block operations", () => {
  const createTestBlock = (orderIndex: number): WorkoutBlock => ({
    id: `block-${orderIndex}`,
    name: `Block ${orderIndex}`,
    blockType: "activation",
    intent: "submax_technical",
    orderIndex,
    isCustom: false,
    exercises: [],
    metadata: {},
  });

  describe("reordering", () => {
    it("updates orderIndex correctly when moving blocks", () => {
      const blocks = [createTestBlock(0), createTestBlock(1), createTestBlock(2)];
      
      // Simulate moving block 2 to position 0
      const reordered = [blocks[2], blocks[0], blocks[1]].map((block, index) => ({
        ...block,
        orderIndex: index,
      }));
      
      expect(reordered[0].orderIndex).toBe(0);
      expect(reordered[1].orderIndex).toBe(1);
      expect(reordered[2].orderIndex).toBe(2);
      expect(reordered[0].id).toBe("block-2");
    });

    it("maintains block integrity during reorder", () => {
      const blocks = [createTestBlock(0), createTestBlock(1)];
      blocks[0].exercises = [{ id: "ex-1", name: "Test", type: "strength" }];
      
      const reordered = [blocks[1], blocks[0]].map((block, index) => ({
        ...block,
        orderIndex: index,
      }));
      
      // Exercises should remain intact
      expect(reordered[1].exercises.length).toBe(1);
      expect(reordered[1].exercises[0].name).toBe("Test");
    });
  });

  describe("exercise operations within block", () => {
    it("adds exercise to block correctly", () => {
      const block = createTestBlock(0);
      const newExercise: EnhancedExercise = {
        id: "ex-1",
        name: "Squat",
        type: "strength",
        sets: 3,
        reps: 10,
      };
      
      const updatedBlock = {
        ...block,
        exercises: [...block.exercises, newExercise],
      };
      
      expect(updatedBlock.exercises.length).toBe(1);
      expect(updatedBlock.exercises[0].name).toBe("Squat");
    });

    it("removes exercise from block correctly", () => {
      const block = createTestBlock(0);
      block.exercises = [
        { id: "ex-1", name: "Squat", type: "strength" },
        { id: "ex-2", name: "Press", type: "strength" },
      ];
      
      const updatedBlock = {
        ...block,
        exercises: block.exercises.filter(ex => ex.id !== "ex-1"),
      };
      
      expect(updatedBlock.exercises.length).toBe(1);
      expect(updatedBlock.exercises[0].name).toBe("Press");
    });

    it("updates exercise within block correctly", () => {
      const block = createTestBlock(0);
      block.exercises = [{ id: "ex-1", name: "Squat", type: "strength", sets: 3, reps: 10 }];
      
      const updatedExercise = { ...block.exercises[0], sets: 5, reps: 5 };
      const updatedBlock = {
        ...block,
        exercises: block.exercises.map(ex => 
          ex.id === "ex-1" ? updatedExercise : ex
        ),
      };
      
      expect(updatedBlock.exercises[0].sets).toBe(5);
      expect(updatedBlock.exercises[0].reps).toBe(5);
    });
  });

  describe("block metadata", () => {
    it("preserves metadata through operations", () => {
      const block = createTestBlock(0);
      block.metadata = {
        cnsContribution: 50,
        estimatedDuration: 15,
        notes: "Test notes",
      };
      
      const updatedBlock = {
        ...block,
        name: "Updated Name",
      };
      
      expect(updatedBlock.metadata.cnsContribution).toBe(50);
      expect(updatedBlock.metadata.estimatedDuration).toBe(15);
      expect(updatedBlock.metadata.notes).toBe("Test notes");
    });

    it("allows partial metadata updates", () => {
      const block = createTestBlock(0);
      block.metadata = { cnsContribution: 50 };
      
      const updatedBlock = {
        ...block,
        metadata: { ...block.metadata, estimatedDuration: 20 },
      };
      
      expect(updatedBlock.metadata.cnsContribution).toBe(50);
      expect(updatedBlock.metadata.estimatedDuration).toBe(20);
    });
  });
});

// =====================================================
// EDGE CASES
// =====================================================

describe("Edge cases", () => {
  it("handles block with many exercises", () => {
    const block = createEmptyBlock("strength_output", 0);
    const manyExercises = Array.from({ length: 50 }, (_, i) => ({
      id: `ex-${i}`,
      name: `Exercise ${i}`,
      type: "strength" as const,
      sets: 3,
      reps: 10,
    }));
    
    const updatedBlock = { ...block, exercises: manyExercises };
    expect(updatedBlock.exercises.length).toBe(50);
  });

  it("handles block with complex exercise data", () => {
    const block = createEmptyBlock("power_speed", 0);
    const complexExercise: EnhancedExercise = {
      id: "ex-1",
      name: "Complex Movement",
      type: "plyometric",
      sets: 4,
      reps: 6,
      rest: 120,
      tempo: "2-1-X-0",
      velocity_intent: "ballistic",
      external_load: 50,
      load_type: "barbell",
      fascia_bias: "elastic",
      cns_demand: "high",
      is_unilateral: true,
      coaching_cues: ["Drive hips", "Keep chest up", "Explode"],
    };
    
    const updatedBlock = { ...block, exercises: [complexExercise] };
    expect(updatedBlock.exercises[0].coaching_cues).toHaveLength(3);
    expect(updatedBlock.exercises[0].velocity_intent).toBe("ballistic");
  });
});
