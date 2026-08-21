# Game Hub → Staff-Grade Game Intelligence

Goal: make Game Hub do the job on that flyer — individual player development plans, team and individual postgame reports, opponent scouting reports — for baseball and softball, at a level no club software currently hits.

## What Game Hub actually is today (verified)

- It works, but only for one athlete. Every game table (`gp_games`, `gp_at_bats`, `gp_pitches`, `gp_defense_plays`, `gp_baserun_events`, dossiers, pregame plans, documents, subs) is locked to `auth.uid() = user_id`. There is no coach, club, scout, or team read path anywhere — the coach and organization pages contain zero references to game data.
- No team exists in the model: no roster, no lineup card, no "log the whole game", no shared opponent dossier library. Reports are per-athlete only.
- Nothing leaves the app. There is no PDF, no share link, no email, no branded report. Reports are computed in the browser and only viewable in-app.
- Zero rows exist in every game table — the whole module has never run against real game data. Correctness is unproven, not just unfinished.
- Sport handling is partial: strike-zone labels and the AI pregame prompt are sport-aware, but the new-game dialog defaults to baseball instead of the athlete's sport, and pitch types and arm slots are one merged list (rise/drop/screw offered to baseball, four-seam/cutter/knuckle and windmill offered to softball).
- Ingest today is Hammer reading pasted text, a document, or video. No Trackman/Rapsodo/HitTrax/Hawkeye/GameChanger parsing.

## What we build

### 1. Truth pass — make the single-athlete hub provably correct
- New-game defaults to the athlete's own sport and positions; opponent, venue, home/away, game type pre-filled from the schedule when the game came from an imported schedule.
- Sport-respective vocabularies everywhere: baseball pitch set vs softball pitch set (rise/drop/screw/change/curve/flat), arm slots gated (windmill only for softball, submarine/side-arm only for baseball), softball 43-ft/60-ft base context in situational logic, sport-correct zone language on every plan and report.
- Seed a full baseball game and a full softball game end to end (pregame plan → live logging → final → report) and fix everything that breaks. No claim of "works" without that run.

### 2. Reports that a college staff would actually send
One report engine, three products, all branded, all with in-app view + print/PDF + expiring share link + email send:
- **Individual postgame report** — line, plate discipline by zone and count, contact quality and spray, pitch-by-pitch as-pitcher (usage, velo band, first-pitch strike, put-away by count), defense by play type, baserunning reads, plan-vs-reality verdict, and the two things to train next.
- **Team postgame report** — same engine rolled up across a roster: lineup performance, pitching staff usage and pitch counts, defensive efficiency, run-expectancy swings, standouts and red flags.
- **Opponent scouting report** — from dossiers plus every logged pitch/at-bat against that opponent: pitcher arsenal and count tendencies, hot/cold zones, hitter spray and chase maps, run-game tendencies, and a recommended attack plan per hitter and per pitcher.

### 3. Club / staff workspace
- Team roster tied to the existing organization model; coaches and analysts get a staff Game Hub where they can create a game for the team, log or import it once, and have it fan out to each athlete's own ledger.
- Coaches and following scouts get a read-only **player wrap** — who this player is and what they're worth: profile, trend lines, verified game production, scouting-grade splits, video, development trajectory.
- Access is enforced in the database with new policies (athlete owns their data; staff of a linked club and consented followers get scoped read; nothing widens by accident).

### 4. Data in — beyond manual logging
An ingest lane with a parser per source, everything landing in the same ledger with a source stamp and a review step before it commits:
- Trackman / Rapsodo / HitTrax / Hawkeye exports (CSV and report files)
- GameChanger and scorebook exports (box score, lineups, play-by-play)
- Photos or PDFs of scorebooks and spray charts, read by Hammer
- Video, as today

### 5. Development plans that close the loop
Game results feed the athlete's roadmap and Hammers Today: a weakness the report proves (chase up, weak oppo contact, arm-slot drift under fatigue) becomes prescribed work, and the next game's report says whether it moved. Staff see the same loop for every player they own.

## Technical notes

- New tables: team rosters and staff membership for games, report artifacts (`report_kind`, scope, snapshot payload, share token, expiry), ingest jobs with source/parse status/review state. Every new public table ships GRANTs plus RLS in the same migration.
- Report snapshots are stored, not recomputed — a shared link must show exactly what was sent.
- Share links are token-based, expiring, revocable, and never expose the athlete's account; email delivery uses the existing email infrastructure.
- PDF is generated from the same React report surface used in-app, so there is one source of truth for layout.
- New edge functions: report build, share/email dispatch, and one ingest parser per source family; all AI paths stay on the existing Gemini-first shared client.
- Sport rules live in one place (`src/lib/games/sportRules.ts`) so pitch types, arm slots, zone language, and situational logic can never drift apart across loggers, dossiers, plans, and reports.
- Order of work: truth pass and sport rules → report engine and individual report → scouting report → staff workspace and RLS → team report → ingest parsers → development loop.
