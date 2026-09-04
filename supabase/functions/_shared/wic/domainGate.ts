// WIC Domain Gate — the single constitutional authority on *where a movement
// is allowed to appear*.
//
// Background: bat-speed selection used to admit any row whose
// `bat_speed_category` tag was non-null, regardless of what discipline the
// movement actually belonged to. That OR-clause is how a throwing/arm-care
// drill ("Plyo-Ball Pitching Variants") ended up prescribed inside a Bat Speed
// card. This module closes that door for every engine at once.
//
// Two concepts, deliberately separated:
//
//   Owning domain     — exactly one per movement, derived from `category`.
//                       This is what the movement *is*.
//   Contribution tag  — `bat_speed_category`, `speed_category`, etc.
//                       This is what the movement can *help with*, and it is
//                       only honoured when the owning domain sits on the
//                       consuming engine's explicit allow-list.
//
// Pure data-in / data-out. Authors no truth; only narrows candidate pools, so
// plan generation stays deterministically replayable.

export type OwningDomain =
  | "bat_speed"
  | "speed"
  | "lift"
  | "trunk"
  | "conditioning"
  | "throwing"
  | "arm_care"
  | "recovery"
  | "warmup"
  | "cross_sport"
  | "unknown";

/** Catalog `category` → the one domain that owns the movement. */
const CATEGORY_TO_DOMAIN: Record<string, OwningDomain> = {
  bat_speed: "bat_speed",

  speed_lab: "speed",
  marinovich: "speed",

  strength: "lift",
  compound: "lift",
  kot: "lift",
  westside: "lift",
  summers: "lift",
  heenan: "lift",
  unilateral_lower: "lift",
  unilateral_push: "lift",
  unilateral_pull: "lift",
  pap_bridge: "lift",
  carry_antirotation: "lift",
  supplemental: "lift",

  trunk: "trunk",

  conditioning: "conditioning",

  driveline: "throwing",
  arm_care: "arm_care",

  warmup: "warmup",
  ido_portal: "warmup",
  functional_patterning: "warmup",
  cressey_sp: "warmup",

  cross_sport: "cross_sport",
};

export interface GateableMovement {
  slug: string;
  name?: string | null;
  category?: string | null;
  sport_scope?: string | null;
  position_scope?: string[] | null;
  bat_speed_category?: string | null;
  speed_category?: string | null;
  arm_care_category?: string | null;
  cross_sport_category?: string | null;
  [key: string]: unknown;
}

export function owningDomain(m: { category?: string | null }): OwningDomain {
  const cat = (m.category ?? "").trim();
  return CATEGORY_TO_DOMAIN[cat] ?? "unknown";
}

/**
 * Which owning domains each engine is allowed to draw from.
 *
 * The rule that matters: a bat-speed session may borrow rotational trunk work,
 * but it may never borrow throwing or arm-care work — those are a different
 * tissue, a different recovery cost, and a different card.
 */
export const ENGINE_ALLOWED_DOMAINS: Record<string, readonly OwningDomain[]> = {
  bat_speed: ["bat_speed", "trunk"],
  speed: ["speed", "lift", "trunk"],
  sprint: ["speed", "lift", "trunk"],
  lift: ["lift", "trunk", "conditioning"],
  strength: ["lift", "trunk"],
  conditioning: ["conditioning", "speed", "cross_sport"],
  throwing: ["throwing", "arm_care"],
  arm_care: ["arm_care", "throwing"],
  recovery: ["recovery", "warmup"],
  warmup: ["warmup", "recovery", "trunk"],
  cross_sport: ["cross_sport"],
};

/** Domain → the subscription module that must be active to prescribe it. */
export const DOMAIN_MODULE: Record<OwningDomain, string | null> = {
  bat_speed: "hitting",
  speed: "performance",
  lift: "performance",
  trunk: "performance",
  conditioning: "performance",
  throwing: "throwing",
  arm_care: "throwing",
  recovery: null,
  warmup: null,
  cross_sport: null,
  unknown: null,
};

export interface DomainGateContext {
  /** Engine key, e.g. "bat_speed". Must exist in ENGINE_ALLOWED_DOMAINS. */
  engine: string;
  /** Athlete's sport. */
  sport?: "baseball" | "softball" | string | null;
  /**
   * Active subscription modules. When omitted, module gating is skipped
   * (generator already gates the whole plan behind subscription).
   */
  modules?: readonly string[] | null;
  /** Athlete's positions, lowercased, e.g. ["p","c"] or ["pitcher"]. */
  positions?: readonly string[] | null;
}

export interface DomainGateResult {
  allowed: boolean;
  reason?: string;
}

function normalizePositions(list: readonly string[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const raw of list ?? []) {
    const p = String(raw ?? "").trim().toLowerCase();
    if (!p) continue;
    out.add(p);
    // Common shorthand ⇄ longhand pairs so scoping is not defeated by
    // whichever spelling the catalog happens to use.
    if (p === "p") out.add("pitcher");
    if (p === "pitcher") out.add("p");
    if (p === "c") out.add("catcher");
    if (p === "catcher") out.add("c");
  }
  return out;
}

/**
 * The gate. Returns why a movement is rejected so callers can surface it in
 * validation output instead of silently shrinking a pool.
 */
