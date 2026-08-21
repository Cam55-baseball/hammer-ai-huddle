// Natural-language date-range parsing for Ask Hammer Recall.
// Pure, dependency-free so it can be unit tested from the app test suite.

export interface DateRange {
  from?: string;
  to?: string;
  label?: string;
}

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
  sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const shift = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const fromMDY = (mo: string, day: string, yr: string): string => {
  const y = yr.length === 2 ? `20${yr}` : yr;
  return `${y}-${mo.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

/**
 * Parse a date range out of an athlete question.
 * `now` is injectable so tests are deterministic and the server can pass the
 * athlete's local "today".
 */
export function parseDateRange(text: string, now: Date = new Date()): DateRange {
  const t = String(text || "").toLowerCase();

  // Explicit "M/D/YY - M/D/YY"
  const explicit = t.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:-|to|through|thru|–|—|until)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
  );
  if (explicit) {
    return {
      from: fromMDY(explicit[1], explicit[2], explicit[3]),
      to: fromMDY(explicit[4], explicit[5], explicit[6]),
      label: "explicit range",
    };
  }

  // Single date "on 6/12/26" or "6/12/26"
  const single = t.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$|[.?!,])/);
  if (single) {
    const d = fromMDY(single[1], single[2], single[3]);
    return { from: d, to: d, label: "single day" };
  }

  if (/\btoday\b|\bright now\b|\bthis morning\b|\btonight\b/.test(t)) {
    const d = iso(now);
    return { from: d, to: d, label: "today" };
  }

  if (/\byesterday\b/.test(t)) {
    const d = iso(shift(now, -1));
    return { from: d, to: d, label: "yesterday" };
  }

  const rel = t.match(/(?:last|past|previous)\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)/);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const days = unit.startsWith("week")
      ? n * 7
      : unit.startsWith("month")
        ? n * 30
        : unit.startsWith("year")
          ? n * 365
          : n;
    return { from: iso(shift(now, -days)), label: `last ${n} ${unit}` };
  }

  if (/\blast week\b/.test(t)) return { from: iso(shift(now, -14)), to: iso(shift(now, -7)), label: "last week" };
  if (/\bthis week\b/.test(t)) return { from: iso(shift(now, -7)), label: "this week" };
  if (/\blast month\b/.test(t)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(start), to: iso(end), label: "last month" };
  }
  if (/\bthis month\b/.test(t)) {
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), label: "this month" };
  }
  if (/\bthis (?:season|year)\b/.test(t)) {
    return { from: iso(new Date(now.getFullYear(), 0, 1)), label: "this year" };
  }
  if (/\blast (?:season|year)\b/.test(t)) {
    return {
      from: iso(new Date(now.getFullYear() - 1, 0, 1)),
      to: iso(new Date(now.getFullYear() - 1, 11, 31)),
      label: "last year",
    };
  }

  // Named month, optionally with a year: "in June", "March 2026"
  const named = t.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b(?:\s+(\d{4}))?/,
  );
  if (named) {
    const m = MONTHS[named[1]];
    const y = named[2] ? Number(named[2]) : now.getFullYear();
    return {
      from: iso(new Date(y, m - 1, 1)),
      to: iso(new Date(y, m, 0)),
      label: `${named[1]} ${y}`,
    };
  }

  return {};
}
