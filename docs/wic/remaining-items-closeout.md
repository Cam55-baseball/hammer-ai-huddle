# Remaining-items report

## Status

40 catalog display-name updates are live. No drills, slugs, ages, sport restrictions, instructions or doses were removed or widened. Pitcher wiring is implemented and tested in the checkout, but no functions were deployed and no app was published this turn. No migrations ran. The flush and morning-question placements remain proposals, not implemented decisions.

Full suite: **252 files, 2,317 tests passed** after final wiring/name edits. Automatic build reported OK. Real owner-account card screenshots are attached; player/pitcher end-to-end verification remains unavailable and is not claimed. Each screenshot uses a 366-pixel content column, not a full mobile-device emulation.

## 1. Full live catalog before/after list

| Drill key (unchanged) | Before | After |
|---|---|---|
| `frc_cars_full_body` | Full-Body Controlled Joint Circles | Full-Body Controlled Joint Circles |
| `repeat_43ft_sb` | Repeated 43-Foot Sprints (Softball) | Repeated 43-Foot Sprints (Softball) |
| `wu_hip_cars` | Controlled Hip Circles | Controlled Hip Circles |
| `wu_shoulder_cars` | Controlled Shoulder Circles | Controlled Shoulder Circles |
| `wu_spine_cars` | Slow Back Bends and Turns | Slow Back Bends and Turns |
| `wu_ankle_cars` | Seated Ankle Circles | Seated Ankle Circles |
| `wu_wrist_cars` | Controlled Wrist Circles | Controlled Wrist Circles |
| `wu_scapular_cars` | Shoulder-Blade Circles | Shoulder-Blade Circles |
| `seated_hip_cars` | Seated Hip Circles | Seated Hip Circles |
| `kot_jefferson_curl` | Jefferson Curl | Slow Standing Back Curl |
| `lift_jefferson_curl` | Jefferson Curl | Slow Standing Back Curl |
| `slant_board_jefferson_curl` | Slant Board Jefferson Curl | Slow Standing Back Curl on Slant Board |
| `lift_zercher_carry` | Zercher Carry | Elbow-Cradled Carry |
| `zercher_squat` | Zercher Squat | Elbow-Cradled Squat |
| `zottman_curl` | Zottman Curl | Palm-Up Curl with Palm-Down Lowering |
| `ac_xband_diagonals` | XBand PNF Diagonals | Cross-Band Diagonal Pulls |
| `ac_xband_ir_er_wall` | XBand IR/ER at Wall | Cross-Band Internal/External Rotation at Wall |
| `ac_xband_pull_apart` | XBand Pull Apart Series | Cross-Band Pull-Apart Series |
| `ac_xband_scap_pushup` | XBand Scap Pushup | Cross-Band Scapular Push-Up |
| `jband_full_chart` | JBand — Full Arm Care Chart | Arm-Care Band — Full Chart |
| `ac_crossover_iron_scap` | Crossover Iron Scap | Cross-Band Scapular Stability Series |
| `fp_arm_line_spiral` | FP Arm-Line Spiral | Movement Patterning: Arm-Line Spiral |
| `fp_leg_line_spiral` | FP Leg-Line Spiral | Movement Patterning: Leg-Line Spiral |
| `kot_lunge` | Knees-Over-Toes Lunge | Deep-Range Forward Lunge |
| `kot_sled_drag` | KOT Backward Sled Drag | Backward Sled Drag |
| `lift_mcgill_big3` | McGill Big-3 Loaded | Core Stability Big-3 (Curl-Up, Side Plank, Bird-Dog) |
| `apt_reset` | APT Reset (90-90 Breath) | Feet-on-Wall Breathing Reset |
| `mif_turn_and_fire` | MIF Turn-and-Fire | Middle-Infield Turn-and-Fire |
| `of_read_and_go` | OF Read-and-Go | Outfield Read-and-Go |
| `if_lateral_repeat` | IF Lateral Repeatability | Infield Lateral Repeatability |
| `sp_home_1b_lhh_slap` | Home-to-1B Timed (LHH Slap) | Home-to-1B Timed (Left-Handed Hitter Slap) |
| `sp_home_1b_rhh` | Home-to-1B Timed (RHH) | Home-to-1B Timed (Right-Handed Hitter) |
| `anti_rot_press` | Pallof Press ISO | Resist-Turning Press Hold |
| `bs_pallof_iso_hold` | Pallof Press Iso Hold | Resist-Turning Press Hold |
| `bs_rfess_pallof` | Rear-Foot Elevated Pallof | Rear-Foot-Raised Resist-Turning Press |
| `lift_hk_pallof_iso` | Half-Kneel Pallof Iso Hold | Half-Kneeling Resist-Turning Press Hold |
| `lift_rfess_pallof` | RFESS Pallof | Rear-Foot-Raised Resist-Turning Press |
| `paloff_press` | Paloff Press | Resist-Turning Press |
| `wu_pallof_press_iso` | Pallof press iso (anti-rotation) | Resist-Turning Press Hold |
| `repeat_90ft_bb` | Repeat 90ft Sprints (Baseball) | Repeated 90-Foot Sprints (Baseball) |

