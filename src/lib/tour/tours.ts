/**
 * Demo tours by audience and plan. A step whose feature the viewer cannot use
 * is left out (allowed=false) — the progress count reflects only real steps.
 * No tour mentions the Report Card except the admin/owner tour.
 * No tour teaches the temporary programmes.
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
const MENU = '[data-tour="menu"]';

const hrefOf = (sel: string) => () =>
  (document.querySelector(sel)?.getAttribute("data-tour-href") ?? document.querySelector(sel)?.getAttribute("href")) || undefined;

export function athleteSteps(c: TourContext): TourStep[] {
  const m = c.modules;
  const paid = c.isOwnerOrAdmin || hasAnySubscription(m);
  const hit = c.isOwnerOrAdmin || hasFeatureAccess(m, "hitting");
  const pitch = c.isOwnerOrAdmin || hasFeatureAccess(m, "pitching");
  const thr = c.isOwnerOrAdmin || hasFeatureAccess(m, "throwing");
  const analysis = hit ? "hitting" : pitch ? "pitching" : thr ? "throwing" : null;
  const analyze = `/analyze/${analysis ?? "hitting"}?sport=${c.sport}`;
  return [
    { id: "menu", route: "/dashboard", target: MENU, title: "Getting around",
      body: "Tap Menu any time to get anywhere in the app. Your logs, your tools and your training all live in there." },
    { id: "landing", route: "/dashboard", target: '[data-tour="landing"]', title: "Your home screen",
      body: "You land here every time you open the app. Whatever needs you today shows up first." },
    { id: "today", route: "/dashboard", target: '[data-tour="today-plan-heading"]', title: "Hammers Today",
      body: "This is your day's work, built around you. Start at the top and work your way down." },
    { id: "update-hammer", route: "/dashboard", target: '[data-tour="update-hammer"]', title: "Update Hammer",
      body: "Sore, busy, game tomorrow? Tell Hammer here and today's work changes to fit." },
    { id: "meal", route: "/nutrition-hub", target: '[data-tour="log-meal"]', title: "Log a meal",
      body: "Pick the meal, add what you ate, save. Logging keeps you honest about your fuel and shows you where you're coming up short." },
    { id: "practice", route: "/practice", target: '[data-tour="practice-log"]', title: "Log a practice",
      body: "After practice, pick what you worked on and log your reps. Logged work is how you and your coaches see what you really did." },
    { id: "game", route: "/games", target: '[data-tour="games-log"]', title: "Log a game",
      body: "After a game, log how it went while it's fresh. Your notes on the pitchers and hitters you faced come back the next time you see them." },
    { id: "weather", route: "/weather", target: '[data-tour="weather"]', title: "Check the weather",
      body: "Look here before you train or play. Heat, cold and wind change how you warm up, how much you drink and what you wear." },
    { id: "upload", route: analyze, target: '[data-tour="upload"]', title: "Send Hammer a clip",
      body: "Film a rep and upload it here. Hammer watches it and tells you what's working and what to fix.", allowed: () => !!analysis },
    { id: "read-analysis", route: analyze, target: '[data-tour="analysis-report"]', title: "Read your analysis",
      body: "Every clip comes back with what's working, what to fix first and why. Read the fix before anything else — one thing at a time.", allowed: () => !!analysis },
    { id: "drills", route: analyze, target: '[data-tour="analysis-report"]', title: "Do your drills",
      body: "Under each analysis are the drills for that fix. Do them, then film again and see if it changed.", allowed: () => !!analysis },
    { id: "game-plan", route: "/my-daily-game-plan", target: '[data-tour="game-plan-page"]', title: "My Daily Game Plan",
      body: "Your own activities and saved work live here. It starts closed — open it when you want it.", allowed: () => paid },
    { id: "vault", route: "/vault", target: H1, title: "The Vault",
      body: "Your check-ins, saved work and progress in one place. Come back here to see how far you've come.", allowed: () => paid },
    { id: "history", route: "/history", target: '[data-tour="history"]', title: "History",
      body: "Everything you've logged and uploaded, in one list. Search it when you want to look back.", allowed: () => paid },
  ];
}

export function coachSteps(): TourStep[] {
  const athleteLink = 'a[href^="/coach/athlete/"]';
  return [
    { id: "menu", route: "/coach-dashboard", target: MENU, title: "Getting around",
      body: "Tap Menu to move around. Your Coach Dashboard, Coach Console and Org Digest are all in there." },
    { id: "coach-landing", route: "/coach-dashboard", target: '[data-tour="coach-landing"]', title: "Your coach home",
      body: "Start here. It tells you who needs help, why, and what to run today." },
    { id: "console", route: "/coach/console", target: '[data-tour="coach-console"]', title: "Coach Console",
      body: "Every athlete you coach, in one place. Check it before practice to see who's ready and who's off." },
    { id: "find", route: "/coach/console", target: '[data-tour="coach-roster"]', title: "Find an athlete",
      body: "Your roster is listed here. Look for anyone flagged, missing check-ins or trending the wrong way." },
    { id: "open", route: "/coach/console", target: athleteLink, title: "Open an athlete",
      body: "Tap an athlete to see their recent work and how they're doing." },
    { id: "work", route: hrefOf(athleteLink), target: '[data-tour="coach-work"]', title: "Recent work and progress",
      body: "See how they're holding up and how much they've been doing. Talk to them before you push them." },
    { id: "clips", route: hrefOf(athleteLink), target: '[data-tour="coach-stream"]', title: "Their sessions and results",
      body: "Their recent sessions and what Hammer found land here, newest first. Read it before you give your own cue." },
    { id: "send", route: "/coach-dashboard", target: '[data-tour="coach-send"]', title: "Send work",
      body: "Tap Send Activity to give a player work to do. It goes straight to them, so they know exactly what you want." },
    { id: "communicate", route: "/coach-dashboard", target: '[data-tour="coach-reports"]', title: "Hear from your athletes",
      body: "Progress reports your players share with you land here. Read them, then follow up with the player." },
    { id: "digest", route: "/coach/digest", target: H1, title: "Org Digest",
      body: "A quick read on your whole group — who's training, who's slipping, what to talk about." },
    { id: "dashboard", route: "/coach-dashboard", target: '[data-tour="coach-alerts"]', title: "Coach Dashboard",
      body: "Alerts point you to the players who need you most right now. Start there and work down." },
  ];
}

export function scoutSteps(): TourStep[] {
  return [
    { id: "menu", route: "/scout-dashboard", target: MENU, title: "Getting around",
      body: "Tap Menu to move around. Your Scout Dashboard is in there whenever you need it." },
    { id: "scout-home", route: "/scout-dashboard", target: '[data-tour="scout-home"]', title: "Scout Dashboard",
      body: "Your home base. The players you follow, the reports they share and your search all start here." },
    { id: "find", route: "/scout-dashboard", target: '[data-tour="scout-find"]', title: "Find players",
      body: "Narrow by position, side, grad year and where they play. Filter first, then look closer." },
    { id: "follow", route: "/scout-dashboard", target: '[data-tour="scout-search"]', title: "Follow a player",
      body: "Search a name, then tap Follow. The player has to accept before you see their full profile." },
    { id: "open-profile", route: "/scout-dashboard", target: '[data-tour="scout-profile"]', title: "Open a profile",
      body: "Tap View Profile on a player you follow to see who they are." },
    { id: "details", route: hrefOf('[data-tour="scout-profile"]'), target: '[data-tour="profile-details"]', title: "Read the profile",
      body: "Start with the basics — who they are, where they play and what they've shared about themselves." },
    { id: "grade-sources", route: hrefOf('[data-tour="scout-profile"]'), target: '[data-tour="scout-grades"]', title: "Where a grade comes from",
      body: "These grades come from scouts and coaches who filed a report after seeing the player, and the player confirmed they were there. Each one is one person's read from one look. Check who filed it and when before you lean on it." },
    { id: "uncertainty", route: hrefOf('[data-tour="scout-profile"]'), target: '[data-tour="scout-measures"]', title: "What's sure and what isn't",
      body: "Some measurements are confident and some are not — the app shows you which. Numbers from video depend on the clip: a short or blurry clip, a bad angle or one off rep can move them. When something wasn't measured, it says so instead of guessing." },
    { id: "video", route: hrefOf('[data-tour="scout-video"]'), target: H1, title: "Watch several clips",
      body: "Their clips live here. Watch more than one before you settle on a read — one rep can fool anybody." },
    { id: "grades", route: hrefOf('[data-tour="scout-evaluate"]'), target: '[data-tour="scout-grades-form"]', title: "Record your grades",
      body: "Grade each tool on what you saw, not what you heard. Add notes so your read still makes sense later." },
    { id: "save", route: hrefOf('[data-tour="scout-evaluate"]'), target: '[data-tour="scout-save"]', title: "File your report",
      body: "When you're done, file it. Only you see it until the player confirms they were there." },
    { id: "following", route: "/scout-dashboard", target: '[data-tour="scout-following"]', title: "Back to your players",
      body: "Everyone you follow lives here. Come back after every look and add to what you know." },
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
