

# Remaining Items: Rankings Rebuild + i18n sportTerms + Cron Job

Three tasks remain to complete the full implementation plan.

---

## 1. Rankings.tsx -- Full MPI-Based Rebuild

Completely rewrite `src/pages/Rankings.tsx` and `src/components/RankingsTable.tsx` to use MPI data instead of the legacy video-based system.

### Changes to Rankings.tsx
- Remove the `get-rankings` edge function call and all video analysis references
- Query `mpi_scores` table directly, joined with `profiles` for athlete names
- Add sport tabs (Baseball / Softball) instead of the generic sport dropdown
- Add segment filter dropdown (All, Youth, HS, College, Pro) filtering on `segment_pool`
- Add a "Your Rank" pinned card at the top showing the current user's MPI rank, score, grade label, and percentile
- Show Top 100 leaderboard below with current user row highlighted
- Remove realtime subscription on `user_progress` table, replace with subscription on `mpi_scores`

### Changes to RankingsTable.tsx
- Replace the old `RankingData` interface with MPI-based fields: `user_id`, `full_name`, `sport`, `adjusted_global_score`, `global_rank`, `global_percentile`, `trend_direction`, `trend_delta_30d`, `segment_pool`
- Display columns: Rank (with trophy icons for top 3), Athlete Name, MPI Score + Grade Label, Percentile, Trend Arrow + 30d delta, SportBadge
- Remove `module`, `videos_analyzed` columns
- Highlight current user's row

### Changes to RankingsFilters.tsx
- Replace module dropdown with segment filter (All / Youth / HS / College / Pro)
- Keep sport filter but change to tab-style toggle (Baseball / Softball) instead of dropdown

### Updated i18n keys in rankings namespace
- Add new keys: `mpiScore`, `gradeLabel`, `percentile`, `trend`, `segment`, `yourRank`, `top100`, `allSegments`, `youth`, `highSchool`, `college`, `pro`
- Remove deprecated keys: `videos`, `module`, `allModules`, `videosAnalyzed`

---

## 2. i18n -- sportTerms Keys (8 locale files)

Add `sportTerms` section to each locale JSON file under `src/i18n/locales/`. This provides translated sport-specific terminology for the UI.

### Structure per locale file
```text
"sportTerms": {
  "baseball": {
    "pitchTypes": { "fastball": "...", "slider": "...", ... },
    "sessionTypes": { "bullpen": "...", "bp": "...", ... },
    "metrics": { "spinEfficiency": "...", "barrelPct": "...", ... },
    "drillNames": { "moundWork": "...", "longToss": "...", ... },
    "splitLabels": { "overall": "...", "vsLHP": "...", "vsRHP": "...", ... },
    "heatMapLabels": { "pitchLocation": "...", "chaseZone": "...", ... }
  },
  "softball": {
    "pitchTypes": { "fastball": "...", "riseball": "...", ... },
    "sessionTypes": { "bullpen": "...", "bp": "...", ... },
    "metrics": { "snapTightness": "...", "sweetSpotPct": "...", ... },
    "drillNames": { "circleWork": "...", "longToss": "...", ... },
    "splitLabels": { ... },
    "heatMapLabels": { ... }
  }
}
```

### Languages
- **en**: Primary source with full English terminology from `sportTerminology.ts`
- **es, fr, de, ja, zh, nl, ko**: Translated equivalents

No changes to `src/i18n/index.ts` are needed since the keys are added to the existing `translation` namespace within each locale file.

---

## 3. pg_cron Migration for Nightly MPI Process

Schedule the `nightly-mpi-process` edge function to run daily at 05:00 UTC.

### Implementation
- Use the Supabase insert tool (NOT migration tool) to create the cron schedule since it contains project-specific values (URL and anon key)
- Enable `pg_cron` and `pg_net` extensions via migration first
- Schedule: `0 5 * * *` (daily at 5 AM UTC)
- Calls `https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/nightly-mpi-process` with the anon key

---

## Technical Details

### Files Modified
```text
src/pages/Rankings.tsx              (rewrite)
src/components/RankingsTable.tsx    (rewrite)
src/components/RankingsFilters.tsx  (rewrite)
src/i18n/locales/en.json           (add sportTerms + updated rankings keys)
src/i18n/locales/es.json           (add sportTerms)
src/i18n/locales/fr.json           (add sportTerms)
src/i18n/locales/de.json           (add sportTerms)
src/i18n/locales/ja.json           (add sportTerms)
src/i18n/locales/zh.json           (add sportTerms)
src/i18n/locales/nl.json           (add sportTerms)
src/i18n/locales/ko.json           (add sportTerms)
```

### Database Changes
- One migration to enable `pg_cron` and `pg_net` extensions
- One insert (via insert tool) to schedule the cron job

### No New Dependencies
All existing packages are sufficient.

### Execution Order
1. Rankings page rebuild (Rankings.tsx + RankingsTable.tsx + RankingsFilters.tsx)
2. i18n sportTerms additions to all 8 locale files
3. pg_cron extension migration + cron job scheduling
