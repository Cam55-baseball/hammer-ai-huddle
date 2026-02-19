
# Hammer's Concrete Physio™ — Full E2E Implementation

## Why It Keeps Stopping (And How To Fix It This Time)

The build requires TWO approvals in sequence:
1. This plan — click "Approve"
2. A database migration prompt appears immediately after — click "Approve" on that too

If any message is typed before approving the migration prompt, the system resets to plan mode. Do not type anything between the two approvals.

---

## What Gets Built (17 Files Total)

### Database Migration (Auto-runs on second approval)

Columns added to `vault_focus_quizzes`:
- `appetite` text — Low / Normal / High
- `stress_sources` text[] — multi-select chips
- `movement_restriction` jsonb — toe touch / overhead / squat
- `resting_hr` integer — optional morning input

New tables:
- `physio_health_profiles` — health intake, allergies, medications, adult gate
- `physio_daily_reports` — regulation score 0-100, AI nightly report, component scores
- `physio_adult_tracking` — 18+-gated cycle phase + wellness tracking

All tables: RLS enabled, users manage own data only.

---

### Edge Function: `calculate-regulation`

Uses existing `LOVABLE_API_KEY` — no new secrets needed.

Regulation Index Formula (0–100, higher = better regulated):

| Component | Weight | Source |
|---|---|---|
| Sleep quality | 15% | Morning quiz sleep_quality 1-5 |
| Stress inverted | 10% | Night quiz stress_level (1=100, 5=0) |
| Physical readiness | 10% | Pre-lift physical_readiness 1-5 |
| Muscle restriction | 15% | movement_restriction JSONB (Full=100, Limited=60, Pain=20) |
| Training load 72h | 15% | CNS load vs 7-day avg deviation |
| Fuel adequacy | 10% | Calories logged / TDEE × 100, capped at 100 |
| Calendar buffer | 25% | Game in 1 day=40, 2 days=60, 3 days=80, none=100 |

Color thresholds: Green ≥72 / Yellow 50-71 / Red <50

Gemini Flash generates the nightly report text with forward-only, positive framing.

---

### New Hooks (4 files)

- `usePhysioProfile.ts` — fetches/upserts physio_health_profiles, 18+ age gate via profiles.date_of_birth
- `usePhysioDailyReport.ts` — fetches today's regulation report, triggers edge function after night check-in
- `usePhysioGamePlanBadges.ts` — returns badge configs per task (recovery / fuel / load / mobility)
- `usePhysioAdultTracking.ts` — manages physio_adult_tracking, only active when adult_features_enabled

---

### New Components (7 files)

- `PhysioRegulationBadge.tsx` — colored dot + score, shows "—" when no report
- `PhysioHealthIntakeDialog.tsx` — 3-step setup: basic health → medical history → adult opt-in (18+ gate)
- `PhysioNightlyReportCard.tsx` — color header, 2-3 sentence summary, 6 collapsible detail sections with WHY/WHAT TO DO/HOW IT HELPS, Apply/Modify/Decline buttons, disclaimer
- `PhysioPostWorkoutBanner.tsx` — dismissable banner with 1-2 sentence post-workout message, sessionStorage dismiss
- `PhysioNutritionSuggestions.tsx` — hydration, carb timing, electrolytes, supplement education, all with disclaimer chips, returns null if no report
- `PhysioAdultTrackingSection.tsx` — female cycle phase + male wellness consistency + shared libido level, self-hides if not enabled

---

### Modified Files (6 files)

**VaultFocusQuizDialog.tsx:**
- Morning quiz: resting HR input + skip, appetite 3-tap (Low/Normal/High), stress sources multi-chip (School/Work/Family/Travel/Competition Nerves/Illness), illness sub-selector (Cold/Flu/Fever/GI Distress)
- Pre-lift quiz: movement restriction screen (Toe Touch / Overhead Reach / Bodyweight Squat — Full/Limited/Pain)
- Night quiz: fires triggerReportGeneration() non-blocking after successful submit

**useVault.ts:** adds appetite, stress_sources, movement_restriction, resting_hr to saveFocusQuiz upsert

**Vault.tsx:** PhysioRegulationBadge in header, PhysioHealthIntakeDialog auto-opens when setup_completed=false, PhysioNightlyReportCard after night check-in, PhysioAdultTrackingSection at bottom of left column

**GamePlanCard.tsx:** PhysioPostWorkoutBanner above task list, physio badge chips inline on applicable task rows with Popover message on tap

**NutritionHubContent.tsx:** PhysioNutritionSuggestions inserted after MacroTargetDisplay

**useUnifiedDataSync.ts:** registers physio_daily_reports, physio_health_profiles, physio_adult_tracking in TABLE_QUERY_MAPPINGS

---

## Zero Loose Ends

| Requirement | Implementation |
|---|---|
| Youth gating locked | adult_features_enabled defaults false; DOB check in enableAdultFeatures() — under 18 = no-op |
| No adult data in other dashboards | PhysioAdultTrackingSection only renders when adult_features_enabled === true; RLS prevents cross-user reads |
| Nightly report auto-generates | Night check-in fires triggerReportGeneration() non-blocking |
| Disclaimer on every suggestion | All physio components include the mandatory disclaimer text |
| Calendar feeds forward weighting | Edge function queries athlete_events + calendar_events for 3-day look-ahead |
| Training load feeds engine | Edge function queries athlete_load_tracking for 72h CNS load |
| Illness reduces load suggestions | active_illness detected in usePhysioGamePlanBadges — load reduction badge on workout task |

---

## CRITICAL — TWO APPROVALS REQUIRED

1. Approve this plan
2. When a database migration prompt immediately appears — approve that too

Do NOT type any message between the two approvals. The build proceeds automatically after both are confirmed.