Static warm-up names were also clarified, including “90/90 breathing reset” → “Feet-on-Wall Breathing Reset” and “90/90 hip switches” → “Seated Bent-Knee Hip Switches”. Workout-template/program/person-name display labels and locale labels now use resist-turning press wording. Legacy translation lookup aliases remain so saved originals still resolve; internal provenance is not a displayed drill name.

**Sweep limits:** reviewed all 987 catalog names plus source display literals. This is not a blanket clean bill. FHL, VMO, ECM, RSI and residual ER/IR shorthand still need exact movement/context review. Standard equipment shorthand (DB/KB/MB/RDL/SL/ISO) and place-based movement labels remain. Existing legacy slugs retain their IDs; renaming identifiers was not part of this display-name job. Full list above records only executed catalog updates, not proposed changes.

## 2. Same-night flush — owner decision required

Recommended home: **an optional game-linked action after the night check-in successfully saves**. Show it only from a confirmed played/thrown record for that date; a scheduled game alone is not proof. The night success card can say “Played tonight? Easy game flush” and open the existing flush instructions. Keep it separate from tomorrow’s canonical plan, its fixed slots and training completion score. “Not tonight” closes it. Finish and check-in saving must never depend on opening or completing it. A logged game is the evidence link, not another mandatory workout.

Alternative: put it only on the logged game’s completion screen. This has stronger immediate context but misses athletes who log later or skip that screen. Night check-in is more timely for athletes already attending it. Neither shape was built.

## 3. “Did you play yesterday?” — placement trade-off

Morning check-in fits the owner’s day-review rules better: the answer precedes today’s plan, uses yesterday’s exact date and is encountered consistently. Cost: one conditional step in an otherwise short morning flow. Keep it optional and ask once per athlete/date after a scheduled but unconfirmed game. Yes opens the real logging flow; No must record that the game was not played; skipping must not invent either answer or block Finish.

Hammers Today is less intrusive and closer to the plan/game card, but is easier to miss and can ask after the athlete has already started training. Recommend moving the once-only question into morning check-in while retaining the one-tap game-day logging card in Hammers Today. No placement change was built; owner decides.

## 4. Pitcher schedule connections and exact generator touches

