/**
 * v1.2 §A — ONE pain record, everywhere. Every body-part pain selection in the
 * app (Report pain dialog, onboarding intake, Tell Hammers "Something hurts",
 * check-in chips, the daily check-in body map, "Something's off") calls
 * recordPain(). It writes the same PAIN timeline entry (tag, body part,
 * severity, date) and merges repeats on the same body part. The existing pain
 * rules (reportInjury → RR-6 event + injury history) run once per new record,
 * never loosened: a worse repeat runs them again so severity can only rise.
 */
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  reportInjury, REPORT_INJURY_REGIONS,
  type ReportInjuryRegionKey, type ReportInjurySeverity,
} from "@/lib/hammer/injury/reportInjury";

export type PainOrigin = "report_dialog" | "onboarding" | "tell_hammers" | "checkin_chip" | "checkin_body_map" | "something_off" | "physio";
export type PainFace = "little" | "lot" | "cant";

export const FACE_TO_SEVERITY: Record<PainFace, ReportInjurySeverity> = { little: "sore", lot: "limiting", cant: "cannot_train" };
const SEVERITY_RANK: Record<ReportInjurySeverity, number> = { niggle: 0, sore: 1, limiting: 2, cannot_train: 3 };
export function severityToFace(s: ReportInjurySeverity): PainFace {
  return s === "cannot_train" ? "cant" : s === "limiting" ? "lot" : "little";
}
/** Check-in 0–10 pain scale → severity. */
export function scaleToSeverity(n: number): ReportInjurySeverity {
  return n >= 7 ? "cannot_train" : n >= 4 ? "limiting" : n >= 1 ? "sore" : "niggle";
}

/** Body-map area id (left_elbow_inner …) → one pain region + side. */
export function bodyAreaToRegion(areaId: string): { region: ReportInjuryRegionKey; side: "left" | "right" | "na" } | null {
  const side = areaId.startsWith("left_") ? "left" : areaId.startsWith("right_") ? "right" : "na";
  const a = areaId.replace(/^(left|right)_/, "");
  const rules: [RegExp, ReportInjuryRegionKey][] = [
    [/^elbow_inner$/, "ucl"], [/^elbow/, "elbow"], [/^forearm/, "forearm"], [/^wrist/, "wrist"],
    [/^(hand_back|palm)$/, "hand"], [/^(shoulder|deltoid|bicep|tricep)/, "shoulder"],
    [/^(hip_flexor|glute|it_band)/, "hip"], [/^groin/, "groin"], [/^knee/, "knee"],
    [/^hamstring/, "hamstring"], [/^quad/, "quad"], [/^calf/, "calf"], [/^achilles/, "achilles"],
    [/^(ankle|fibula)/, "ankle"], [/^(foot|heel)/, "foot"], [/^(shin|tibia)/, "calf"],
    [/^lower_back|^upper_back|^lat$/, "back"], [/^neck/, "neck"],
  ];
  for (const [re, r] of rules) if (re.test(a)) return { region: r, side };
  return null; // head, jaw, chest, ribs, abs: not a training pain region — left to the check-in record
}

export interface PainDraft {
  tag: "PAIN";
  start_date: string;
  end_date: string;
  dates: null;
  payload: { region: ReportInjuryRegionKey; regionLabel: string; face: PainFace; faceLabel: string; severity: ReportInjurySeverity; side?: string; origin: PainOrigin };
}

const FACE_LABEL: Record<PainFace, string> = { little: "A little", lot: "A lot", cant: "Can't train" };

/** The single shape every screen writes. Pure — used by tests. */
export function painDraft(args: { region: ReportInjuryRegionKey; severity: ReportInjurySeverity; date: string; origin: PainOrigin; side?: string }): PainDraft {
  const face = severityToFace(args.severity);
  const label = REPORT_INJURY_REGIONS.find((r) => r.key === args.region)?.label ?? args.region;
  return {
    tag: "PAIN", start_date: args.date, end_date: args.date, dates: null,
    payload: { region: args.region, regionLabel: label, face, faceLabel: FACE_LABEL[face], severity: args.severity, ...(args.side && args.side !== "na" ? { side: args.side } : {}), origin: args.origin },
  };
}

export interface RecordPainResult { merged: boolean; entryId: string; ranPainRules: boolean }

export async function recordPain(args: {
  userId: string;
  region: ReportInjuryRegionKey;
  severity: ReportInjurySeverity;
  origin: PainOrigin;
  date: string;
  side?: "left" | "right" | "bilateral" | "na";
  note?: string;
  symptoms?: string[];
  queryClient: QueryClient;
}): Promise<RecordPainResult> {
  const d = painDraft(args);
  // Existing record on this body part today? Decide whether the pain rules must run.
  const { data: prior } = await (supabase as any)
    .from("schedule_timeline_entries")
    .select("id,payload")
    .eq("user_id", args.userId).eq("tag", "PAIN").is("undone_at", null)
    .lte("start_date", args.date).gte("end_date", args.date)
    .eq("payload->>region", args.region)
    .limit(1).maybeSingle();
  const priorSev = (prior?.payload?.severity ?? null) as ReportInjurySeverity | null;
  const worse = !prior || (priorSev ? SEVERITY_RANK[args.severity] > SEVERITY_RANK[priorSev] : true);
  // A lighter repeat never lowers the recorded severity.
  if (prior && !worse && priorSev) {
    d.payload.severity = priorSev;
    d.payload.face = severityToFace(priorSev);
    d.payload.faceLabel = FACE_LABEL[d.payload.face];
  }
  if (args.note && args.note !== "Reported through Tell Hammers") (d.payload as Record<string, unknown>).text = args.note.trim();

  let linkedRef: string | null = null;
  if (worse) {
    const res = await reportInjury({
      userId: args.userId, region: args.region, severity: args.severity, side: args.side,
      note: args.note, symptoms: args.symptoms as any, queryClient: args.queryClient,
    });
    linkedRef = res.eventId;
  }
  const { data, error } = await (supabase as any).rpc("tell_hammers_save", {
    p_tag: "PAIN", p_start: d.start_date, p_end: d.end_date, p_dates: null,
    p_source: "inbox", p_payload: d.payload, p_summary: "", p_linked_ref: linkedRef,
  });
  if (error) throw error;
  const entry = data?.entry;
  const merged = !!data?.merged;
  const msg = merged ? "You already told me this — I updated it." : "Saved to your pain log — tell a coach or parent too.";
  await (supabase as any).from("schedule_timeline_entries").update({ summary: msg }).eq("id", entry.id);
  // Re-plan exactly as a timeline save does.
  const { announceChange } = await import("@/hooks/useScheduleTimeline");
  announceChange(args.queryClient as any, args.userId, msg);
  return { merged, entryId: entry.id, ranPainRules: worse };
}
