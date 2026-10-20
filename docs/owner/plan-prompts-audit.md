# Hammers Today non-lifting prompt audit — October 20, 2026

Read-only audit of pre-change prompt behavior. No cadence, dose, rest rule, switch or scheduled job was changed by this audit. A separate module is not proof of a daily-plan prompt.

| Item | Appears in Hammers Today? | When and where | Canonical completion / gap |
|---|---|---|---|
| Scheduled game | Yes | `GameLogPromptCard`, within the plan's pocket flow; games/calendar/planned pitcher outing today; one yesterday follow-up | Opens `gp_games`; final status stops the prompt. Calendar cancellation/deletion and sport filtering need tightening. |
| Scheduled practice | Partial | Practice affects `useScheduleWindow` and exercise logging flags; no dedicated plain one-button practice prompt | `scheduled_practice_sessions` plus scheduling-service status; per-exercise logging is not proof an entire practice was recorded. |
| Record an analysis | Not a general recording prompt | Analysis findings shape an existing one-slot skill overlay only; no new recording cadence in this path | Saved `videos` are canonical. Overlay must not displace owner slots or change dose. |
| Delaycam | Not established | Own `/delaycam` session flow | Separate session saves; no shared plan recording cadence found. |
| Royal timing | Not established | Own `/royal-timing` session flow | Royal timing session saves exist; no shared plan cadence found. |
| Tex Vision session | Yes, conditional | `TexVisionWork` in Before you start: existing daily selection, incomplete eligible drill, S2 baseline present and not due | Tex Vision checklist/session completion; read-only recommendation adds no extra session. No invented new cadence needed for this existing path. |
| Tex Vision S2 | Yes | `TexVisionS2Priority`: sport-specific saved `next_test_date`, 16 weeks, or absent baseline; mounted in `MorningCheckInSuccess` after the morning check-in | `tex_vision_s2_diagnostics`; embedded assessment must retain its 112-day retest lock. |
| Check-ins | Yes | `HammerCheckInCard`: morning, pre-workout and night positions in the plan | Existing Vault/check-in records feed readiness. Skipping never creates a completed measurement. |
| Performance tests | Yes | `useScheduledPriorityTasks` → `ScheduledPriorityStrip`, after morning check-in, saved `next_entry_date` or missing baseline | Vault performance-test writes; 42-day cadence. Existing due reminders include overdue items. |
| Six-week recap | Yes | Same priority strip, `useRecapCountdown` at closed/missed cycle | Existing recap record; no new cycle authority. |
| Testing days | Partial / integration unproven | Separate scheduled testing-day workflow and reminders (three days before/day of); no dedicated daily-plan bridge established | Testing-day results and permissions remain canonical. Must check invitation/skip/status before adding a prompt. |
| Pick-off Trainer | Eligibility signal, card path not proven by audit | Generator `nextPickoffDate` plus separate trainer | Existing generator eligibility is not a new cadence. Need prescribed-day adapter proof. |
| Base Stealer | Physical work exists | Plan's baserunning physical work is grouped into Speed/Conditioning under existing subscription and rest gates | Existing sessions/drill completion; no extra trainer session should be authored by a reminder. |
| Baserunning IQ | Existing mental baserunning blocks | `splitBaserunning(plan.blocks).mental` in Before you start; separate daily lesson/attempt flow | Existing lesson/attempt records. Must respect unreleased Game IQ switch where applicable. |

## Completion and learning

Discipline and learning are different: attendance/completion may be projected from source records; successful advice outcomes belong only to server `intel-recheck`. A prompt tap is never a completed session or successful outcome. No duplicate completion ledger or client-authored learning score is proposed.

## Evidence

- `src/components/hammer/HammerDailyPlan.tsx`: Before you start, mental baserunning, Tex Vision work, practice logging flags, GameLogPromptCard and three check-in positions.
- `src/components/hammer/{GameLogPromptCard,TexVisionWork,TexVisionS2Priority,ScheduledPriorityStrip,HammerCheckInCard}.tsx`.
- `src/hooks/hammer/useScheduledPriorityTasks.ts`, `src/hooks/command/useScheduleWindow.ts`, `src/hooks/useScheduledPracticeSessions.ts`.
- `supabase/functions/wk-generate-daily/index.ts` (calendar context and pickoff eligibility); `drizzle/migrations/0040_testing_days.sql`.
- `src/pages/{DelayCamPage,RoyalTiming,TexVision,BaseStealingTrainer,BaserunningIQ}.tsx` and their session hooks.

## Implementation status

Audit complete. A dedicated practice prompt now reads today's scheduled/recurring subscribed practice and opens the existing PracticeHub with its schedule reference. PracticeHub writes actual session results and marks the source complete; a tap alone does not mark it done. Existing game prompt now scopes sport and excludes canceled/deleted calendar entries. The full calendar-event practice bridge, Discipline/learning projection, guarded new prompt adapters and complete eight-week player matrix remain pending. `plan_prompts_v2` exists in the database as OFF, buildable=false; new cadences are not running. Existing game and Tex Vision prompts are not duplicated.

Continuation: pending-approval and rejected practice assignments are suppressed; accepted assignments retain the canonical `scheduled` status. Completing the first recurring occurrence no longer suppresses future weeks. Six sport/tier × 56-day rule matrices pass; this does not establish per-occurrence completion for every later week, the calendar-only practice bridge, or the whole non-lifting matrix. No new cadence or training dose was authored.

AK2 supersedes the occurrence-identity implementation gap: PracticeHub writes schedule ID/local date/module within the existing performance-session metadata; today's reminder projects only that exact identity from non-deleted canonical logs. Twelve sport/tier eight-week matrices cover appearance and completion. The real scheduled-save-to-reminder phone proof, calendar-only bridge and full non-lifting matrix are still pending; no success or learning outcome is authored by the prompt.