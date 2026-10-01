/**
 * reportEngine — one engine, three products.
 *
 * Every report (individual postgame, team postgame, opponent scouting) is
 * built into the SAME snapshot shape so a single renderer can draw it, a
 * single edge function can share it, and a printed PDF is byte-identical to
 * what was on screen.
 *
 * Snapshots are stored, never recomputed: a share link must show exactly
 * what was sent.
 */

import { asGameSport, pitchTypeLabel, pitchFamily, zoneEmphasis, type GameSport } from "./sportRules";
import { zoneLabels, type ZoneId } from "./zoneMath";

export type ReportKind = "individual_postgame" | "team_postgame" | "opponent_scouting";

export interface StatLine {
  label: string;
  value: string;
  /** optional supporting detail rendered small under the value */
  detail?: string;
  /** "good" | "watch" | "bad" | undefined — drives the accent color */
  tone?: "good" | "watch" | "bad";
}

export interface TableBlock {
  columns: string[];
  rows: (string | number)[][];
}

export interface HeatBlock {
  /** zone id -> value */
  values: Partial<Record<ZoneId, number>>;
  labels: Partial<Record<ZoneId, string>>;
  caption?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  /** one-line coach-legible summary of what this section proves */
  summary?: string;
  stats?: StatLine[];
  table?: TableBlock;
  heat?: HeatBlock;
  bullets?: string[];
}

export interface ReportSnapshot {
  kind: ReportKind;
  sport: GameSport;
  title: string;
  subtitle?: string;
  generatedAt: string;
  /** headline numbers shown at the very top */
  headline: StatLine[];
  sections: ReportSection[];
  /** the two things to train next — the whole point of the report */
  nextUp: string[];
  footnote?: string;
}

/* ---------------------------------------------------------------- helpers */

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
};

const pct = (n: number, d: number): string => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

const avg = (xs: number[]): number | null =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

const one = (n: number | null, suffix = ""): string =>
  n == null ? "—" : `${Math.round(n * 10) / 10}${suffix}`;

const IN_PLAY_HIT = ["1B", "2B", "3B", "HR", "single", "double", "triple", "home_run"];
const AT_BAT_NON_AB = ["BB", "walk", "HBP", "hbp", "SF", "sac_fly", "SAC", "sac_bunt", "catchers_interference"];

export interface GameRow {
  id: string;
  game_date?: string | null;
  sport?: string | null;
  opponent_team?: string | null;
  venue?: string | null;
  home_away?: string | null;
  game_type?: string | null;
  status?: string | null;
  result?: string | null;
}

export interface AtBatRow {
  inning?: number | null;
  result?: string | null;
  batting_side?: string | null;
  exit_velo?: number | null;
  launch_angle?: number | null;
  exit_direction?: string | null;
  contact_quality?: string | null;
  rbi?: number | null;
  pitch_type?: string | null;
  pitcher_name?: string | null;
  notes?: string | null;
}

export interface PitchRow {
  perspective?: string | null;
  inning?: number | null;
  pitch_no?: number | null;
  pitch_type?: string | null;
  pitch_velo?: number | null;
  location?: any;
  result?: string | null;
  count_balls?: number | null;
  count_strikes?: number | null;
  batter_handedness?: string | null;
  pitcher_throws?: string | null;
  pitcher_arm_slot?: string | null;
  swing?: boolean | null;
}

export interface DefenseRow {
  position?: string | null;
  play_type?: string | null;
  result?: string | null;
  error_flag?: boolean | null;
  notes?: string | null;
}

export interface BaserunRow {
  event_type?: string | null;
  success?: boolean | null;
  run_time_sec?: number | null;
  pitch_type_ran_on?: string | null;
}

export interface BuildIndividualInput {
  game: GameRow;
  athleteName?: string | null;
  atBats: AtBatRow[];
  pitches: PitchRow[];
  defense: DefenseRow[];
  baserun: BaserunRow[];
  plan?: { plan_text?: string | null; keys?: any } | null;
  planOutcome?: { verdict?: string | null; notes?: string | null } | null;
}

