# Calendar regression suite (Phase 57)

Playwright live E2E that proves clicking **Calendar** never evicts a signed-in
user, all four event surfaces accept text entry, and schedule import text/photo
flows do not kick the user out mid-edit.

## Scenarios

| ID | What it proves |
|----|----------------|
| S1 | `/calendar` mounts and stays mounted for 3 s after sidebar nav — no `/auth` redirect. |
| S2 | Add Event dialog persists a row to `calendar_events` for each of `game / practice / event / appointment` via slow keystroke typing. |
| S3 | Schedule importer accepts a PNG file without evicting (does not assert AI output). |
| S4 | Synthetic visibility blip while typing leaves focus + URL untouched. |
| S5 | Import schedule → Paste text survives slow typing, an auth-storage blip, and Analyze without `/auth` eviction or text loss. |

## Run

```bash
LOVABLE_CLOUD_URL=... \
LOVABLE_CLOUD_ANON_KEY=... \
CALENDAR_E2E_ORIGIN=http://localhost:8080 \
node tests/e2e/calendar/run.mjs
```

Filter to one scenario with `--scenario=S1` (or `S2-game`, `S3`, `S4`, `S5`).

Screenshots and `results.json` land under `.lovable/phase-57-evidence/`.
