/**
 * failureCopy — turns raw engine/certifier failure strings into one plain
 * sentence an athlete can act on.
 *
 * Rules:
 *  - never show a raw slug to a normal athlete (admins see it appended);
 *  - never repeat the same reason twice (the engines emit the same sentence
 *    from selection, certification and validation);
 *  - never invent a cause — anything we cannot map is passed through with the
 *    slug swapped for the movement's real name.
 */

export type MovementNameLookup = (slug: string) => string | null;

const SLUG_RE = /\b([a-z0-9]+(?:_[a-z0-9]+){1,})\b/g;

/** Replace every catalog slug in a message with the movement's real name. */
function withRealNames(message: string, nameOf: MovementNameLookup): string {
  return message.replace(SLUG_RE, (m) => nameOf(m) ?? m);
}

/** Collect the slugs a message mentions that the catalog actually knows. */
export function slugsIn(message: string, nameOf: MovementNameLookup): string[] {
  return Array.from(new Set(message.match(SLUG_RE) ?? [])).filter((s) => !!nameOf(s));
}

interface Rule {
  test: RegExp;
  copy: (name: string, m: RegExpMatchArray) => string;
}

const RULES: Rule[] = [
  {
    test: /^(\S+) is not game-day-legal\.?$/,
    copy: (name) =>
      `${name} isn't cleared to run on a game day, so it was left out. Game-day work stays light on purpose.`,
  },
  {
    test: /^(\S+) is not season-legal for phase (\S+)\.?$/,
    copy: (name, m) =>
      `${name} isn't used during ${String(m[2]).replace(/_/g, " ")}, so it was left out.`,
  },
  {
    test: /^(\S+) is not legal for training-age class (\S+)\.?$/,
    copy: (name, m) =>
      `${name} is above your current training level (${String(m[2]).replace(/_/g, " ")}), so it was left out.`,
  },
  {
    test: /^(\S+) has no \w+ .*$/,
    copy: (name) => `${name} is missing setup information in the movement library, so it was left out.`,
  },
  {
    test: /^Slot "(\w+)" is not allowed on game day\.?$/,
    copy: (_n, m) => `${String(m[1]).replace(/_/g, " ")} work isn't allowed on a game day.`,
  },
];

/**
 * Humanize one raw failure message.
 * `showSlugs` should only ever be true for owner/admin viewers.
 */
export function humanizeFailure(
  raw: string,
  nameOf: MovementNameLookup,
  showSlugs = false,
): string {
  const msg = raw.trim();
  for (const rule of RULES) {
    const m = msg.match(rule.test);
    if (m) {
      const slug = m[1] ?? "";
      const name = nameOf(slug) ?? slug.replace(/_/g, " ");
      const text = rule.copy(name, m);
      return showSlugs && nameOf(slug) ? `${text} [${slug}]` : text;
    }
  }
  const named = withRealNames(msg, nameOf);
  if (!showSlugs) return named;
  const slugs = slugsIn(msg, nameOf);
  return slugs.length ? `${named} [${slugs.join(", ")}]` : named;
}

/** Humanize a list, dropping duplicates that differ only by slug repetition. */
export function humanizeFailures(
  raws: string[],
  nameOf: MovementNameLookup,
  showSlugs = false,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    if (!raw) continue;
    const text = humanizeFailure(raw, nameOf, showSlugs);
    const key = text.replace(/\s*\[[^\]]*\]\s*$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}
