import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('drizzle/migrations/0090_plan_swap_memory_and_log.sql', 'utf8');

describe('named Swap storage boundaries', () => {
  for (const table of ['athlete_equipment_memory', 'plan_swap_log']) {
    it(`${table} permits self reads but not client operation writes`, () => {
      expect(sql).toContain(`GRANT SELECT ON public.${table} TO authenticated;`);
      expect(sql).toContain(`GRANT ALL ON public.${table} TO service_role;`);
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      const policy = sql.split('\n').find(line => line.startsWith('CREATE POLICY') && line.includes(`ON public.${table} `));
      expect(policy).toMatch(/FOR SELECT TO authenticated USING\s*\(auth\.uid\(\) = user_id\)/);
      expect(sql).not.toMatch(new RegExp(`GRANT (?:ALL|INSERT|UPDATE|DELETE)[^;]*public\\.${table} TO (?:authenticated|anon)`));
    });
  }
  it('today/always receipts bind the plan date and canonical inventory instead of replacing it', () => {
    expect(sql).toContain("scope IN ('today','always')");
    expect(sql).toContain('plan_date date NOT NULL');
    expect(sql).toContain('equipment_context_id uuid REFERENCES public.athlete_equipment_context(id)');
    expect(sql).toContain('CHECK (NOT (confirmed_have && confirmed_lacks))');
  });
  it('an operation must link its equipment receipt and unique actor/request identity', () => {
    expect(sql).toContain('equipment_memory_id uuid NOT NULL REFERENCES public.athlete_equipment_memory(id)');
    expect(sql.match(/UNIQUE\(user_id,request_id\)/g)).toHaveLength(2);
    expect(sql).toContain('before_row jsonb NOT NULL');
    expect(sql).toContain('after_row jsonb NOT NULL');
  });
});