/* ------------------------------------------------------------ zone helpers */

function zoneOf(p: PitchRow): ZoneId | null {
  const z = p?.location?.zone;
  const n = typeof z === "number" ? z : parseInt(String(z ?? ""), 10);
  if (n >= 1 && n <= 9) return String(n) as ZoneId;
  return null;
}

function isChase(p: PitchRow): boolean {
  // out of zone and swung at
  const inZone = zoneOf(p) != null;
  return !inZone && didSwing(p);
}

function didSwing(p: PitchRow): boolean {
  if (typeof p.swing === "boolean") return p.swing;
  return ["swinging_strike", "foul", "in_play", "bunt_foul", "bunt_in_play"].includes(
    String(p.result ?? ""),
  );
}

function isWhiff(p: PitchRow): boolean {
  return String(p.result ?? "") === "swinging_strike";
}

function countBucket(p: PitchRow): "ahead" | "even" | "behind" {
  const b = p.count_balls ?? 0;
  const s = p.count_strikes ?? 0;
  if (b > s) return "ahead"; // hitter ahead
  if (s > b) return "behind";
  return "even";
}

/* -------------------------------------------------- individual postgame */

export function buildIndividualPostgame(input: BuildIndividualInput): ReportSnapshot {
  const sport = asGameSport(input.game.sport);
  const zl = zoneLabels(sport as any);
  const ab = input.atBats ?? [];
  const pitches = input.pitches ?? [];
  const asHitter = pitches.filter((p) => p.perspective === "hitter");
  const asPitcher = pitches.filter((p) => p.perspective === "pitcher");
  const def = input.defense ?? [];
  const run = input.baserun ?? [];

  /* ---- hitting line */
  const plateAppearances = ab.length;
  const officialAb = ab.filter((a) => !AT_BAT_NON_AB.includes(String(a.result ?? ""))).length;
  const hits = ab.filter((a) => IN_PLAY_HIT.includes(String(a.result ?? ""))).length;
  const rbi = ab.reduce((s, a) => s + (num(a.rbi) ?? 0), 0);
  const walks = ab.filter((a) => ["BB", "walk"].includes(String(a.result ?? ""))).length;
  const ks = ab.filter((a) => ["K", "strikeout", "SO"].includes(String(a.result ?? ""))).length;
  const evs = ab.map((a) => num(a.exit_velo)).filter((n): n is number => n != null);
  const hardHit = evs.filter((v) => v >= (sport === "softball" ? 68 : 90)).length;

  const headline: StatLine[] = [];
  if (plateAppearances > 0) {
    headline.push({
      label: "Line",
      value: `${hits}-for-${officialAb || plateAppearances}`,
      detail: `${rbi} RBI · ${walks} BB · ${ks} K`,
      tone: officialAb > 0 && hits / officialAb >= 0.333 ? "good" : undefined,
    });
    if (evs.length) {
      headline.push({
        label: "Avg exit velo",
        value: one(avg(evs), " mph"),
        detail: `Hard-hit ${hardHit}/${evs.length}`,
        tone: hardHit / evs.length >= 0.4 ? "good" : hardHit === 0 ? "watch" : undefined,
      });
    }
  }
  if (asPitcher.length) {
    const strikes = asPitcher.filter((p) =>
      ["called_strike", "swinging_strike", "foul", "in_play", "bunt_foul", "bunt_in_play"].includes(
        String(p.result ?? ""),
      ),
    ).length;
    headline.push({
      label: "Pitches",
      value: String(asPitcher.length),
      detail: `Strike ${pct(strikes, asPitcher.length)}`,
      tone: strikes / asPitcher.length >= 0.62 ? "good" : "watch",
    });
  }
  if (def.length) {
    const clean = def.filter((d) => !d.error_flag).length;
    headline.push({
      label: "Defense",
      value: `${clean}/${def.length}`,
      detail: "clean plays",
      tone: clean === def.length ? "good" : "watch",
    });
  }
  if (run.length) {
    const okRuns = run.filter((r) => r.success).length;
    headline.push({ label: "Base running", value: `${okRuns}/${run.length}`, detail: "successful" });
  }

  const sections: ReportSection[] = [];
  const nextUp: string[] = [];

  /* ---- plate discipline */
  if (asHitter.length) {
    const swings = asHitter.filter(didSwing);
    const chases = asHitter.filter(isChase);
    const whiffs = asHitter.filter(isWhiff);
    const zoneCounts: Partial<Record<ZoneId, number>> = {};
    const zoneWhiff: Partial<Record<ZoneId, number>> = {};
    asHitter.forEach((p) => {
      const z = zoneOf(p);
      if (!z) return;
      zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
      if (isWhiff(p)) zoneWhiff[z] = (zoneWhiff[z] ?? 0) + 1;
    });
    const labels: Partial<Record<ZoneId, string>> = {};
    (Object.keys(zoneCounts) as ZoneId[]).forEach((z) => {
      labels[z] = `${zl[z]} · ${zoneCounts[z]} seen${zoneWhiff[z] ? ` · ${zoneWhiff[z]} whiff` : ""}`;
    });

    const chaseRate = swings.length ? chases.length / swings.length : 0;
    sections.push({
      id: "discipline",
      title: "Plate discipline",
      summary: zoneEmphasis(sport),
      stats: [
        { label: "Pitches seen", value: String(asHitter.length) },
        { label: "Swing rate", value: pct(swings.length, asHitter.length) },
        {
          label: "Chase rate",
          value: pct(chases.length, swings.length || 1),
          detail: `${chases.length} chases`,
          tone: chaseRate > 0.3 ? "bad" : chaseRate > 0.2 ? "watch" : "good",
        },
        {
          label: "Whiff rate",
          value: pct(whiffs.length, swings.length || 1),
          tone: swings.length && whiffs.length / swings.length > 0.3 ? "watch" : undefined,
        },
      ],
      heat: Object.keys(zoneCounts).length
        ? { values: zoneCounts, labels, caption: "Pitches seen by zone (catcher's view)" }
        : undefined,
      bullets: countBullets(asHitter),
    });
    if (chaseRate > 0.25) {
      nextUp.push(
        sport === "softball"
          ? "Chase control on the rise lane — take-to-hit reps with the top of the zone as the hard line."
          : "Chase control below the zone — take-to-hit reps with a strict bottom-of-zone line.",
      );
    }
  }

  /* ---- contact quality */
  if (ab.length) {
    const spray: Record<string, number> = {};
    ab.forEach((a) => {
      const d = String(a.exit_direction ?? "").trim();
      if (d) spray[d] = (spray[d] ?? 0) + 1;
    });
    sections.push({
      id: "contact",
      title: "Contact quality & spray",
      summary: evs.length
        ? `Average ${one(avg(evs), " mph")} exit velo across ${evs.length} tracked balls.`
        : "No exit velo tracked this game — log it next time and the trend line starts.",
      stats: [
        { label: "Plate appearances", value: String(plateAppearances) },
        { label: "Hard-hit", value: evs.length ? pct(hardHit, evs.length) : "—" },
        {
          label: "Avg launch angle",
          value: one(avg(ab.map((a) => num(a.launch_angle)).filter((n): n is number => n != null)), "°"),
        },
        { label: "Strikeouts", value: String(ks), tone: ks >= 2 ? "watch" : undefined },
      ],
      table: ab.length
        ? {
            columns: ["Inn", "Pitcher", "Result", "EV", "Direction"],
            rows: ab.map((a) => [
              a.inning ?? "—",
              a.pitcher_name ?? "—",
              a.result ?? "—",
              a.exit_velo != null ? `${a.exit_velo}` : "—",
              a.exit_direction ?? "—",
            ]),
          }
        : undefined,
      bullets: Object.entries(spray).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`),
    });
    if (evs.length && hardHit === 0) {
      nextUp.push("Contact quality — intent + barrel-accuracy block until hard-hit shows up in game.");
    }
  }

  /* ---- as pitcher */
  if (asPitcher.length) {
    const byType: Record<string, { n: number; strikes: number; velos: number[] }> = {};
    asPitcher.forEach((p) => {
      const t = String(p.pitch_type ?? "unknown");
      byType[t] ??= { n: 0, strikes: 0, velos: [] };
      byType[t].n += 1;
      if (
        ["called_strike", "swinging_strike", "foul", "in_play", "bunt_foul", "bunt_in_play"].includes(
          String(p.result ?? ""),
        )
      )
        byType[t].strikes += 1;
      const v = num(p.pitch_velo);
      if (v != null) byType[t].velos.push(v);
    });
    const firstPitch = asPitcher.filter((p) => (p.count_balls ?? 0) === 0 && (p.count_strikes ?? 0) === 0);
    const fpStrikes = firstPitch.filter((p) => String(p.result ?? "") !== "ball").length;
    const twoStrike = asPitcher.filter((p) => (p.count_strikes ?? 0) === 2);
    const putaway = twoStrike.filter((p) => isWhiff(p) || String(p.result ?? "") === "called_strike").length;

    sections.push({
      id: "pitching",
      title: "Pitching — usage & execution",
      summary: `${asPitcher.length} pitches logged across ${new Set(asPitcher.map((p) => p.inning)).size} inning(s).`,
      stats: [
        {
          label: "First-pitch strike",
          value: pct(fpStrikes, firstPitch.length || 1),
          detail: `${fpStrikes}/${firstPitch.length}`,
          tone: firstPitch.length && fpStrikes / firstPitch.length >= 0.6 ? "good" : "watch",
        },
        {
          label: "Put-away (2K)",
          value: pct(putaway, twoStrike.length || 1),
          detail: `${putaway}/${twoStrike.length}`,
        },
        {
          label: "Velo (peak)",
          value: one(
            Math.max(...asPitcher.map((p) => num(p.pitch_velo) ?? 0), 0) || null,
            " mph",
          ),
        },
      ],
      table: {
        columns: ["Pitch", "Family", "#", "Usage", "Strike%", "Avg velo"],
        rows: Object.entries(byType)
          .sort((a, b) => b[1].n - a[1].n)
          .map(([t, s]) => [
            pitchTypeLabel(sport, t),
            pitchFamily(sport, t),
            s.n,
            pct(s.n, asPitcher.length),
            pct(s.strikes, s.n),
            one(avg(s.velos), ""),
          ]),
      },
    });
    if (firstPitch.length && fpStrikes / firstPitch.length < 0.55) {
      nextUp.push("First-pitch strike rate — command block starting every bullpen with 0-0 execution.");
    }
  }

  /* ---- defense */
  if (def.length) {
    const byType: Record<string, { n: number; clean: number }> = {};
    def.forEach((d) => {
      const t = String(d.play_type ?? "unknown");
      byType[t] ??= { n: 0, clean: 0 };
      byType[t].n += 1;
      if (!d.error_flag) byType[t].clean += 1;
    });
    sections.push({
      id: "defense",
      title: "Defense",
      summary: `${def.length} chance(s) logged.`,
      table: {
        columns: ["Play type", "Chances", "Clean", "Clean%"],
        rows: Object.entries(byType).map(([t, s]) => [
          t.replace(/_/g, " "),
          s.n,
          s.clean,
          pct(s.clean, s.n),
        ]),
      },
      bullets: def.filter((d) => d.notes).map((d) => String(d.notes)),
    });
    const errs = def.filter((d) => d.error_flag).length;
    if (errs) nextUp.push(`Defense — ${errs} miss(es) this game; rebuild the footwork pattern on that play type.`);
  }

  /* ---- base running */
  if (run.length) {
    const okRuns = run.filter((r) => r.success).length;
    sections.push({
      id: "baserunning",
      title: "Base running",
      summary: `${okRuns}/${run.length} successful.`,
      table: {
        columns: ["Event", "Result", "Ran on", "Time"],
        rows: run.map((r) => [
          String(r.event_type ?? "—").replace(/_/g, " "),
          r.success ? "success" : "no",
          pitchTypeLabel(sport, r.pitch_type_ran_on),
          r.run_time_sec != null ? `${r.run_time_sec}s` : "—",
        ]),
      },
    });
  }

  /* ---- plan vs reality */
  if (input.plan?.plan_text || input.planOutcome) {
    sections.push({
      id: "plan",
      title: "Plan vs reality",
      summary: input.planOutcome?.verdict
        ? `Verdict: ${input.planOutcome.verdict}`
        : "Pregame plan logged — verdict not recorded.",
      bullets: [
        ...(input.plan?.plan_text ? [`Plan: ${input.plan.plan_text}`] : []),
        ...(input.planOutcome?.notes ? [`Outcome: ${input.planOutcome.notes}`] : []),
      ],
    });
  }

  if (!nextUp.length) {
    nextUp.push("Hold the standard — nothing in this game breaks the plan. Keep the same prep.");
  }

  const g = input.game;
  return {
    kind: "individual_postgame",
    sport,
    title: `${input.athleteName ? `${input.athleteName} — ` : ""}Postgame report`,
    subtitle: [
      g.game_date ?? "",
      g.opponent_team ? `vs ${g.opponent_team}` : "",
      g.home_away ? `(${g.home_away})` : "",
      g.venue ?? "",
    ]
      .filter(Boolean)
      .join(" · "),
    generatedAt: new Date().toISOString(),
    headline,
    sections,
    nextUp: nextUp.slice(0, 3),
    footnote: "Built from the athlete's own logged ledger. Numbers are exactly what was recorded.",
  };
}

function countBullets(asHitter: PitchRow[]): string[] {
  const buckets: Record<string, { n: number; swings: number; whiff: number }> = {
    ahead: { n: 0, swings: 0, whiff: 0 },
    even: { n: 0, swings: 0, whiff: 0 },
    behind: { n: 0, swings: 0, whiff: 0 },
  };
  asHitter.forEach((p) => {
    const b = countBucket(p);
    buckets[b].n += 1;
    if (didSwing(p)) buckets[b].swings += 1;
    if (isWhiff(p)) buckets[b].whiff += 1;
  });
  return Object.entries(buckets)
    .filter(([, v]) => v.n > 0)
    .map(
      ([k, v]) =>
        `${k === "ahead" ? "Hitter ahead" : k === "behind" ? "Hitter behind" : "Even counts"}: ${v.n} pitches, ${pct(
          v.swings,
          v.n,
        )} swing, ${v.whiff} whiff`,
    );
}

/* ------------------------------------------------------ opponent scouting */

export interface BuildScoutingInput {
  sport: string;
  opponent: string;
  pitcherDossiers: any[];
  opponentHitters: any[];
  /** every pitch this athlete/team logged against that opponent */
  pitches: PitchRow[];
  atBats: AtBatRow[];
}

export function buildScoutingReport(input: BuildScoutingInput): ReportSnapshot {
  const sport = asGameSport(input.sport);
  const zl = zoneLabels(sport as any);
  const sections: ReportSection[] = [];
  const nextUp: string[] = [];

  /* pitcher arsenals — dossier + observed */
  (input.pitcherDossiers ?? []).forEach((d, i) => {
    const arsenal: any[] = Array.isArray(d.arsenal) ? d.arsenal : [];
    const observed = (input.pitches ?? []).filter(
      (p) => p.perspective === "hitter" && String((p as any).pitcher_name ?? "") === String(d.name ?? ""),
    );
    const usage: Record<string, number> = {};
    observed.forEach((p) => {
      const t = String(p.pitch_type ?? "unknown");
      usage[t] = (usage[t] ?? 0) + 1;
    });
    sections.push({
      id: `pitcher-${i}`,
      title: `Pitcher — ${d.name ?? "unknown"}`,
      summary: [
        d.throws ? `Throws ${d.throws}` : "",
        d.arm_slot ? String(d.arm_slot).replace(/_/g, " ") : "",
        d.velo_band ? `Velo ${d.velo_band}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      table: arsenal.length
        ? {
            columns: ["Pitch", "Velo", "Usage", "Notes"],
            rows: arsenal.map((a: any) => [
              pitchTypeLabel(sport, a.type ?? a.pitch_type),
              a.velo ?? a.velo_band ?? "—",
              a.usage ?? (usage[a.type] ? `${usage[a.type]} seen` : "—"),
              a.notes ?? "—",
            ]),
          }
        : Object.keys(usage).length
          ? {
              columns: ["Pitch", "Times seen"],
              rows: Object.entries(usage).map(([t, n]) => [pitchTypeLabel(sport, t), n]),
            }
          : undefined,
      bullets: [
        ...(d.tendencies ? [String(d.tendencies)] : []),
        ...(d.attack_plan ? [`Attack: ${d.attack_plan}`] : []),
        ...(d.notes ? [String(d.notes)] : []),
      ],
    });
    if (d.attack_plan) nextUp.push(`vs ${d.name}: ${d.attack_plan}`);
  });

  /* opponent hitters */
  if ((input.opponentHitters ?? []).length) {
    sections.push({
      id: "hitters",
      title: "Opponent hitters",
      summary: `${input.opponentHitters.length} hitter(s) profiled.`,
      table: {
        columns: ["Hitter", "Side", "Power", "Run", "Attack"],
        rows: input.opponentHitters.map((h: any) => [
          h.name ?? "—",
          h.bats ?? "—",
          h.power_grade ?? "—",
          h.speed_grade ?? "—",
          h.attack_plan ?? h.notes ?? "—",
        ]),
      },
    });
  }

  /* observed zone tendencies */
  const zoneCounts: Partial<Record<ZoneId, number>> = {};
  (input.pitches ?? []).forEach((p) => {
    const z = zoneOf(p);
    if (z) zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
  });
  if (Object.keys(zoneCounts).length) {
    const labels: Partial<Record<ZoneId, string>> = {};
    (Object.keys(zoneCounts) as ZoneId[]).forEach((z) => {
      labels[z] = `${zl[z]} · ${zoneCounts[z]}`;
    });
    sections.push({
      id: "zones",
      title: "Where they live",
      summary: zoneEmphasis(sport),
      heat: { values: zoneCounts, labels, caption: "Observed pitch locations vs us" },
    });
  }

  if (!nextUp.length) nextUp.push("Fill the dossier attack plans — the report gets sharper with every logged pitch.");

  return {
    kind: "opponent_scouting",
    sport,
    title: `Scouting report — ${input.opponent}`,
    subtitle: `${sport === "softball" ? "Softball" : "Baseball"} · built from dossiers + every logged pitch against them`,
    generatedAt: new Date().toISOString(),
    headline: [
      { label: "Pitchers profiled", value: String((input.pitcherDossiers ?? []).length) },
      { label: "Hitters profiled", value: String((input.opponentHitters ?? []).length) },
      { label: "Pitches logged", value: String((input.pitches ?? []).length) },
    ],
    sections,
    nextUp: nextUp.slice(0, 4),
  };
}