- **Arm care:** client EASS reads the shared dated outing facts; actual day-after uses the existing recovery branch. Server lift-slot arm-care picker now recognizes actual day-after recovery. One arm-care exposure/day remains governed by the existing budget. Injury/recovery branches retain priority over schedule copy.
- **Throwing plan:** recorded starts, day-before preparation and reliever availability shape the existing microcycle. Actual recovery wins over a second scheduled start. The normal EASS game-prep branch applies only on a real scheduled game/start day; day-before/availability uses the existing non-throwing branch, not invented game participation. Existing recovery/Pitch Smart clamps stay downstream.
- **Weekly stress reasoning:** `shadow/run.ts` fetches settings/outings/availability, distinguishes pitcher-read failure, and feeds `shadow/adapter.ts`. Future starts reserve starting-pitcher competition context. Confirmed starts use their actual date, merge with an existing same-day game rather than add a second game, and never create pitch counts. Relief/bullpen appearances are dated diagnostics, **not fabricated position-game or pitch-count costs**. The model has no relief/bullpen cost coefficient; these are still real load in the recent-outing governor, but exact tissue-cost dose remains unknown.
- **Visible Stress Load card:** exposes dated confirmed outings, future starts and availability; availability explicitly is not a thrown outing. Does not merge those counts into generic training-day totals.
- **Recovery governor:** retains prior Stage 4 confirmed-outing integration. Missing pitcher schedule preserves game/check-in fallback. Failed pitcher reads are now distinct in PitchingCard, PitcherScheduleCard and conditioning copy; failed recent pitch-total reads are also disclosed.

**Changed generator file:** `supabase/functions/wk-generate-daily/index.ts`: tracked actual starts separately from generic confirmed outings; retained all confirmed start/relief dates for recent load; added day-after recovery to arm-care context; added distinct failed-schedule conditioning fallback copy and diagnostic. No new age limits, drills, slot expansion or heavier-day entitlement.

**Other generation/prescription touches:** `dailyPlan.ts` (optional dated outing facts, EASS branch context and rationale), `pitchingMicrocycle.ts` (dated schedule overlay), TCS `shadow/adapter.ts` and `shadow/run.ts` (read/fact mapping). `HammerDailyPlan.tsx` passes the viewed plan date, not today’s date. `usePitcherSchedule.ts` invalidates dependent queries after writes.

**Release requirements:** checkout changes would require the frontend release plus `wk-generate-daily` and the consumers of the changed shared adapter (`wk-training-intel`, `tcs-shadow-run`) to receive the new code. None were deployed here. Do not describe this wiring as live verified. Real pitcher data and player-role tests remain owed. Scheduled starts reserve future load; they are not retrospectively declared completed when the day passes.

## 5. Phone-card evidence

- `stage4-phone.png`: the real saved September 9 recent-load reduction in “Why today’s plan changed”; no regeneration or record writes used for capture.
- `stage5-phone.png`: the real rank-goals prompt, all five goals and Later button visible at phone content width. No ranking was saved for the screenshot.

## 6. Failed-read audit — findings, not bulk repairs

This is a static source audit, **not an exhaustive proof of every app read**. All identified cases are below; no claim is made that undiscovered inline reads or other edge functions are clean. Most audit findings were not changed because the request was to report them.

### Confirmed high-impact paths

| File/path | What a failed read can look like |
|---|---|
| `useHydration` — today logs, weekly/monthly/streak reads | Zero water/history/streak; query errors ignored |
| `command/useScheduleWindow` — games and practices | Empty schedule; Stress Load says no scheduled games/practices; daily planner loses schedule signal |
| `useGameDayContext` | Off-season/no-games advice after an unreadable game history |
| `ProgressLanding` schedule consumer | Topics ranked as if no upcoming game |
| `GameLogPromptCard` — games/calendar/pitcher queries | Game reminder disappears; three read errors ignored |
| `RankGoalsPromptCard` — category_goals read | Re-asks ranking after failed read; null order renders prompt. Saving could use a missing base after that failure |
| `useAdminAccess`, `useOwnerAccess`, `useScoutAccess` | Access denied/redirect, indistinguishable from absent role; fail-closed but no read-error copy |
| `useSubscription` — both lookup and fallback fail | No paid modules/not subscribed |
| `useTDEE` — profile/goals/today-event | Setup/no goal/no event; profile error logged and other query errors ignored |
| `useVitaminLogs` | Empty vitamin/adherence lists; query throws but error discarded from hook return |
| `useSystemTaskSchedule` | No task schedules; catch logs only |
| `useSubModuleProgress` | No module progress; fetch catch logs only |
| `useReceivedActivities` | Empty received assignments; fetch catch logs only |

