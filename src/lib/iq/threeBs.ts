// "Three B's" completeness validator — every situation must have
// every defensive role assigned to Ball, Bag, or Backup (or Idle with an
// explicit coaching reason). Authoring wizard refuses to publish otherwise.

import type { IqActor, IqAssignment } from "./types";
import { DEFENSIVE_ROLES } from "./types";

export interface ThreeBsReport {
  ok: boolean;
  missingRoles: string[];
  ungatedIdle: string[];
  ballCount: number;
  bagCount: number;
  backupCount: number;
}

export function validateThreeBs(actors: IqActor[]): ThreeBsReport {
  const byRole = new Map<string, IqActor>(actors.map((a) => [a.role, a]));
  const missingRoles: string[] = [];
  const ungatedIdle: string[] = [];
  let ballCount = 0, bagCount = 0, backupCount = 0;

  for (const role of DEFENSIVE_ROLES) {
    const a = byRole.get(role);
    if (!a) { missingRoles.push(role); continue; }
    if (a.assignment === "ball") ballCount++;
    else if (a.assignment === "bag") bagCount++;
    else if (a.assignment === "backup") backupCount++;
    else if (a.assignment === "idle" && !a.coaching_note.trim()) {
      ungatedIdle.push(role);
    }
  }

  return {
    ok: missingRoles.length === 0 && ungatedIdle.length === 0,
    missingRoles,
    ungatedIdle,
    ballCount, bagCount, backupCount,
  };
}

export function describeAssignmentMix(report: ThreeBsReport): string {
  return `${report.ballCount} ball · ${report.bagCount} bag · ${report.backupCount} backup`;
}
