# Shoulder-to-Shoulder Hold tile + Dashboard/Sidebar reorg

## 1. New BH P4 Tile — "Shoulder-to-Shoulder Hold" (Pass/Fail)

**Doctrine (frozen into prompts & UI copy):**
- Measures held separation between **hands and back shoulder** created at landing (end of P3) through P4.
- Hands must stay back while the elbow leads the bat to the ball (no hand-push).
- **PASS** = spacing held for **≥50%** of the window from landing → contact. Elite = held until contact.
- **Auto-FAIL override:** front shoulder flies open / out-of-sequence before contact, even if spacing held. Card MUST tell the hitter exactly why it auto-failed (explicit "Auto-FAIL: front shoulder leaked at ~X% of window — nullifies the move").
- Not an arm-bar; hands' job is to line up with the ball, not push to it.

**Files:**
- `src/lib/reportCard/disciplines/bh.ts` — add tile id `shoulder_to_shoulder_hold` in **P4** group with full `whatWhy` + `howToImprove` copy reflecting doctrine above. Reader returns `pass | fail | null` with an `autoFailReason` string when front-shoulder leak triggers.
- `src/lib/reportCard/contracts/bh.contract.ts` — add metric keys:
  - `shoulder_to_shoulder_hold_pct_to_contact` (0–100, numeric: % of window spacing held)
  - `shoulder_to_shoulder_hold_pass` (boolean)
  - `front_shoulder_leak_before_contact` (boolean — auto-FAIL trigger)
  - `front_shoulder_leak_pct_of_window` (0–100, when leak detected)
- `supabase/functions/_shared/reportCardContracts.ts` — mirror the same four keys with **frame-anchored extraction prompt**: Landing frame = first frame back foot heel/full foot plants; Contact = barrel/ball overlap; track per-frame distance between **hand cluster centroid** and **back-shoulder joint** along the bat path; spacing "held" while distance ≥ 90% of its landing-frame value; front-shoulder leak = back-shoulder→front-shoulder line rotates >15° toward pitcher before contact.
- `src/components/report-card/hammer/ReportCardTile.tsx` (or pass/fail visual) — render auto-FAIL reason chip in red when `autoFailReason` present.
- Add to BREAD_AND_BUTTER targeted second-pass list in `supabase/functions/analyze-video/index.ts` so the metric is never silently missing.

## 2. Sidebar reorganization

Edit `src/components/AppSidebar.tsx` `mainNavItems`:

- **Remove top-level:** `Weekly Digest`, `Forecast`, `Command Center`, `Notifications`, `Nutrition Hub`, `Nutrition Tips` (top-level entries).
- **Add Nutrition group** (collapsible `SidebarMenuSub`) containing Nutrition Hub + Nutrition Tips.
- **Move Notifications** into the existing Settings group (link `/settings/notifications`).
- `Weekly Digest` + `Forecast` + `Command Center` → no sidebar entry; reachable from Progress Dashboard (deep links preserved).

## 3. Progress Dashboard absorbs digest/forecast/body

Edit `src/pages/ProgressDashboard.tsx`:
- Add **collapsible "How your body is doing today"** section at top using `<CommandCenterSection defaultSignalsOpen={false} />` (collapsed by default — full drop-down lives here only).
- Add `<WeeklyDigestPreview />` and `<ForecastPreview />` as cards in a 2-col grid below it.

## 4. Dashboard cleanup + Identity body-score chip

Edit `src/pages/Dashboard.tsx`:
- Remove `<CommandCenterSection />` mount (line ~555).
- Remove `<WeeklyDigestPreview />` and `<ForecastPreview />` from Dashboard.
- Edit `src/components/identity/IdentityCommandCard.tsx`: add compact **"Body Today"** score chip (single 0–100 derived via existing `useAthleteCommandRows` → readiness composite) with a "Full report →" link to `/progress#body`. No drop-down on the Dashboard.

## 5. Hammers Today Plan — second home on Dashboard

Edit `src/pages/Dashboard.tsx`:
- Mount `<HammerDailyPlan />` inside a **`<Collapsible>` placed directly above `<GamePlanCard />`**, defaulting open the first time per day, with a "Populate today's plan" button that calls the existing populate hook (already deterministic, organism-data-driven — no random generation). Persist open/closed in `localStorage` (`hammer.today.dashboard.open.YYYY-MM-DD`).
- Leave the existing copy on `/command` intact (no duplication risk: same hook, same lineage).

## 6. Post-onboarding routing → Dashboard

Edit `src/pages/Auth.tsx` (~line 185):
- Change the post-login default from `navigate("/command")` to `navigate("/dashboard")` for athletes who **have** `hasFirstEvent` (i.e., onboarding complete).
- Athletes without `hasFirstEvent` continue to `/onboarding/athlete`.
- Keep scout/coach routing unchanged.
- Edit `src/pages/AthleteCommand.tsx`: when `!hasFirstEvent` still redirect to onboarding (unchanged); otherwise allow direct visit (deep-link still works).

## 7. Out of scope
- Sidebar redesign beyond the moves listed above.
- New DB tables/migrations.
- Changes to other report-card tiles, scoring math for existing tiles, or Hammer Picks engine.
- Softball deltas (BH doctrine update applies to BH discipline only; SB inherits later).

## Files touched
- `src/lib/reportCard/disciplines/bh.ts`
- `src/lib/reportCard/contracts/bh.contract.ts`
- `src/components/report-card/hammer/ReportCardTile.tsx`
- `supabase/functions/_shared/reportCardContracts.ts`
- `supabase/functions/analyze-video/index.ts` (deploy)
- `supabase/functions/recompute-report-card/index.ts` (deploy)
- `src/components/AppSidebar.tsx`
- `src/pages/ProgressDashboard.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/identity/IdentityCommandCard.tsx`
- `src/pages/Auth.tsx`
- `src/pages/AthleteCommand.tsx`
