#!/usr/bin/env -S bun run
/**
 * lint-side-context — fails CI when a file that imports `SideContextPicker`
 * or `getSideFor` performs an `.insert(...)` / `.upsert(...)` on a side-aware
 * table without including a `side` field in the payload.
 *
 * Intentionally conservative: only flags the surface that already knows
 * about Side Context. Files that have no awareness of side are not policed.
 *
 * Side-aware tables (write surfaces): videos, vault_saved_drills,
 * drill_assignments, pending_drills, athlete_body_goals,
 * daily_standard_checks, mpi_scores, calendar_events.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SIDE_TABLES = [
  "videos",
  "vault_saved_drills",
  "drill_assignments",
  "pending_drills",
  "athlete_body_goals",
  "daily_standard_checks",
  "mpi_scores",
  "calendar_events",
];

const SRC_DIRS = ["src"];
const EXTS = [".ts", ".tsx"];

interface Violation {
  file: string;
  table: string;
  line: number;
  snippet: string;
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      yield* walk(p);
    } else if (EXTS.some((e) => p.endsWith(e))) {
      yield p;
    }
  }
}

function scan(): Violation[] {
  const out: Violation[] = [];
  for (const dir of SRC_DIRS) {
    for (const file of walk(dir)) {
      const txt = readFileSync(file, "utf8");
      const sideAware =
        txt.includes("SideContextPicker") ||
        txt.includes("getSideFor") ||
        txt.includes("useSideContext");
      if (!sideAware) continue;

      for (const tbl of SIDE_TABLES) {
        const re = new RegExp(
          `\\.from\\(['"\`]${tbl}['"\`]\\)[\\s\\S]{0,400}?\\.(insert|upsert)\\s*\\(([\\s\\S]{0,1200}?)\\)\\s*(?:\\.(select|then)|;|$)`,
          "gm",
        );
        let m: RegExpExecArray | null;
        while ((m = re.exec(txt))) {
          const payload = m[2];
          // Accept any of: literal `side:`, canonical sided columns on
          // `videos` (`batting_side` / `throwing_hand`), or a spread that
          // includes `side` (e.g. `...(side ? { side } : {})`).
          if (
            /\bside\b\s*:/.test(payload) ||
            /\bbatting_side\b\s*:/.test(payload) ||
            /\bthrowing_hand\b\s*:/.test(payload) ||
            /\.\.\.[^)]*\bside\b/.test(payload)
          ) continue;
          const idx = m.index;
          const line = txt.slice(0, idx).split("\n").length;
          out.push({
            file,
            table: tbl,
            line,
            snippet: m[0].slice(0, 120).replace(/\s+/g, " "),
          });
        }
      }
    }
  }
  return out;
}

const v = scan();
if (v.length) {
  console.error(`[lint-side-context] ${v.length} violation(s):`);
  for (const x of v) {
    console.error(`  ${x.file}:${x.line} — ${x.table} insert/upsert missing 'side'`);
    console.error(`    ${x.snippet}`);
  }
  process.exit(1);
}
console.log("[lint-side-context] PASS — all side-aware writes include 'side'.");
