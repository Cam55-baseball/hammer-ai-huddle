// Iq Alignment Audit — validates every published situation resolves to a
// legal defensive alignment for baseball+softball × RHH+LHH × representative
// game states. Writes results to iq_alignment_audit_runs / findings.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Sport = "baseball" | "softball";
type Hand = "R" | "L";
type RunnerBase = "1B" | "2B" | "3B";

interface GameState {
  batterSide: Hand;
  runners: RunnerBase[];
  outs: number;
  count?: { balls: number; strikes: number };
}
interface AlignmentRule {
  when?: {
    runners?: RunnerBase[]; runners_any?: RunnerBase[]; outs?: number[];
    batter_side?: "R" | "L" | "any";
    count?: { balls_gte?: number; balls_lte?: number; strikes_gte?: number; strikes_lte?: number };
  };
  preset: string;
}
interface AlignmentSelector { rules?: AlignmentRule[]; default?: string }

// ---- geometry helpers (mirror of fieldModel.ts, self-contained) ----
const SPORT_CFG = {
  baseball: { baseDist: 90, moundDist: 60.5, fenceRef: 330, stepFt: 2.5 },
  softball: { baseDist: 60, moundDist: 43,   fenceRef: 220, stepFt: 2.0 },
} as const;

function fieldPoints(sport: Sport) {
  const s = SPORT_CFG[sport];
  const gpf = 85 / s.fenceRef;
  const home = { x: 50, y: 95 };
  const diag = s.baseDist * Math.SQRT1_2 * gpf;
  const first  = { x: home.x + diag, y: home.y - diag };
  const third  = { x: home.x - diag, y: home.y - diag };
  const second = { x: home.x,        y: home.y - 2 * diag };
  const mound  = { x: home.x,        y: home.y - s.moundDist * gpf };
  return { home, first, second, third, mound, gpf, s };
}
function clamp(v: number, lo = 2, hi = 98) { return Math.max(lo, Math.min(hi, v)); }
function anchorToPos(sport: Sport, anchor: any, hand: Hand) {
  const f = fieldPoints(sport);
  const stepG = f.s.stepFt * f.gpf;
  const add = (a: any, b: any) => ({ x: a.x + b.x, y: a.y + b.y });
  const sub = (a: any, b: any) => ({ x: a.x - b.x, y: a.y - b.y });
  const scale = (a: any, k: number) => ({ x: a.x * k, y: a.y * k });
  const len = (a: any) => Math.hypot(a.x, a.y) || 1;
  const unit = (a: any) => ({ x: a.x / len(a), y: a.y / len(a) });
  const perpAway = (from: any) => { const u = unit(sub(f.home, from)); return { x: -u.x, y: -u.y }; };
  const pickBag = (n: string) => n === "1B" ? f.first : n === "3B" ? f.third : f.second;
  switch (anchor.kind) {
    case "mound": return { ...f.mound };
    case "plate": return { x: f.home.x, y: f.home.y + 1.5 };
    case "corner_bag": {
      const bag = anchor.bag === "1B" ? f.first : f.third;
      const t = unit(sub(f.second, bag));
      const back = perpAway(bag);
      const p = add(add(bag, scale(t, anchor.towardSecond * stepG)), scale(back, anchor.backFromBag * stepG));
      return { x: clamp(p.x), y: clamp(p.y) };
    }
    case "middle_bag": {
      const from = pickBag(anchor.fromBag); const to = pickBag(anchor.towardBag);
      const t = unit(sub(to, from));
      const line = add(from, scale(t, anchor.feetFromFromBag * f.gpf));
      const back = perpAway(line);
      const p = add(line, scale(back, anchor.backSteps * stepG));
      return { x: clamp(p.x), y: clamp(p.y) };
    }
    case "outfield": {
      const axis = unit(sub(f.second, f.home));
      const depth = add(f.home, scale(axis, anchor.depthStepsFromHome * stepG));
      const lat = { x: axis.y, y: -axis.x };
      const sign = hand === "R" ? 1 : -1;
      const p = add(depth, scale(lat, anchor.lateralStepsRightOfSecond * stepG * sign));
      return { x: clamp(p.x), y: clamp(p.y) };
    }
  }
  return { x: 50, y: 50 };
}
function anchorsToPositions(sport: Sport, anchors: any, hand: Hand) {
  const out: Record<string, { x: number; y: number }> = {};
  for (const k of Object.keys(anchors ?? {})) {
    if (anchors[k]) out[k] = anchorToPos(sport, anchors[k], hand);
  }
  return out;
}
function findOffField(pos: Record<string, { x: number; y: number }>) {
  const off: string[] = [];
  for (const [role, p] of Object.entries(pos)) {
    if (!p) continue;
    if (p.x < 2 || p.x > 98 || p.y < 2 || p.y > 98) off.push(role);
    else if (p.y > 100 - Math.abs(p.x - 50) + 2) off.push(role);
  }
  return off;
}
function estimateCoverage(pos: Record<string, { x: number; y: number }>, radii: Record<string, number>) {
  const N = 30; let inside = 0, covered = 0;
  const roles = Object.keys(pos);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i + 0.5) * (100 / N); const y = (j + 0.5) * (100 / N);
    if (y > 100 - Math.abs(x - 50) || y < 5) continue;
    inside++;
    for (const r of roles) {
      const p = pos[r]; if (!p) continue;
      const rad = radii[r] ?? 10;
      const dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy <= rad * rad) { covered++; break; }
    }
  }
  return inside === 0 ? 0 : Math.round((covered / inside) * 100);
}

