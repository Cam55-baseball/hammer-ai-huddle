// Forward-compatible JSONB migration registry.
// Register up-migrations per (table, column). Read-side calls migrateJsonb
// to ensure ancient payloads are read at the latest shape without backfill.
type Migrator = (payload: any) => any;
const registry: Record<string, Record<number, Migrator>> = {};

export function registerJsonbMigration(key: string, fromVersion: number, fn: Migrator) {
  registry[key] = registry[key] ?? {};
  registry[key][fromVersion] = fn;
}

export function migrateJsonb<T = any>(key: string, payload: any, currentVersion: number, targetVersion: number): T {
  let v = currentVersion;
  let p = payload;
  while (v < targetVersion) {
    const migrator = registry[key]?.[v];
    if (!migrator) break;
    p = migrator(p);
    v++;
  }
  return p as T;
}
