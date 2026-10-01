/**
 * Demo tours by audience and plan. A step whose feature the viewer cannot use
 * is left out (allowed=false) — the progress count reflects only real steps.
 * No tour mentions the Report Card except the admin/owner tour.
 */
import type { TourStep } from "@/components/tour/SpotlightTour";
import { hasFeatureAccess, hasAnySubscription } from "@/utils/tierAccess";

export type TourAudience = "athlete" | "coach" | "scout" | "staff";

export interface TourContext {
  modules: string[];
  sport: "baseball" | "softball";
  isOwnerOrAdmin: boolean;
}

const H1 = '[data-tour="page-main"] h1, main h1, h1, main h2, h2';

export function athleteSteps(c: TourContext): TourStep[] {
  const m = c.modules;
  const paid = c.isOwnerOrAdmin || hasAnySubscription(m);
  const hit = c.isOwnerOrAdmin || hasFeatureAccess(m, "hitting");
  const pitch = c.isOwnerOrAdmin || hasFeatureAccess(m, "pitching");
  const thr = c.isOwnerOrAdmin || hasFeatureAccess(m, "throwing");
  const analysis = hit ? "hitting" : pitch ? "pitching" : thr ? "throwing" : null;
  return [
    { id: "today", route: "/dashboard", target: '[data-tour="today-plan-heading"]', title: "Hammers Today",
      body: "This is your day. Hammers Today lays out what to do, built around you. Open the app, start here." },
    { id: "update-hammer", route: "/dashboard", target: '[data-tour="update-hammer"]', title: "Update Hammer",
      body: "Sore, busy, game tomorrow? Tell Hammer here and today's work changes to fit." },
    { id: "upload", route: `/analyze/${analysis ?? "hitting"}?sport=${c.sport}`, target: '[data-tour="upload"]', title: "Send Hammer a clip",
      body: "Film a rep and upload it. Hammer tells you what's working, what to fix, and gives you drills for it.", allowed: () => !!analysis },
    { id: "game-plan", route: "/my-daily-game-plan", target: '[data-tour="game-plan-page"]', title: "My Daily Game Plan",
      body: "Your own activities and saved work live here. It starts closed — open it when you want it.", allowed: () => paid },
    { id: "vault", route: "/vault", target: H1, title: "The Vault",
      body: "Your history, check-ins and progress in one place.", allowed: () => paid },
  ];
}

const hrefOf = (sel: string) => () =>
  (document.querySelector(sel)?.getAttribute("data-tour-href") ?? document.querySelector(sel)?.getAttribute("href")) || undefined;

export function coachSteps(): TourStep[] {
  return [
    { id: "console", route: "/coach/console", target: H1, title: "Coach Console",
      body: "Every athlete you coach, in one list. Find someone fast and see who needs you today." },
    { id: "athlete", route: "/coach/console", target: 'a[href^="/coach/athlete/"]', title: "Open an athlete",
      body: "Tap an athlete to see their recent work, clips and how they're trending." },
    { id: "clips", route: hrefOf('a[href^="/coach/athlete/"]'), target: H1, title: "Their work and clips",
      body: "Everything this athlete has done lately, with their clips and what Hammer said about them. Scroll to review." },
    { id: "digest", route: "/coach/digest", target: H1, title: "Org Digest",
      body: "A quick read on your whole group — who's training, who's slipping, what to talk about." },
    { id: "dashboard", route: "/coach-dashboard", target: H1, title: "Coach Dashboard",
      body: "Send work, review clips your athletes share, and keep in touch." },
  ];
}

export function scoutSteps(): TourStep[] {
  return [
    { id: "scout-home", route: "/scout-dashboard", target: H1, title: "Scout Dashboard",
      body: "Find players and follow the ones you're watching." },
    { id: "open-profile", route: "/scout-dashboard", target: '[data-tour="scout-profile"]', title: "Read a profile",
      body: "Open a player's profile to see who they are, where they play and their grades." },
    { id: "grades", route: hrefOf('[data-tour="scout-profile"]'), target: H1, title: "Reading grades and measurements",
      body: "Grades come from the people who saw the player. Measurements come from video and are not exact — a short or blurry clip, odd camera angle or one bad rep can move them. Treat every number as a range, and look at several clips before you trust a trend." },
    { id: "video", route: hrefOf('[data-tour="scout-video"]'), target: H1, title: "Review their video",
      body: "Their clips live here. Watch several before you settle on a read." },
    { id: "evaluate", route: hrefOf('[data-tour="scout-evaluate"]'), target: H1, title: "Record your evaluation",
      body: "Save your own grades and notes so your read is on record." },
  ];
}

export function staffExtraSteps(): TourStep[] {
  return [
    { id: "report-card", route: "/owner", target: H1, title: "Report Card (staff only)",
      body: "The Report Card is hidden from athletes. Only you and admins see it, from an analysis." },
  ];
}

export function stepsFor(audience: TourAudience, c: TourContext): TourStep[] {
  if (audience === "coach") return coachSteps();
  if (audience === "scout") return scoutSteps();
  if (audience === "staff") return [...athleteSteps(c), ...staffExtraSteps()];
  return athleteSteps(c);
}
