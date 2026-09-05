// Recall source registry — the single place every athlete-facing record type is
// declared for Ask Hammer Recall & Clarity.
//
// Adding a new athlete-facing feature? Add ONE entry here and recall picks it up.
// `src/lib/recall/__tests__/recallSources.test.ts` guards coverage.

export interface RecallSource {
  source: string;
  key: string;
  id: string;
  date: string;
  text: string;
  href?: string;
  meta?: Record<string, unknown>;
}

export interface RecallSourceDef {
  /** stable machine key */
  key: string;
  /** athlete-facing label used in citations */
  label: string;
  table: string;
  /** column holding the owning athlete id */
  userColumn: string;
  /** column used for ordering + date-range filtering */
  dateColumn: string;
  /** true when dateColumn is a timestamp (needs T23:59:59 upper bound) */
  timestamp: boolean;
  select: string;
  /** text columns that keyword search may match against */
  searchColumns: string[];
  /** max rows pulled from this source per question */
  limit: number;
  /** extra equality filters (e.g. saved_to_library = true) */
  eq?: Record<string, unknown>;
  /** columns that must be null (soft-delete guards) */
  isNull?: string[];
  /** row -> citation text; return null to skip the row */
  map: (row: Record<string, any>) => { text: string; href?: string; meta?: Record<string, unknown> } | null;
}

const clean = (v: unknown, max = 320): string =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const join = (...parts: Array<string | null | undefined | false>): string =>
  parts.filter((p) => p && String(p).trim().length > 0).join(" · ");

const jsonPeek = (v: unknown, max = 200): string => {
  if (!v) return "";
  try {
    return clean(JSON.stringify(v), max);
  } catch {
    return "";
  }
};

