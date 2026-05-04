import { DemoSim, rng, seedFromString } from './simEngine';

export type Goal = 'power' | 'speed' | 'durability';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface ProgramInput {
  goal: Goal;
  daysPerWeek: 3 | 4 | 5;
  experience: Experience;
}

export interface ProgramDay {
  day: string;
  focus: string;
  exercises: { name: string; sets: number; reps: string }[];
  locked?: boolean;
}

const FOCUS: Record<Goal, string[]> = {
  power: ['Triple Extension', 'Rotational Power', 'Posterior Chain', 'Plyo + Sprint', 'CNS Recovery', 'Med Ball Throws', 'Mobility'],
  speed: ['Acceleration', 'Top-End Speed', 'Lateral Quickness', 'Plyo Bounding', 'CNS Recovery', 'Sprint Mechanics', 'Mobility'],
  durability: ['Tendon Health', 'Hip Stability', 'T-Spine Mobility', 'Core Anti-Rotation', 'Aerobic Base', 'Recovery Flow', 'Mobility'],
};

const EXERCISES: Record<string, { name: string; sets: number; reps: string }[]> = {
  power: [
    { name: 'Trap Bar Jump', sets: 4, reps: '3' },
    { name: 'Cable Rotational Chop', sets: 3, reps: '6/side' },
    { name: 'RDL', sets: 3, reps: '5' },
  ],
  speed: [
    { name: '10yd Falling Start', sets: 5, reps: '1' },
    { name: 'Lateral Bound', sets: 3, reps: '4/side' },
    { name: 'Hip Flexor Iso', sets: 3, reps: '20s' },
  ],
  durability: [
    { name: 'Copenhagen Plank', sets: 3, reps: '30s' },
    { name: 'Bird Dog', sets: 3, reps: '8/side' },
    { name: 'Tibialis Raise', sets: 3, reps: '15' },
  ],
};

export const programSim: DemoSim<ProgramInput, ProgramDay[]> = {
  id: 'program',
  run(input) {
    const r = rng(seedFromString(`${input.goal}:${input.daysPerWeek}:${input.experience}`));
    const days: ProgramDay[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const focusList = FOCUS[input.goal];
    const baseExercises = EXERCISES[input.goal];
    for (let i = 0; i < 7; i++) {
      const isWorkout = i < input.daysPerWeek;
      days.push({
        day: dayNames[i],
        focus: isWorkout ? focusList[i] : 'Rest',
        exercises: isWorkout ? baseExercises.map(e => ({
          ...e,
          sets: input.experience === 'advanced' ? e.sets + 1 : e.sets,
        })) : [],
        // Lock the highest-value day to drive upgrade
        locked: isWorkout && i === input.daysPerWeek - 1,
      });
    }
    return days;
  },
};