function eqSet(a: string[], b: string[]) { return a.length === b.length && a.every((x) => b.includes(x)); }
function ruleMatches(rule: AlignmentRule, s: GameState): boolean {
  const w = rule.when ?? {};
  if (w.runners !== undefined && !eqSet(w.runners as any, s.runners)) return false;
  if (w.runners_any !== undefined && !(w.runners_any as any).some((r: any) => s.runners.includes(r))) return false;
  if (w.outs !== undefined && !w.outs.includes(s.outs)) return false;
  if (w.batter_side && w.batter_side !== "any" && w.batter_side !== s.batterSide) return false;
  if (w.count && s.count) {
    const c = w.count;
    if (c.balls_gte !== undefined && s.count.balls < c.balls_gte) return false;
    if (c.balls_lte !== undefined && s.count.balls > c.balls_lte) return false;
    if (c.strikes_gte !== undefined && s.count.strikes < c.strikes_gte) return false;
    if (c.strikes_lte !== undefined && s.count.strikes > c.strikes_lte) return false;
  }
  return true;
}
function pickPresetKey(selector: AlignmentSelector | null, s: GameState, fallbackKey: string | null) {
  if (selector?.rules) {
    for (const r of selector.rules) if (ruleMatches(r, s)) return r.preset;
  }
  return selector?.default ?? fallbackKey ?? "standard";
}