Pitcher-specific cases repaired in this wiring: PitchingCard previously ignored `usePitcherSchedule.isError`; `useRecentPitchingLoad` previously discarded its query error. Both now disclose failed reads. PitcherScheduleCard provides retry and says saved days were not cleared.

### Other identified hook-to-consumer absence paths

| Hook | Consequence/surface |
|---|---|
| `useAthleteGoals` | BodyGoalSetup looks unset |
| `useWeightTracking` | WeightHistoryTable disappears |
| `useRecipes` | RecipeBuilder: no recipes |
| `usePersonalBests` | Tex Vision PR badges absent |
| `useShoppingLists` | Shopping list/active-list absent |
| `useMealPlanning` | Empty week plan/templates |
| `useCalendar` | Empty calendar/day cells; multi-source read stack |
| `useGamePlan` | Default/no scheduled work status |
| `useAthleteEvents` | No onboarding/event timeline entries |
| `useAdaptiveDifficulty` | Unavailable tier/difficulty context |
| `useActivityFolders` | FolderTabContent: no folders yet |
| `useDailyDrillSelection` | Tex Vision daily drills absent |
| `useCustomActivities` | Daily custom templates/logs absent |
| `useDeletedActivities` | RecentlyDeletedList: trash empty |
| `useLoadTracking` | LoadDashboard missing today/weekly load |
| `useFolderTemplates` | Folder template library empty |
| `useRecapCountdown` | Recap anchor/unlock state stays unknown/default |
| `useLanguage` | Default language as if no preference |
| `useMindFuelDailyTasks` | Checklist section skipped |
| `useNightCheckInStats` | Default check-in summary/streak/preview; fetch errors not surfaced |
| `useScoutGamePlan` | Zero players with new uploads |
| `usePlayerFolders` | Empty folders; dependent effect no-ops |
| `useScheduleTemplates` | Empty templates on Game Plan |
| `useTexVisionProgress` | First-session/no-progress state |
| `useMindFuelEducationProgress` | Completion badges absent |
| `useWeeklyWellnessQuiz` | Current/prior goal state absent |
| `useSentActivitiesHistory` | No activities sent yet |
| `useSentActivities` | Empty followed-player picker |
| `useSpeedProgress` | Sessions/goals absent in speed surfaces |
| `useUserColors` | Default colors as if unset |
| `useReceivedFolders` | No folders received yet |

Consumer files were located for these paths, but many exact empty-copy branches were not fully traced. Default-state loss and missing UI error distinction were inspected; they are not runtime reproductions.

### Candidates without a confirmed active UI consumer

`useCustomActivityReminders`, `useTexVisionMetrics`, `useTexVisionDrills`: read-error/default signatures identified, but no active importing UI consumer found in the sweep. Do not count these as proven visible bugs without tracing indirect consumers.

### Important corrections/exclusions

- `prescription-engine` returns **HTTP 500**, not a successful-empty HTTP response. Its body includes `prescriptions: []` plus `error`; only a client ignoring the failure could mistake it for empty. That consumer defect is not established here.
- `useMealVaultSync` is write-through sync, not an empty-read case.
- Successful zero-row reads, no-user/loading guards and local empty form arrays are legitimate absence, not bugs.
- Edge-function shared TCS `rows()` still masks other source-read errors; new pitcher queries distinguish theirs. Exact callers beyond the inspected stack need further review.

The user asked for every instance. This report gives every identified instance, but **the app-wide exhaustiveness requirement remains unfinished**: large inline page/component reads and all edge functions have not been individually traced, and no simulated network/RLS failure campaign was run.
