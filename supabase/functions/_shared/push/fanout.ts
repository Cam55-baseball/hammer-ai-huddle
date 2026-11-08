/**
 * Which phone push goes with which in-app notification (owner Nov 8, native_push_v1).
 * Each in-app notification row produces pushes for exactly the people who can see it
 * in the app, with the same words and a link to the screen where it appears.
 */
import type { PushMessage } from "./apns.ts";

export const PUSH_SOURCE_TABLES = [
  "coach_notifications",
  "addon_notices",
  "coach_messages",
  "coach_prescriptions",
  "addon_parent_requests",
  "connection_requests",
] as const;
export type PushSourceTable = (typeof PUSH_SOURCE_TABLES)[number];

export interface Delivery extends PushMessage { userId: string }

export interface FanoutLookup {
  roles(userId: string): Promise<string[]>;
  name(userId: string): Promise<string | null>;
  /** Parents who may read this athlete's parent copies (same check as the in-app message list). */
  authorizingParents(athleteId: string): Promise<string[]>;
  /** Id of the first row (earliest plan date) of a recurring coach workout series. */
  firstInSeries(seriesId: string): Promise<string | null>;
  /** Same under-13 check the request list uses (requests to a child are answered by a parent). */
  isUnder13(userId: string): Promise<boolean>;
  /** Organization owner + active admins (who answer requests sent to the organization). */
  orgAdmins(orgId: string): Promise<string[]>;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const safeLink = (l: unknown, fallback = "/dashboard") => (typeof l === "string" && /^\/[A-Za-z0-9/_\-?=&.%]*$/.test(l) ? l : fallback);

/** Screen for each in-app notice type (the place it is listed in the app). */
export function coachNotificationLink(type: string, snapshot: unknown, roles: string[]): string {
  if (type.startsWith("standard_match")) return "/recruiting/standards";
  if (type === "testing_day") return roles.includes("coach") ? "/coach-dashboard" : "/dashboard";
  if (type === "card_shared" && snapshot && typeof snapshot === "object" && (snapshot as any).coach_rx) return "/today";
  if (["card_shared", "activity_removed", "activity_restored", "folder_removed"].includes(type)) return "/coach-dashboard";
  return "/dashboard";
}

function weekday(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

/** Same sentence as the in-app "From your coach" list. */
export function coachWorkoutSentence(rx: { sender_name?: string | null; category?: string | null; schedule_type?: string | null; plan_date?: string | null }): string {
  const who = rx.sender_name ? `Coach ${rx.sender_name}` : "Your coach";
  const what = rx.category === "lift" ? "lifting" : rx.category ?? "new";
  const when = rx.schedule_type === "any_day" ? "for any day" : `for ${weekday(String(rx.plan_date ?? ""))}`;
  return `${who} sent you a ${what} workout ${when}`;
}

const KIND_LABEL: Record<string, string> = {
  coach_player: "coach connection",
  scout_player: "scout follow",
  org_coach: "join staff",
  org_player: "join team",
};

const ADDON_NAME: Record<string, string> = { early_recap: "the Early 6-Week Recap", online_lessons: "Hammers Online lessons" };

export async function deliveriesFor(table: PushSourceTable, row: any, lookup: FanoutLookup): Promise<Delivery[]> {
  switch (table) {
    case "coach_notifications": {
      if (!row.coach_user_id) return [];
      const roles = await lookup.roles(row.coach_user_id);
      return [{
        userId: row.coach_user_id,
        title: clip(String(row.title || "Hammers"), 120),
        body: clip(String(row.message || ""), 300),
        link: coachNotificationLink(String(row.notification_type ?? ""), row.template_snapshot, roles),
      }];
    }
    case "addon_notices":
      if (!row.user_id) return [];
      return [{ userId: row.user_id, title: String(row.title || "Hammers"), body: String(row.body || ""), link: safeLink(row.link) }];
    case "coach_messages": {
      const name = row.coach_id ? await lookup.name(row.coach_id) : null;
      const title = name ? `Message from ${name}` : "New message";
      const body = clip(String(row.body || ""), 300);
      const out: Delivery[] = [];
      if (row.athlete_id && !row.parent_only) out.push({ userId: row.athlete_id, title, body, link: "/athlete/recruiting-consent" });
      if (row.athlete_id && (row.parent_copied || row.parent_only)) {
        for (const p of await lookup.authorizingParents(row.athlete_id)) {
          out.push({ userId: p, title, body, link: `/parent/athletes/${row.athlete_id}/recruiting` });
        }
      }
      return out;
    }
    case "coach_prescriptions": {
      if (!row.recipient_id || row.cancelled_at || (row.status && row.status !== "pending")) return [];
      // A recurring series is one send: one push, for its first date.
      if (row.series_id) {
        const first = await lookup.firstInSeries(row.series_id);
        if (first && first !== row.id) return [];
      }
      return [{ userId: row.recipient_id, title: "From your coach", body: coachWorkoutSentence(row), link: "/my-custom-activities" }];
    }
    case "addon_parent_requests": {
      if (!row.parent_user_id || row.status !== "pending") return [];
      const name = row.athlete_user_id ? await lookup.name(row.athlete_user_id) : null;
      return [{
        userId: row.parent_user_id,
        title: "Your player asked for an add-on",
        body: `${name ?? "Your player"} asked you for ${ADDON_NAME[row.product] ?? "an add-on"}.`,
        link: "/parent/athletes",
      }];
    }
    case "connection_requests": {
      // Same people who can answer it in My connections (list_my_requests_v2 can_answer).
      if (row.status !== "pending") return [];
      const name = row.from_user ? await lookup.name(row.from_user) : null;
      const label = KIND_LABEL[row.kind] ?? "connection";
      const msg = { title: "New request", body: `${name ?? "Someone"} sent you a ${label} request.`, link: "/my-connections" };
      if (row.to_org) {
        if (!row.organization_id) return [];
        const admins = (await lookup.orgAdmins(row.organization_id)).filter((u) => u !== row.from_user);
        return [...new Set(admins)].map((userId) => ({ userId, ...msg }));
      }
      if (!row.to_user) return [];
      if (await lookup.isUnder13(row.to_user)) {
        const child = await lookup.name(row.to_user);
        return (await lookup.authorizingParents(row.to_user)).map((userId) => ({
          userId, ...msg, body: `${name ?? "Someone"} sent ${child ?? "your player"} a ${label} request.`,
        }));
      }
      return [{ userId: row.to_user, ...msg }];
    }
  }
  return [];
}

/** An explicit "push off" choice in notification settings is respected; no saved choice means the phone permission decides. */
export function pushAllowedByPrefs(pref: { push?: boolean | null } | null | undefined): boolean {
  return !(pref && pref.push === false);
}
