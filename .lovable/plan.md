

# Post-Session Summary for Baserunning IQ

## Summary
Add a summary card that appears after completing a lesson's scenarios or finishing the Daily Decision session, showing performance verdict, stats, coaching insight, and CTAs.

## New File: `src/components/baserunning-iq/SessionSummary.tsx`

A card/modal component accepting:
- `correctCount`, `totalCount`, `avgTimeMs?` (optional, only for daily), `onContinue`, `onDismiss`

**Layout:**
1. **Verdict** — "Elite Reads Today" (>=80% accuracy) or "Needs Sharpening" (<80%), with matching icon/color
2. **Stats row** — Accuracy %, decisions completed, avg response time (if provided)
3. **Coaching Insight** — High accuracy: "You're seeing the game early — keep trusting your reads" / Low: "You're reacting late — focus on reading angles earlier"
4. **CTAs** — "Continue Training" (calls onContinue) and "Come Back Tomorrow" (calls onDismiss)

## Modified Files

### `src/components/baserunning-iq/ScenarioBlock.tsx` (Lesson scenarios)
- Instead of calling `onComplete(score)` immediately on last scenario finish, show `<SessionSummary>` inline
- Track score internally, render summary when all scenarios done
- "Continue Training" calls the existing `onComplete` callback

### `src/components/baserunning-iq/DailyDecision.tsx` (Daily scenarios)
- Replace the current `finished` state card with `<SessionSummary>`
- Pass avg response time from `sessionResults`
- "Continue Training" scrolls to lessons / dismisses; "Come Back Tomorrow" keeps the completed state

## Files Summary

| File | Action |
|------|--------|
| `src/components/baserunning-iq/SessionSummary.tsx` | New — reusable summary component |
| `src/components/baserunning-iq/ScenarioBlock.tsx` | Edit — show summary after last scenario |
| `src/components/baserunning-iq/DailyDecision.tsx` | Edit — replace finished card with summary |

No database changes.

