import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { PARKED_TABLES, PARKED_COLUMNS, PARKED_SWITCHES, PARKED_CRON_FUNCTIONS } from "@/lib/flags/parkedRegistry";
import { PARKED_UI } from "@/lib/flags/parked";

const doc = readFileSync("docs/wic/parked-features.md", "utf8");
const migrations = readdirSync("supabase/migrations").map((f) => readFileSync(join("supabase/migrations", f), "utf8")).join("\n");

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !p.includes("integrations/supabase/types") && !p.includes("parkedRegistry") && !p.includes("/test/")) out.push(p);
  }
  return out;
}

describe("parked items pass the dead-end audit only when locked, labelled and listed", () => {
  it.each([...PARKED_TABLES, ...PARKED_COLUMNS, ...PARKED_SWITCHES, ...PARKED_CRON_FUNCTIONS])("%s is listed in parked-features.md", (k) => {
    expect(doc).toContain(k);
  });
  it.each(PARKED_TABLES)("%s is locked and labelled in a migration", (t) => {
    expect(migrations).toMatch(new RegExp(`COMMENT ON TABLE public\\.${t} IS 'PARKED`));
    expect(migrations).toContain(`'${t}'`); // in the lock loop (RLS on, grants revoked)
  });
  it.each(PARKED_COLUMNS)("%s is labelled", (c) => {
    expect(migrations).toContain(`COMMENT ON COLUMN public.${c} IS 'PARKED`);
  });
  it("no app or function code reads a parked table", () => {
    const files = [...walk("src"), ...walk("supabase/functions")];
    for (const f of files) {
      const s = readFileSync(f, "utf8");
      for (const t of PARKED_TABLES) expect(s.includes(`from("${t}")`) || s.includes(`from('${t}')`), `${f} reads ${t}`).toBe(false);
    }
  });
  it("parked cron functions keep their code", () => {
    for (const fn of PARKED_CRON_FUNCTIONS) expect(existsSync(`supabase/functions/${fn}/index.ts`)).toBe(true);
  });
  it("every parked UI switch is off", () => {
    for (const [k, v] of Object.entries(PARKED_UI)) expect(v, k).toBe(false);
  });
});