export const RECALL_SOURCES: RecallSourceDef[] = [
  {
    key: "note",
    label: "Note",
    table: "vault_free_notes",
    userColumn: "user_id",
    dateColumn: "entry_date",
    timestamp: false,
    select: "id,note_text,entry_date",
    searchColumns: ["note_text"],
    limit: 8,
    map: (r) => (r.note_text ? { text: clean(r.note_text, 400) } : null),
  },
  {
    key: "workout_note",
    label: "Workout note",
    table: "vault_workout_notes",
    userColumn: "user_id",
    dateColumn: "entry_date",
    timestamp: false,
    select: "id,notes,entry_date,module,sub_module,total_weight_lifted,side",
    searchColumns: ["notes", "module", "sub_module"],
    limit: 8,
    map: (r) => {
      const text = join(
        [r.module, r.sub_module].filter(Boolean).join(" / "),
        r.side ? `side ${r.side}` : "",
        r.total_weight_lifted ? `${r.total_weight_lifted} lb total` : "",
        clean(r.notes, 320),
      );
      return text ? { text } : null;
    },
  },
  {
    key: "journal",
    label: "Journal",
    table: "mental_health_journal",
    userColumn: "user_id",
    dateColumn: "created_at",
    timestamp: true,
    select: "id,title,content,mood_level,entry_type,created_at",
    searchColumns: ["title", "content", "entry_type"],
    limit: 8,
    map: (r) => {
      const text = join(
        r.mood_level != null ? `mood ${r.mood_level}/10` : "",
        clean(r.title, 80),
        clean(r.content, 360),
      );
      return text ? { text, href: "/mind-fuel" } : null;
    },
  },
  {
    key: "thought_log",
    label: "Thought log",
    table: "thought_logs",
    userColumn: "user_id",
    dateColumn: "created_at",
    timestamp: true,
    select:
      "id,situation,automatic_thought,balanced_thought,cognitive_distortion,emotion_intensity,created_at",
    searchColumns: ["situation", "automatic_thought", "balanced_thought", "cognitive_distortion"],
    limit: 6,
    map: (r) => {
      const text = join(
        clean(r.situation, 140),
        r.automatic_thought ? `thought: ${clean(r.automatic_thought, 160)}` : "",
        r.balanced_thought ? `reframe: ${clean(r.balanced_thought, 160)}` : "",
        r.cognitive_distortion ? `pattern ${clean(r.cognitive_distortion, 40)}` : "",
      );
      return text ? { text, href: "/mind-fuel" } : null;
    },
  },
  {
    key: "video_note",
    label: "Video note",
    table: "video_annotations",
    userColumn: "player_id",
    dateColumn: "created_at",
    timestamp: true,
    select: "id,notes,created_at,video_id,annotator_type,frame_timestamp",
    searchColumns: ["notes"],
    limit: 8,
    map: (r) =>
      r.notes
        ? {
            text: join(
              r.annotator_type ? `${r.annotator_type} note` : "",
              r.frame_timestamp != null ? `@${r.frame_timestamp}s` : "",
              clean(r.notes, 320),
            ),
            href: "/players-club",
            meta: { video_id: r.video_id },
          }
        : null,
  },
  {
    key: "video",
    label: "Video",
    table: "videos",
    userColumn: "user_id",
    dateColumn: "created_at",
    timestamp: true,
    select:
      "id,library_title,library_notes,module,sport,efficiency_score,status,session_date,created_at",
    searchColumns: ["library_title", "library_notes", "module", "sport"],
    limit: 8,
    eq: { saved_to_library: true },
    map: (r) => ({
      text: join(
        clean(r.library_title, 90) || `${r.sport ?? ""} ${r.module ?? "video"}`.trim(),
        r.efficiency_score != null ? `efficiency ${r.efficiency_score}` : "",
        r.status ? `status ${r.status}` : "",
        clean(r.library_notes, 240),
      ),
      href: "/players-club",
    }),
  },
  {
    key: "daily_log",
    label: "Daily log",
    table: "athlete_daily_log",
    userColumn: "user_id",
    dateColumn: "entry_date",
    timestamp: false,
    select:
      "id,entry_date,day_status,rest_reason,injury_mode,injury_body_region,cns_load_actual,game_logged,notes",
    searchColumns: ["notes", "rest_reason", "day_status", "injury_body_region"],
    limit: 14,
    map: (r) => ({
      text: join(
        r.day_status ? `day ${r.day_status}` : "",
        r.cns_load_actual != null ? `CNS load ${r.cns_load_actual}` : "",
        r.injury_mode ? `injury mode${r.injury_body_region ? ` (${r.injury_body_region})` : ""}` : "",
        r.rest_reason ? `rest: ${clean(r.rest_reason, 80)}` : "",
        r.game_logged ? "game logged" : "",
        clean(r.notes, 240),
      ),
    }),
  },
  {
    key: "plan_task",
    label: "Today plan task",
    table: "hammer_daily_task_completions",
    userColumn: "user_id",
    dateColumn: "plan_date",
    timestamp: false,
    select: "id,plan_date,task_id,source,completed,side,payload",
    searchColumns: ["task_id", "source"],
    limit: 20,
    map: (r) => ({
      text: join(
        clean(r.task_id, 80),
        r.source ? `(${r.source})` : "",
        r.side ? `side ${r.side}` : "",
        r.completed ? "completed" : "not completed",
      ),
      href: "/",
    }),
  },
  {
    key: "session",
    label: "Practice session",
    table: "performance_sessions",
    userColumn: "user_id",
    dateColumn: "session_date",
    timestamp: false,
    select:
      "id,session_date,session_type,module,sport,notes,player_grade,effective_grade,opponent_name,intent_compliance_pct",
    searchColumns: ["session_type", "module", "notes", "opponent_name", "sport"],
    limit: 10,
    isNull: ["deleted_at"],
    map: (r) => ({
      text: join(
        [r.module, r.session_type].filter(Boolean).join(" / "),
        r.effective_grade || r.player_grade ? `grade ${r.effective_grade ?? r.player_grade}` : "",
        r.intent_compliance_pct != null ? `intent ${r.intent_compliance_pct}%` : "",
        r.opponent_name ? `vs ${clean(r.opponent_name, 40)}` : "",
        clean(r.notes, 260),
      ),
      href: "/history",
    }),
  },
  {
    key: "activity_log",
    label: "Activity log",
    table: "custom_activity_logs",
    userColumn: "user_id",
    dateColumn: "entry_date",
    timestamp: false,
    select:
      "id,entry_date,notes,completed,completion_state,actual_duration_minutes,performance_data",
    searchColumns: ["notes", "completion_state"],
    limit: 10,
    map: (r) => ({
      text: join(
        r.completion_state || (r.completed ? "completed" : "logged"),
        r.actual_duration_minutes ? `${r.actual_duration_minutes} min` : "",
        clean(r.notes, 240),
        jsonPeek(r.performance_data, 160),
      ),
      href: "/history",
    }),
  },
  {
    key: "at_bat",
    label: "At-bat",
    table: "gp_v_at_bat_facts",
    userColumn: "user_id",
    dateColumn: "created_at",
    timestamp: true,
    select:
      "id,created_at,game_id,result,notes,ai_summary,pitch_type,pitch_velo,exit_velo,launch_angle,contact_quality,batting_side,inning",
    searchColumns: ["result", "notes", "ai_summary", "pitch_type", "contact_quality"],
    limit: 12,
    map: (r) => ({
      text: join(
        r.inning ? `inn ${r.inning}` : "",
        `result ${r.result ?? "—"}`,
        r.batting_side ? `${r.batting_side}HH` : "",
        r.pitch_type ? `vs ${r.pitch_type}${r.pitch_velo ? ` ${r.pitch_velo}` : ""}` : "",
        r.exit_velo ? `EV ${r.exit_velo}` : "",
        r.launch_angle != null ? `LA ${r.launch_angle}` : "",
        r.contact_quality ? `contact ${r.contact_quality}` : "",
        clean(r.notes ?? r.ai_summary, 220),
      ),
      href: r.game_id ? `/games/${r.game_id}/report` : "/games",
    }),
  },
  {
    key: "game",
    label: "Game",
    table: "gp_games",
    userColumn: "user_id",
    dateColumn: "game_date",
    timestamp: false,
    select:
      "id,game_date,opponent_team,home_away,my_score,opp_score,status,game_type,general_notes,ai_summary,philosophy_pre,philosophy_post,philosophy_verdict",
    searchColumns: [
      "opponent_team",
      "general_notes",
      "ai_summary",
      "philosophy_pre",
      "philosophy_post",
      "game_type",
    ],
    limit: 10,
    map: (r) => ({
      text: join(
        r.opponent_team ? `vs ${clean(r.opponent_team, 40)}` : "Game",
        r.home_away ?? "",
        r.my_score != null && r.opp_score != null ? `${r.my_score}–${r.opp_score}` : r.status ?? "",
        r.philosophy_verdict ? `plan verdict ${r.philosophy_verdict}` : "",
        clean(r.general_notes ?? r.ai_summary, 260),
      ),
      href: `/games/${r.id}/report`,
    }),
  },
  {
    key: "report",
    label: "Report",
    table: "gp_reports",
    userColumn: "user_id",
    dateColumn: "created_at",
    timestamp: true,
    select: "id,created_at,title,subtitle,report_kind,sport,game_id",
    searchColumns: ["title", "subtitle", "report_kind"],
    limit: 8,
    map: (r) => ({
      text: join(clean(r.report_kind, 40), clean(r.title, 120), clean(r.subtitle, 160)),
      href: `/reports/${r.id}`,
    }),
  },
  {
    key: "calendar_event",
    label: "Calendar",
    table: "calendar_events",
    userColumn: "user_id",
    dateColumn: "event_date",
    timestamp: false,
    select: "id,event_date,event_type,title,description,start_time,sport",
    searchColumns: ["title", "description", "event_type"],
    limit: 10,
    map: (r) => ({
      text: join(clean(r.event_type, 30), clean(r.title, 100), clean(r.description, 200), r.start_time ?? ""),
      href: "/calendar",
    }),
  },
  {
    key: "athlete_event",
    label: "Schedule",
    table: "athlete_events",
    userColumn: "user_id",
    dateColumn: "event_date",
    timestamp: false,
    select: "id,event_date,event_type,event_time,intensity_level,sport,notes",
    searchColumns: ["event_type", "notes", "sport"],
    limit: 10,
    map: (r) => ({
      text: join(
        clean(r.event_type, 40),
        r.event_time ?? "",
        r.intensity_level != null ? `intensity ${r.intensity_level}` : "",
        clean(r.notes, 200),
      ),
      href: "/calendar",
    }),
  },
  {
    key: "test",
    label: "Test",
    table: "vault_performance_tests",
    userColumn: "user_id",
    dateColumn: "test_date",
    timestamp: false,
    select: "id,test_date,test_type,module,sport,results,six_week_goals_text",
    searchColumns: ["test_type", "module", "six_week_goals_text", "sport"],
    limit: 8,
    map: (r) => ({
      text: join(
        clean(r.test_type ?? r.module, 60),
        jsonPeek(r.results, 220),
        clean(r.six_week_goals_text, 140),
      ),
      href: "/history",
    }),
  },
  {
    key: "recap",
    label: "Recap",
    table: "vault_recaps",
    userColumn: "user_id",
    dateColumn: "recap_period_start",
    timestamp: false,
    select: "id,recap_period_start,recap_period_end,total_weight_lifted,strength_change_percent,recap_data",
    searchColumns: [],
    limit: 5,
    map: (r) => ({
      text: join(
        `recap ${r.recap_period_start} → ${r.recap_period_end}`,
        r.total_weight_lifted ? `${r.total_weight_lifted} lb lifted` : "",
        r.strength_change_percent != null ? `strength ${r.strength_change_percent}%` : "",
        jsonPeek(r.recap_data, 200),
      ),
      href: "/history",
    }),
  },
  {
    key: "monthly_report",
    label: "Monthly report",
    table: "monthly_reports",
    userColumn: "user_id",
    dateColumn: "report_period_start",
    timestamp: false,
    select: "id,report_period_start,report_period_end,status,report_data",
    searchColumns: [],
    limit: 4,
    map: (r) => ({
      text: join(
        `report ${r.report_period_start} → ${r.report_period_end}`,
        r.status ?? "",
        jsonPeek(r.report_data, 220),
      ),
      href: "/history",
    }),
  },
  {
    key: "progress_photo",
    label: "Progress check",
    table: "vault_progress_photos",
    userColumn: "user_id",
    dateColumn: "photo_date",
    timestamp: false,
    select: "id,photo_date,weight_lbs,body_fat_percent,waist_measurement,arm_measurement,notes",
    searchColumns: ["notes"],
    limit: 6,
    map: (r) => ({
      text: join(
        r.weight_lbs ? `${r.weight_lbs} lb` : "",
        r.body_fat_percent ? `${r.body_fat_percent}% bf` : "",
        r.waist_measurement ? `waist ${r.waist_measurement}` : "",
        r.arm_measurement ? `arm ${r.arm_measurement}` : "",
        clean(r.notes, 200),
      ),
      href: "/history",
    }),
  },
  {
    key: "wellness_quiz",
    label: "Wellness check",
    table: "vault_weekly_wellness_quiz",
    userColumn: "user_id",
    dateColumn: "week_start_date",
    timestamp: false,
    select:
      "id,week_start_date,target_mood_level,target_stress_level,target_discipline_level,weekly_goals_text,completed_at",
    searchColumns: ["weekly_goals_text"],
    limit: 6,
    map: (r) => ({
      text: join(
        r.target_mood_level != null ? `mood target ${r.target_mood_level}` : "",
        r.target_stress_level != null ? `stress ${r.target_stress_level}` : "",
        r.target_discipline_level != null ? `discipline ${r.target_discipline_level}` : "",
        clean(r.weekly_goals_text, 220),
      ),
      href: "/mind-fuel",
    }),
  },
  {
    key: "coach_note",
    label: "Coach note",
    table: "player_notes",
    userColumn: "player_id",
    dateColumn: "created_at",
    timestamp: true,
    select: "id,created_at,content",
    searchColumns: ["content"],
    limit: 6,
    map: (r) => (r.content ? { text: clean(r.content, 320) } : null),
  },
  {
    key: "hydration",
    label: "Hydration",
    table: "hydration_logs",
    userColumn: "user_id",
    dateColumn: "log_date",
    timestamp: false,
    select: "id,log_date,amount_oz,liquid_type,custom_label,quality_class",
    searchColumns: ["liquid_type", "custom_label", "quality_class"],
    limit: 6,
    map: (r) => ({
      text: join(
        r.amount_oz ? `${r.amount_oz} oz` : "",
        clean(r.custom_label ?? r.liquid_type, 60),
        r.quality_class ? `quality ${r.quality_class}` : "",
      ),
      href: "/nutrition",
    }),
  },
];

