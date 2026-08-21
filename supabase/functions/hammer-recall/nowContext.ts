// "Right now" snapshot handed to Ask Hammer before any history is retrieved.
// This is what makes the chat aware of today: the plan, check-ins, schedule,
// injuries and the latest tests.

interface Db {
  from: (t: string) => any;
}

const day = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const shift = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

export async function buildNowBlock(db: Db, userId: string, now: Date): Promise<string> {
  const today = day(now);
  const weekAgo = day(shift(now, -7));
  const in30 = day(shift(now, 30));
  const lines: string[] = [];

  lines.push(
    `Today is ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} (${today}).`,
  );

  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const [profile, tasks, log, events, games, foundation, tests, sessions] = await Promise.all([
    safe(
      () =>
        db
          .from("athlete_context")
          .select(
            "sport_primary,position_primary,position_secondary,competition_level,competition_age_group,season_phase,throws_hand,bats_hand,goal_summary,category_goals,injury_history",
          )
          .eq("user_id", userId)
          .maybeSingle()
          .then((r: any) => r.data),
      null as any,
    ),

    safe(
      () =>
        db
          .from("hammer_daily_task_completions")
          .select("task_id,source,completed,side")
          .eq("user_id", userId)
          .eq("plan_date", today)
          .then((r: any) => r.data ?? []),
      [] as any[],
    ),
    safe(
      () =>
        db
          .from("athlete_daily_log")
          .select("entry_date,day_status,cns_load_actual,injury_mode,injury_body_region,rest_reason,notes")
          .eq("user_id", userId)
          .lte("entry_date", today)
          .order("entry_date", { ascending: false })
          .limit(3)
          .then((r: any) => r.data ?? []),
      [] as any[],
    ),
    safe(
      () =>
        db
          .from("calendar_events")
          .select("event_date,event_type,title,start_time")
          .eq("user_id", userId)
          .gte("event_date", today)
          .lte("event_date", in30)
          .order("event_date", { ascending: true })
          .limit(6)
          .then((r: any) => r.data ?? []),
      [] as any[],
    ),
    safe(
      () =>
        db
          .from("gp_games")
          .select("id,game_date,opponent_team,status,my_score,opp_score")
          .eq("user_id", userId)
          .gte("game_date", weekAgo)
          .order("game_date", { ascending: true })
          .limit(6)
          .then((r: any) => r.data ?? []),
      [] as any[],
    ),
    safe(
      () =>
        db
          .from("athlete_foundation_state")
          .select("current_state,confidence,last_transition_reason,state_entered_at")
          .eq("user_id", userId)
          .maybeSingle()
          .then((r: any) => r.data),
      null as any,
    ),
    safe(
      () =>
        db
          .from("vault_performance_tests")
          .select("test_date,test_type,module,results,next_entry_date")
          .eq("user_id", userId)
          .order("test_date", { ascending: false })
          .limit(3)
          .then((r: any) => r.data ?? []),
      [] as any[],
    ),
    safe(
      () =>
        db
          .from("performance_sessions")
          .select("session_date,module,session_type,effective_grade")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("session_date", { ascending: false })
          .limit(3)
          .then((r: any) => r.data ?? []),
      [] as any[],
    ),
  ]);

  if (profile) {
    lines.push(
      `Athlete: ${[profile.sport, profile.primary_position ?? profile.position, profile.competition_level]
        .filter(Boolean)
        .join(" · ")}${profile.throwing_hand ? ` · throws ${profile.throwing_hand}` : ""}${
        profile.batting_side ? ` · bats ${profile.batting_side}` : ""
      }${profile.season_phase ? ` · phase ${profile.season_phase}` : ""}`,
    );
  }

  if (foundation?.current_state) {
    lines.push(
      `Foundation state: ${foundation.current_state}${
        foundation.confidence != null ? ` (confidence ${foundation.confidence})` : ""
      }${foundation.last_transition_reason ? ` — ${foundation.last_transition_reason}` : ""}`,
    );
  }

  if (tasks.length) {
    const done = tasks.filter((t: any) => t.completed);
    const open = tasks.filter((t: any) => !t.completed);
    lines.push(
      `Today's plan: ${done.length}/${tasks.length} done. Completed: ${
        done.map((t: any) => t.task_id).join(", ") || "none yet"
      }. Still open: ${open.map((t: any) => t.task_id).join(", ") || "none"}.`,
    );
  } else {
    lines.push("Today's plan: no task completions recorded yet today.");
  }

  if (log.length) {
    lines.push(
      "Recent day logs: " +
        log
          .map(
            (l: any) =>
              `${l.entry_date}: ${l.day_status ?? "—"}${
                l.cns_load_actual != null ? ` CNS ${l.cns_load_actual}` : ""
              }${l.injury_mode ? ` INJURY${l.injury_body_region ? ` (${l.injury_body_region})` : ""}` : ""}${
                l.notes ? ` — ${String(l.notes).slice(0, 80)}` : ""
              }`,
          )
          .join(" | "),
    );
    const injured = log.find((l: any) => l.injury_mode);
    if (injured) {
      lines.push(
        `ACTIVE INJURY FLAG: ${injured.injury_body_region ?? "unspecified"} (logged ${injured.entry_date}). Respect restrictions; never push through pain.`,
      );
    }
  }

  if (events.length) {
    lines.push(
      "Upcoming calendar: " +
        events
          .map((e: any) => `${e.event_date} ${e.event_type ?? ""} ${e.title ?? ""}`.trim())
          .join(" | "),
    );
  }

  if (games.length) {
    const upcoming = games.filter((g: any) => g.game_date >= today);
    const recent = games.filter((g: any) => g.game_date < today);
    if (upcoming.length) {
      lines.push(
        "Upcoming games: " +
          upcoming.map((g: any) => `${g.game_date} vs ${g.opponent_team ?? "TBD"}`).join(" | "),
      );
    }
    if (recent.length) {
      lines.push(
        "Recent games: " +
          recent
            .map(
              (g: any) =>
                `${g.game_date} vs ${g.opponent_team ?? "—"}${
                  g.my_score != null && g.opp_score != null ? ` ${g.my_score}–${g.opp_score}` : ""
                }`,
            )
            .join(" | "),
      );
    }
  }

  if (sessions.length) {
    lines.push(
      "Latest sessions: " +
        sessions
          .map(
            (s: any) =>
              `${s.session_date} ${[s.module, s.session_type].filter(Boolean).join("/")}${
                s.effective_grade ? ` grade ${s.effective_grade}` : ""
              }`,
          )
          .join(" | "),
    );
  }

  if (tests.length) {
    lines.push(
      "Latest tests: " +
        tests
          .map((t: any) => {
            let res = "";
            try {
              res = JSON.stringify(t.results ?? {}).slice(0, 140);
            } catch {
              res = "";
            }
            return `${t.test_date} ${t.test_type ?? t.module ?? "test"} ${res}`.trim();
          })
          .join(" | "),
    );
  }

  return "RIGHT NOW (live state — use this for anything about today, this week, or what's next):\n" +
    lines.map((l) => `- ${l}`).join("\n");
}
