/**
 * Rotating Alert — pure derivation.
 *
 * Picks ONE highest-priority alert to surface in the Identity Card.
 * Never stacks. Read-only.
 */
import type { BehavioralEvent } from "@/hooks/useBehavioralEvents";

export type AlertTone = "rose" | "amber" | "orange" | "emerald" | "sky" | "fuchsia";

export interface RotatingAlert {
  id: string;                 // event id when sourced from a behavioral event
  text: string;               // calm, plain-English sentence
  tone: AlertTone;
  actionType?: string | null;
  actionPayload?: Record<string, unknown> | null;
  actionLabel?: string | null;
  sourceEventId?: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  complete_nn: "Complete it",
  save_streak: "Save streak",
  log_session: "Log now",
  rest_today: "Rest today",
  reset_2min: "2-min reset",
};

const PRIORITY: Record<string, number> = {
  // survivability / risk
  streak_risk: 100,
  nn_miss: 90,
  rest_overuse: 80,
  consistency_drop: 70,
  // informational / positive
  coaching_insight: 40,
  identity_tier_change: 30,
  consistency_recover: 20,
};

function scoreOf(ev: BehavioralEvent): number {
  return PRIORITY[ev.event_type] ?? 10;
}

function toneFor(type: string): AlertTone {
  const map: Record<string, AlertTone> = {
    nn_miss: "rose",
    streak_risk: "amber",
    rest_overuse: "orange",
    consistency_drop: "amber",
    consistency_recover: "emerald",
    coaching_insight: "sky",
    identity_tier_change: "fuchsia",
  };
  return map[type] ?? "sky";
}

function textFor(ev: BehavioralEvent): string {
  if (ev.command_text) return ev.command_text;
  const md = (ev.metadata ?? {}) as Record<string, unknown>;
  switch (ev.event_type) {
    case "nn_miss": {
      const titles = Array.isArray(md.missed_today_titles)
        ? (md.missed_today_titles as string[])
        : [];
      const n = Number(md.missed_today_count ?? ev.magnitude ?? 0);
      if (n === 1 && titles[0]) return `One thing left today: ${titles[0]}.`;
      if (n >= 2) return `${n} things still open today. Lock them in.`;
      return "Today's standard isn't met yet.";
    }
    case "streak_risk":
      return "Your streak is at risk. One action saves it.";
    case "rest_overuse":
      return "Rest limit reached — your standard is slipping.";
    case "consistency_drop": {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return `Consistency slipped ${d}%. Reset the standard today.`;
    }
    case "consistency_recover": {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return `Back on track. +${d}%. Keep it going.`;
    }
    case "coaching_insight":
      return String(md.insight ?? "New coaching insight available.");
    case "identity_tier_change": {
      const to = String(md.to ?? "").toUpperCase().replace("_", " ");
      const from = String(md.from ?? "");
      const ranks = ["slipping", "building", "consistent", "locked_in", "elite"];
      const up = ranks.indexOf(String(md.to)) > ranks.indexOf(from);
      return up ? `You moved to ${to}.` : `Slipped to ${to}. Reclaim it.`;
    }
    default:
      return "Update available.";
  }
}

export function pickRotatingAlert(
  events: BehavioralEvent[] | undefined | null,
): RotatingAlert | null {
  if (!events || events.length === 0) return null;
  // Highest priority wins; ties → newest first (events already newest-first).
  const sorted = [...events].sort((a, b) => scoreOf(b) - scoreOf(a));
  const ev = sorted[0];
  return {
    id: ev.id,
    text: textFor(ev),
    tone: toneFor(ev.event_type),
    actionType: ev.action_type ?? null,
    actionPayload: (ev.action_payload as Record<string, unknown> | null) ?? null,
    actionLabel: ev.action_type ? ACTION_LABELS[ev.action_type] ?? "Act" : null,
    sourceEventId: ev.id,
  };
}