// ---------------------------------------------------------------------------
// Keyword handling
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","if","then","when","what","was","were","is","are","am","i","me","my",
  "mine","you","your","we","us","it","its","of","on","in","to","for","with","about","how","did","do",
  "does","done","have","has","had","been","be","that","this","those","these","there","here","from","at",
  "so","just","really","tell","show","give","find","recall","remember","hammer","please","can","could",
  "would","should","last","next","again","any","all","some","much","many","more","most","over","under",
  "than","them","they","he","she","his","her","our","out","up","down","day","days","week","weeks",
]);

/** Meaningful search terms from a question (lowercased, deduped, stop-words removed). */
export function extractTerms(query: string, max = 6): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of String(query || "").toLowerCase().split(/[^a-z0-9']+/)) {
    const t = raw.replace(/'/g, "").trim();
    if (t.length < 3 || STOP_WORDS.has(t) || seen.has(t)) continue;
    seen.add(t);
    terms.push(t);
    if (terms.length >= max) break;
  }
  return terms;
}

/** PostgREST `.or()` filter string: any search column ILIKE any term. */
export function buildOrFilter(def: RecallSourceDef, terms: string[]): string | null {
  if (!def.searchColumns.length || !terms.length) return null;
  const parts: string[] = [];
  for (const col of def.searchColumns) {
    for (const t of terms) {
      const safe = t.replace(/[(),*%\\]/g, "");
      if (!safe) continue;
      parts.push(`${col}.ilike.*${safe}*`);
    }
  }
  return parts.length ? parts.join(",") : null;
}

/** Spread a global row budget across sources, newest first, without letting one source dominate. */
export function budgetMerge(rows: RecallSource[], budget = 60, perSourceCap = 8): RecallSource[] {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const counts: Record<string, number> = {};
  const kept: RecallSource[] = [];
  const overflow: RecallSource[] = [];
  for (const r of sorted) {
    const n = counts[r.key] ?? 0;
    if (n < perSourceCap && kept.length < budget) {
      counts[r.key] = n + 1;
      kept.push(r);
    } else {
      overflow.push(r);
    }
  }
  for (const r of overflow) {
    if (kept.length >= budget) break;
    kept.push(r);
  }
  return kept;
}
