import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('docs/owner/av5-plan-lock.sql', 'utf8');

describe('certified Swap shares a transaction-held athlete/day lock with generation', () => {
  it('keys the lock by both the athlete and plan date, not an expiring build claim', () => {
    expect(sql).toContain("pg_advisory_xact_lock(hashtextextended('wk-plan-day:' || p_user::text || ':' || p_date::text, 0))");
  });
  it('guards both destructive-replacement persistence paths before existing statements', () => {
    expect(sql).toContain('public.wk_persist_prescriptions_atomic(uuid,date,jsonb,jsonb)');
    expect(sql).toContain('public.wk_adjust_prescriptions_atomic(uuid,date,jsonb,text[],text,text,jsonb)');
    expect(sql).toContain("E'BEGIN\\n  PERFORM public.wk_lock_plan_day(p_user, p_date);\\n'");
    expect(sql).toContain('overlay(definition placing guard from position(marker IN definition) for length(marker))');
  });
  it('rejects malformed or already-patched writers rather than silently releasing one unlocked', () => {
    expect(sql).toContain("RAISE EXCEPTION 'Plan writer already has a lock: %'");
    expect(sql).toContain("RAISE EXCEPTION 'Plan writer body could not be checked: %'");
  });
  it('does not allow athlete clients or anonymous callers to execute the trusted lock', () => {
    expect(sql).toContain('FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('TO service_role;');
  });
});