export function checkDomainGate(
  m: GateableMovement,
  ctx: DomainGateContext,
): DomainGateResult {
  const domain = owningDomain(m);
  const allowedDomains = ENGINE_ALLOWED_DOMAINS[ctx.engine];

  if (!allowedDomains) {
    return { allowed: false, reason: `unknown_engine:${ctx.engine}` };
  }
  if (domain === "unknown") {
    return { allowed: false, reason: `no_owning_domain:${m.category ?? "null"}` };
  }
  if (!allowedDomains.includes(domain)) {
    return {
      allowed: false,
      reason: `domain_not_allowed:${domain}->${ctx.engine}`,
    };
  }

  return checkAthleteScope(m, ctx);
}

/**
 * Sport / subscription / discipline specialization, independent of which
 * engine is asking. The generator applies this to every candidate movement so
 * a mis-scoped row cannot survive even if the catalog query is loosened.
 */
export function checkAthleteScope(
  m: GateableMovement,
  ctx: Omit<DomainGateContext, "engine"> & { engine?: string },
): DomainGateResult {
  const domain = owningDomain(m);

  // Sport specialization — a hard gate, not a query hint.
  const scope = (m.sport_scope ?? "both").trim().toLowerCase();
  const sport = (ctx.sport ?? "").trim().toLowerCase();
  if (scope && scope !== "both" && sport && scope !== sport) {
    return { allowed: false, reason: `sport_scope:${scope}!=${sport}` };
  }

  // Subscription specialization.
  if (ctx.modules && ctx.modules.length > 0) {
    const required = DOMAIN_MODULE[domain];
    if (required && !ctx.modules.includes(required)) {
      return { allowed: false, reason: `module_inactive:${required}` };
    }
  }

  // Discipline / position restriction.
  const restrictedTo = (m.position_scope ?? []).filter(Boolean);
  if (restrictedTo.length > 0) {
    const held = normalizePositions(ctx.positions);
    // Unknown position is NOT "no position". An athlete who has not told us
    // where they play must not silently lose every position-scoped movement;
    // relevance is a preference, not a safety gate.
    if (held.size === 0) return { allowed: true };
    const wanted = normalizePositions(restrictedTo);
    let match = false;
    for (const w of wanted) {
      if (held.has(w)) { match = true; break; }
    }
    if (!match) {
      return { allowed: false, reason: `position_scope:${restrictedTo.join("/")}` };
    }
  }

  return { allowed: true };
}

/** Convenience wrapper for pool filtering. */
export function passesDomainGate(m: GateableMovement, ctx: DomainGateContext): boolean {
  return checkDomainGate(m, ctx).allowed;
}

// ---------------------------------------------------------------------------
// Integrity heuristics — shared with the build-time guard so the rule that
// caught `plyo_ball_pitching` lives in exactly one place.
// ---------------------------------------------------------------------------

/** Text signatures that contradict a given owning domain. */
export const DOMAIN_FORBIDDEN_KEYWORDS: Partial<Record<OwningDomain, readonly string[]>> = {
  bat_speed: [
    "bullpen",
    "mound",
    "pitching",
    "long toss",
    "pulldown",
    "pull-down",
    "arm care",
    "arm-care",
    "throwing arm",
    "ucl",
  ],
  speed: ["bullpen", "mound", "bat speed", "tee work", "arm care"],
  throwing: ["bat speed", "swing path", "tee work"],
  arm_care: ["bat speed", "swing path", "tee work"],
};

/** Contribution tags and the domains permitted to carry them. */
export const CONTRIBUTION_TAG_DOMAINS: Record<string, readonly OwningDomain[]> = {
  bat_speed_category: ["bat_speed", "trunk"],
  // Conditioning and mobility rows legitimately declare a speed contribution;
  // the speed engine's own allow-list still keeps them out of the speed pool,
  // so the tag stays descriptive rather than admissive.
  speed_category: ["speed", "lift", "trunk", "conditioning", "warmup"],
  arm_care_category: ["arm_care", "throwing", "warmup"],
  cross_sport_category: ["cross_sport"],
};

export interface IntegrityViolation {
  slug: string;
  rule: string;
  detail: string;
}

/**
 * Static integrity audit for a catalog row. Used by
 * `scripts/check-domain-integrity.ts` at build time.
 */
export function auditMovementIntegrity(m: GateableMovement): IntegrityViolation[] {
  const out: IntegrityViolation[] = [];
  const domain = owningDomain(m);

  if (domain === "unknown") {
    out.push({
      slug: m.slug,
      rule: "no_owning_domain",
      detail: `category "${m.category ?? "null"}" maps to no owning domain`,
    });
    return out;
  }

  for (const [tag, domains] of Object.entries(CONTRIBUTION_TAG_DOMAINS)) {
    const value = m[tag];
    if (value == null || value === "") continue;
    if (!domains.includes(domain)) {
      out.push({
        slug: m.slug,
        rule: "contribution_tag_conflict",
        detail: `carries ${tag}="${String(value)}" but is owned by "${domain}" (allowed: ${domains.join(", ")})`,
      });
    }
  }

  const haystack = [
    m.name,
    (m as Record<string, unknown>).cue,
    (m as Record<string, unknown>).why_prescribed,
  ]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();

  for (const kw of DOMAIN_FORBIDDEN_KEYWORDS[domain] ?? []) {
    if (haystack.includes(kw)) {
      out.push({
        slug: m.slug,
        rule: "discipline_keyword_conflict",
        detail: `owned by "${domain}" but its text mentions "${kw}"`,
      });
    }
  }

  return out;
}