/* ---------------------------------------------------------- team postgame */

export interface TeamAthleteInput {
  athleteId: string;
  athleteName: string;
  atBats: AtBatRow[];
  pitches: PitchRow[];
  defense: DefenseRow[];
  baserun: BaserunRow[];
}

export function buildTeamPostgame(
  game: GameRow,
  teamName: string,
  athletes: TeamAthleteInput[],
): ReportSnapshot {
  const sport = asGameSport(game.sport);
  const rows: (string | number)[][] = [];
  let teamHits = 0;
  let teamAb = 0;
  let teamK = 0;
  let teamBb = 0;
  const standouts: string[] = [];
  const redFlags: string[] = [];

  athletes.forEach((a) => {
    const abs = a.atBats ?? [];
    const official = abs.filter((x) => !AT_BAT_NON_AB.includes(String(x.result ?? ""))).length;
    const hits = abs.filter((x) => IN_PLAY_HIT.includes(String(x.result ?? ""))).length;
    const ks = abs.filter((x) => ["K", "strikeout", "SO"].includes(String(x.result ?? ""))).length;
    const bb = abs.filter((x) => ["BB", "walk"].includes(String(x.result ?? ""))).length;
    const rbi = abs.reduce((s, x) => s + (num(x.rbi) ?? 0), 0);
    teamHits += hits;
    teamAb += official;
    teamK += ks;
    teamBb += bb;
    const pitchCount = (a.pitches ?? []).filter((p) => p.perspective === "pitcher").length;
    const errs = (a.defense ?? []).filter((d) => d.error_flag).length;
    rows.push([a.athleteName, official, hits, rbi, bb, ks, pitchCount || "—", errs]);
    if (official > 0 && hits / official >= 0.5) standouts.push(`${a.athleteName}: ${hits}-for-${official}`);
    if (ks >= 3) redFlags.push(`${a.athleteName}: ${ks} strikeouts`);
    if (errs >= 2) redFlags.push(`${a.athleteName}: ${errs} defensive misses`);
    if (pitchCount >= 90) redFlags.push(`${a.athleteName}: ${pitchCount} pitches — check rest requirement`);
  });

  const staffRows = athletes
    .map((a) => {
      const ps = (a.pitches ?? []).filter((p) => p.perspective === "pitcher");
      if (!ps.length) return null;
      const strikes = ps.filter((p) => String(p.result ?? "") !== "ball").length;
      return [
        a.athleteName,
        ps.length,
        pct(strikes, ps.length),
        one(avg(ps.map((p) => num(p.pitch_velo)).filter((n): n is number => n != null)), ""),
        new Set(ps.map((p) => p.inning)).size,
      ] as (string | number)[];
    })
    .filter(Boolean) as (string | number)[][];

  const sections: ReportSection[] = [
    {
      id: "lineup",
      title: "Lineup performance",
      summary: `${athletes.length} athlete(s) with logged data.`,
      table: {
        columns: ["Athlete", "AB", "H", "RBI", "BB", "K", "Pitches", "E"],
        rows,
      },
    },
  ];
  if (staffRows.length) {
    sections.push({
      id: "staff",
      title: "Pitching staff",
      summary: "Usage and pitch counts — rest requirements follow from here.",
      table: { columns: ["Pitcher", "Pitches", "Strike%", "Avg velo", "Innings"], rows: staffRows },
    });
  }
  if (standouts.length) sections.push({ id: "standouts", title: "Standouts", bullets: standouts });
  if (redFlags.length) sections.push({ id: "flags", title: "Red flags", bullets: redFlags });

  return {
    kind: "team_postgame",
    sport,
    title: `${teamName} — team postgame report`,
    subtitle: [game.game_date ?? "", game.opponent_team ? `vs ${game.opponent_team}` : ""]
      .filter(Boolean)
      .join(" · "),
    generatedAt: new Date().toISOString(),
    headline: [
      { label: "Team line", value: `${teamHits}-for-${teamAb}`, detail: `${teamBb} BB · ${teamK} K` },
      { label: "Athletes logged", value: String(athletes.length) },
    ],
    sections,
    nextUp: redFlags.length ? redFlags.slice(0, 3) : ["Nothing structural broke — hold the week's plan."],
  };
}
