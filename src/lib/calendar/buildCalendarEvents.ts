/**
 * Pure, deterministic projection: source-of-truth tables → CalendarEvent[].
 *
 * Contract:
 * - No I/O, no side effects, no time-of-day non-determinism.
 * - Same input ⇒ same output (stable order, deterministic IDs).
 * - Calendar is READ-ONLY downstream of this function.
 *
 * Sources (authoritative):
 *   - game_plan_days        → day-level completion / partial markers
 *   - custom_activity_logs  → scheduled custom activities (each = one event)
 *   - custom_activity_templates → recurring activities projected onto dates
 *   - training_blocks + block_workouts → strength/skill workouts
 *
 * Excluded:
 *   - Logs whose parent template is missing or soft-deleted
 *   - Training blocks with status='archived'
 */

export type CalendarEventSource =
  | 'game_plan'
  | 'custom_activity'
  | 'custom_activity_template'
  | 'training_block';

export interface DerivedCalendarEvent {
  /** Deterministic: `${source}:${sourceId}:${date}` */
  id: string;
  /** YYYY-MM-DD (local) */
  date: string;
  title: string;
  source: CalendarEventSource;
  sourceId: string;
  completed: boolean;
  /** True when day exists in game_plan_days and is_completed=false but ≥1 log on that date is completed */
  partial?: boolean;
  meta: Record<string, unknown>;
}

// Minimal shapes — keep loose so callers can pass full DB rows.
export interface GamePlanDayRow {
  date: string;
  is_completed: boolean;
}

export interface CustomActivityLogRow {
  id: string;
  entry_date: string;
  template_id: string | null;
  completed: boolean | null;
  start_time?: string | null;
  notes?: string | null;
  performance_data?: Record<string, unknown> | null;
}

export interface CustomActivityTemplateRow {
  id: string;
  title: string;
  display_nickname?: string | null;
  color?: string | null;
  sport?: string | null;
  deleted_at?: string | null;
  display_on_game_plan?: boolean | null;
  recurring_days?: number[] | null;
  display_days?: number[] | null;
  display_time?: string | null;
}

export interface TrainingBlockRow {
  id: string;
  status: string;
  goal?: string | null;
}

export interface BlockWorkoutRow {
  id: string;
  block_id: string;
  scheduled_date: string | null;
  status: string;
  workout_type: string;
  day_label: string;
  week_number: number;
}

export interface BuildCalendarEventsInput {
  gamePlanDays: GamePlanDayRow[];
  logs: CustomActivityLogRow[];
  templates: CustomActivityTemplateRow[];
  blocks: TrainingBlockRow[];
  blockWorkouts: BlockWorkoutRow[];
  /** Optional date range to project recurring templates onto (YYYY-MM-DD). */
  rangeStart?: string;
  rangeEnd?: string;
}

const SOURCE_ORDER: Record<CalendarEventSource, number> = {
  training_block: 0,
  custom_activity: 1,
  custom_activity_template: 2,
  game_plan: 3,
};

const eventId = (source: CalendarEventSource, sourceId: string, date: string) =>
  `${source}:${sourceId}:${date}`;

/** YYYY-MM-DD → Date at local midnight (deterministic, no TZ shift). */
const parseLocal = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const eachDay = (start: string, end: string): string[] => {
  const out: string[] = [];
  const s = parseLocal(start);
  const e = parseLocal(end);
  if (e < s) return out;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(formatLocal(d));
  }
  return out;
};

