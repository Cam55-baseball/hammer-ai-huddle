// Adversarial scenario generators — pure functions, easy to audit and extend.
// Each generator returns a list of synthetic activity log rows for a given sandbox user_id.

export type ScenarioName =
  | 'overload_spike'
  | 'fake_recovery'
  | 'stale_dominance'
  | 'low_load_high_readiness'
  | 'noise_chaos';

export interface SyntheticLog {
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  created_at: string; // ISO timestamp
  actual_duration_minutes: number;
  performance_data: { rpe: number; checkboxStates: Record<string, boolean> };
  notes: string;
  completion_state: 'completed';
  completion_method: 'check_all' | 'done_button';
  completed: true;
  completed_at: string;
  [key: string]: unknown;
}

export const FORBIDDEN: Record<ScenarioName, string[]> = {
  overload_spike: ['prime', 'ready'],
  fake_recovery: ['prime'],
  stale_dominance: ['recover'],
  low_load_high_readiness: ['recover', 'caution'],
  noise_chaos: ['prime', 'recover'],
};

export const EXPECTED: Record<ScenarioName, string> = {
  overload_spike: 'recover',
  fake_recovery: 'caution',
  stale_dominance: 'ready',
  low_load_high_readiness: 'prime',
  noise_chaos: 'ready',
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mkLog(
  userId: string,
  scenario: ScenarioName,
  whenMsAgo: number,
  rpe: number,
  durationMin: number
): SyntheticLog {
  const ts = new Date(Date.now() - whenMsAgo);
  const iso = ts.toISOString();
  return {
    user_id: userId,
    entry_date: isoDate(ts),
    created_at: iso,
    actual_duration_minutes: durationMin,
    performance_data: {
      rpe,
      checkboxStates: { task_1: true, task_2: true, task_3: true },
    },
    notes: `adversarial:${scenario}`,
    completion_state: 'completed',
    completion_method: 'check_all',
    completed: true,
    completed_at: iso,
  };
}

const HOUR = 3600_000;

export function generateScenario(scenario: ScenarioName, userId: string): SyntheticLog[] {
  switch (scenario) {
    case 'overload_spike': {
      // 16 logs in last 6h, RPE 8-10, durations 30-60min, ~20min spacing
      const logs: SyntheticLog[] = [];
      for (let i = 0; i < 16; i++) {
        const ago = (i * 20 + 5) * 60_000; // 5m..325m ago
        const rpe = 8 + (i % 3); // 8,9,10
        const dur = 30 + ((i * 7) % 31); // 30..60
        logs.push(mkLog(userId, scenario, ago, rpe, dur));
      }
      return logs;
    }
    case 'fake_recovery': {
      // 12 logs in last 12h, RPE 7-9 — sleep injection happens in caller (profiles update)
      const logs: SyntheticLog[] = [];
      for (let i = 0; i < 12; i++) {
        const ago = (i * 55 + 10) * 60_000; // 10m..~11h ago
        const rpe = 7 + (i % 3);
        logs.push(mkLog(userId, scenario, ago, rpe, 35 + (i % 20)));
      }
      return logs;
    }
    case 'stale_dominance': {
      // 14 logs 20-26h ago, RPE 8-9, zero in last 12h
      const logs: SyntheticLog[] = [];
      for (let i = 0; i < 14; i++) {
        const ago = 20 * HOUR + i * 25 * 60_000; // 20h..~26h
        const rpe = 8 + (i % 2);
        logs.push(mkLog(userId, scenario, ago, rpe, 40 + (i % 15)));
      }
      return logs;
    }
    case 'low_load_high_readiness': {
      // 1 log 36h ago, RPE 2, duration 10min — sleep injection in caller
      return [mkLog(userId, scenario, 36 * HOUR, 2, 10)];
    }
    case 'noise_chaos': {
      // 8 logs over last 24h, RPE pattern [3,9,2,8,4,9,3,7], jittered intervals
      const pattern = [3, 9, 2, 8, 4, 9, 3, 7];
      const logs: SyntheticLog[] = [];
      for (let i = 0; i < pattern.length; i++) {
        const ago = (i * 2.7 + 0.5) * HOUR + ((i * 13) % 17) * 60_000;
        logs.push(mkLog(userId, scenario, ago, pattern[i], 20 + (i * 5) % 30));
      }
      return logs;
    }
  }
}

export const SCENARIOS: ScenarioName[] = [
  'overload_spike',
  'fake_recovery',
  'stale_dominance',
  'low_load_high_readiness',
  'noise_chaos',
];
