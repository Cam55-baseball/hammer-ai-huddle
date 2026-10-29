export type HealthCheck = { name: string; passed: boolean | null };
export function ownerHealth(checks: readonly HealthCheck[], critical: number, warnings: number, readFailed: boolean) {
  const failed = checks.filter(c => c.passed === false);
  const missing = checks.filter(c => c.passed === null);
  const status = critical > 0 || failed.length > 0 ? 'red' : readFailed || missing.length > 0 || warnings > 0 ? 'yellow' : 'green';
  return { status, failed, missing } as const;
}