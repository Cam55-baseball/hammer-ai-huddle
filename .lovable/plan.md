

## Remove Game Hub Card and Practice Hub Button from Dashboard

No plan was created yet — here it is now. Both elements are in `src/pages/Dashboard.tsx`.

### Changes

**1. Remove the "Practice Hub" button** (`PracticeIntelligenceCard`, lines 72–75)
- Delete the `<Button>` for Practice Hub.
- Keep the "Progress" button. Adjust the wrapper so Progress remains right-aligned.

**2. Remove the Game Hub card** (lines 516–530)
- Delete the entire Game Hub `<Card>` block, including its surrounding comment.

### Out of scope
- Sidebar navigation entries — left untouched (Game Hub and Practice Hub remain accessible via the side menu).
- All other dashboard cards, routes, and logic.

### Verification
- `/dashboard` no longer shows the Game Hub card below Practice Intelligence.
- Practice Intelligence card still shows MPI summary and the "Progress" button, but no "Practice Hub" button.
- Side menu still navigates to `/practice` and `/game-scoring`.