const REP_STATES: GameState[] = [
  { batterSide: "R", runners: [],       outs: 0 },
  { batterSide: "R", runners: ["1B"],   outs: 1 },
  { batterSide: "R", runners: ["3B"],   outs: 0 },
  { batterSide: "R", runners: ["1B","2B"], outs: 1 },
  { batterSide: "L", runners: [],       outs: 0 },
  { batterSide: "L", runners: ["1B"],   outs: 1 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Identify caller for triggered_by (best-effort)
  let triggeredBy: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    try {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      triggeredBy = data.user?.id ?? null;
    } catch { /* ignore */ }
  }

  // Create the run row
  const { data: runRow, error: runErr } = await supabase
    .from("iq_alignment_audit_runs")
    .insert({ triggered_by: triggeredBy, status: "running" })
    .select().single();
  if (runErr) {
    return new Response(JSON.stringify({ error: runErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const runId = runRow.id;

  try {
    // Load published situations + all alignment presets
    const [situationsRes, presetsRes] = await Promise.all([
      supabase.from("iq_situations")
        .select("id,slug,title,sport,alignment_preset,alignment_selector")
        .eq("status", "published")
        .is("deleted_at", null),
      supabase.from("iq_defensive_alignments").select("*"),
    ]);
    if (situationsRes.error) throw situationsRes.error;
    if (presetsRes.error) throw presetsRes.error;
    const situations = situationsRes.data ?? [];
    const presetsAll = presetsRes.data ?? [];

    const findings: any[] = [];
    let errCount = 0, warnCount = 0;

    for (const sit of situations) {
      const sports: Sport[] = sit.sport === "both" ? ["baseball", "softball"]
                              : sit.sport === "softball" ? ["softball"] : ["baseball"];
      for (const sport of sports) {
        const presets = presetsAll.filter((p: any) => p.sport === sport);
        for (const state of REP_STATES) {
          const key = pickPresetKey(sit.alignment_selector as any, state, sit.alignment_preset);
          const preset = presets.find((p: any) => p.preset_key === key)
                      ?? presets.find((p: any) => p.is_default)
                      ?? presets.find((p: any) => p.preset_key === "standard");

          const base = {
            run_id: runId, situation_id: sit.id, situation_slug: sit.slug,
            situation_title: sit.title, sport, batter_side: state.batterSide,
            preset_key: preset?.preset_key ?? key,
          };

          if (!preset) {
            findings.push({ ...base, severity: "error", reason_code: "missing_preset",
              detail: { requested_key: key, state } });
            errCount++; continue;
          }

          const anchors = state.batterSide === "R" ? preset.anchors_vs_rhh : preset.anchors_vs_lhh;
          let pos: Record<string, { x: number; y: number }> = {};
          if (anchors && Object.keys(anchors).length > 0) {
            pos = anchorsToPositions(sport, anchors, state.batterSide);
          } else {
            const legacyByHand = state.batterSide === "R" ? preset.positions_vs_rhh : preset.positions_vs_lhh;
            pos = (legacyByHand && Object.keys(legacyByHand).length ? legacyByHand : preset.positions) ?? {};
            if (!pos || Object.keys(pos).length === 0) {
              findings.push({ ...base, severity: "error", reason_code: "missing_hand_anchors",
                detail: { state } });
              errCount++; continue;
            }
            findings.push({ ...base, severity: "warn", reason_code: "missing_hand_anchors",
              detail: { note: "using legacy positions", state } });
            warnCount++;
          }

          const off = findOffField(pos);
          if (off.length) {
            findings.push({ ...base, severity: "error", reason_code: "off_field",
              detail: { defenders: off, state } });
            errCount++; continue;
          }
          const cov = estimateCoverage(pos, preset.range_radii ?? {});
          if (cov < 45) {
            findings.push({ ...base, severity: "warn", reason_code: "low_coverage",
              detail: { coverage: cov, state } });
            warnCount++; continue;
          }
          findings.push({ ...base, severity: "ok", reason_code: "ok",
            detail: { coverage: cov } });
        }
      }
    }

    // Batch insert findings
    if (findings.length) {
      const chunkSize = 500;
      for (let i = 0; i < findings.length; i += chunkSize) {
        const chunk = findings.slice(i, i + chunkSize);
        const { error } = await supabase.from("iq_alignment_audit_findings").insert(chunk);
        if (error) throw error;
      }
    }

    await supabase.from("iq_alignment_audit_runs").update({
      finished_at: new Date().toISOString(),
      status: "ok",
      situations_checked: situations.length,
      findings_total: findings.length,
      findings_error: errCount,
      findings_warn: warnCount,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      runId, situations: situations.length,
      totals: { findings: findings.length, error: errCount, warn: warnCount },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    await supabase.from("iq_alignment_audit_runs").update({
      finished_at: new Date().toISOString(), status: "failed",
      error_message: e?.message ?? String(e),
    }).eq("id", runId);
    return new Response(JSON.stringify({ error: e?.message ?? String(e), runId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