export function buildCalendarEvents(input: BuildCalendarEventsInput): DerivedCalendarEvent[] {
  const {
    gamePlanDays = [],
    logs = [],
    templates = [],
    blocks = [],
    blockWorkouts = [],
    rangeStart,
    rangeEnd,
  } = input;

  // Index ALL templates by id (including soft-deleted) so historical logs
  // can still resolve a title. Soft-deleted templates are excluded from
  // *recurring projection* below — but their past logs still surface.
  const templateById = new Map<string, CustomActivityTemplateRow>();
  for (const t of templates) {
    templateById.set(t.id, t);
  }

  // Index active blocks (exclude archived)
  const activeBlockIds = new Set(
    blocks.filter((b) => b.status !== 'archived').map((b) => b.id),
  );

  // Index game_plan_days by date for partial-completion detection
  const gpdByDate = new Map<string, GamePlanDayRow>();
  for (const g of gamePlanDays) gpdByDate.set(g.date, g);

  // Track logs per date for partial detection
  const logsByDate = new Map<string, { total: number; completed: number }>();
  for (const l of logs) {
    const bucket = logsByDate.get(l.entry_date) ?? { total: 0, completed: 0 };
    bucket.total += 1;
    if (l.completed) bucket.completed += 1;
    logsByDate.set(l.entry_date, bucket);
  }

  // Use a Map for dedupe by deterministic id
  const out = new Map<string, DerivedCalendarEvent>();

  // Helper: derive a sane fallback title for orphan / quick-log rows
  const fallbackTitle = (log: CustomActivityLogRow): string => {
    const note = (log.notes ?? '').trim();
    if (note) return note.split('\n')[0].slice(0, 60);
    const pd = log.performance_data;
    if (pd && typeof pd === 'object') {
      const mod = (pd as Record<string, unknown>).module;
      if (typeof mod === 'string' && mod.trim()) {
        return mod.charAt(0).toUpperCase() + mod.slice(1);
      }
    }
    return 'Quick Log';
  };

  // 1. Custom activity LOGS (concrete instances)
  //    Always emit — orphan logs (no template_id) and logs whose template
  //    was soft-deleted both still surface so users never lose work.
  for (const log of logs) {
    const tpl = log.template_id ? templateById.get(log.template_id) : undefined;
    const isOrphan = !tpl;
    const title = tpl
      ? (tpl.display_nickname || tpl.title)
      : fallbackTitle(log);
    const id = eventId('custom_activity', log.id, log.entry_date);
    out.set(id, {
      id,
      date: log.entry_date,
      title,
      source: 'custom_activity',
      sourceId: log.id,
      completed: !!log.completed,
      meta: {
        templateId: tpl?.id ?? null,
        templateDeleted: tpl ? !!tpl.deleted_at : false,
        orphan: isOrphan,
        color: tpl?.color ?? null,
        sport: tpl?.sport ?? null,
        startTime: log.start_time ?? tpl?.display_time ?? null,
        notes: log.notes ?? null,
      },
    });
  }

  // 2. Recurring TEMPLATES projected over rangeStart..rangeEnd (only when no log exists).
  //    Recurring projection requires the template to be live (not soft-deleted) and
  //    to NOT have explicitly opted out via display_on_game_plan === false.
  //    Templates with display_on_game_plan = null/undefined are treated as opt-IN.
  if (rangeStart && rangeEnd) {
    const days = eachDay(rangeStart, rangeEnd);
    // Pre-index logged template+date pairs to suppress duplicate template projection
    const loggedKey = new Set<string>();
    for (const l of logs) {
      if (l.template_id) loggedKey.add(`${l.template_id}:${l.entry_date}`);
    }
    for (const tpl of templateById.values()) {
      if (tpl.deleted_at) continue;
      if (tpl.display_on_game_plan === false) continue;
      const recurring =
        (tpl.recurring_days && tpl.recurring_days.length > 0
          ? tpl.recurring_days
          : tpl.display_days) || [];
      if (recurring.length === 0) continue;
      for (const date of days) {
        const dow = parseLocal(date).getDay();
        if (!recurring.includes(dow)) continue;
        if (loggedKey.has(`${tpl.id}:${date}`)) continue;
        const id = eventId('custom_activity_template', tpl.id, date);
        out.set(id, {
          id,
          date,
          title: tpl.display_nickname || tpl.title,
          source: 'custom_activity_template',
          sourceId: tpl.id,
          completed: false,
          meta: {
            templateId: tpl.id,
            color: tpl.color ?? null,
            sport: tpl.sport ?? null,
            startTime: tpl.display_time ?? null,
          },
        });
      }
    }
  }

  // 3. TRAINING BLOCK WORKOUTS (active blocks only)
  for (const w of blockWorkouts) {
    if (!w.scheduled_date) continue;
    if (!activeBlockIds.has(w.block_id)) continue;
    const id = eventId('training_block', w.id, w.scheduled_date);
    out.set(id, {
      id,
      date: w.scheduled_date,
      title: w.day_label || w.workout_type || 'Training Block',
      source: 'training_block',
      sourceId: w.id,
      completed: w.status === 'completed',
      meta: {
        blockId: w.block_id,
        weekNumber: w.week_number,
        workoutType: w.workout_type,
        status: w.status,
      },
    });
  }

  // 4. GAME PLAN DAYS — annotate partial completion on existing events
  // (game_plan_days alone don't generate events; they refine completion semantics.)
  for (const ev of out.values()) {
    const gpd = gpdByDate.get(ev.date);
    if (!gpd) continue;
    const bucket = logsByDate.get(ev.date);
    if (!gpd.is_completed && bucket && bucket.completed > 0 && bucket.completed < bucket.total) {
      ev.partial = true;
    }
  }

  // Stable, deterministic sort: date, source order, sourceId
  return Array.from(out.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const so = SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
    if (so !== 0) return so;
    return a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0;
  });
}

/** Group events by YYYY-MM-DD for O(1) day lookup. */
export function indexByDate(
  events: DerivedCalendarEvent[],
): Record<string, DerivedCalendarEvent[]> {
  const out: Record<string, DerivedCalendarEvent[]> = {};
  for (const e of events) {
    (out[e.date] ||= []).push(e);
  }
  return out;
}
