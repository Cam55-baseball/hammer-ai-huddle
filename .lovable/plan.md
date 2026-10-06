# Round 2: under-13 parent-controlled accounts, youth throwing, age path, pause gaps, tests

Nothing is published. No schedule (cron) changes. `rest_day_calculator` and `hammers_today_start_gate` stay as they are. Nothing is deleted.

## Conflicts to settle before building (standing rule: stop and report)

1. **Legal deferral.** `docs/legal/under-13-deferral.md` says: "A lawyer must confirm the verifiable-parental-consent method before any under-13 path ships." Part B builds that path behind a switch that stays OFF, which is consistent with "the owner will turn it on after legal sign-off." **Assumption:** build it, keep it OFF, and update the deferral note to read "built, switched off, waiting on legal sign-off". The note will list the open legal questions. One example: is a card payment plus a typed and drawn signature enough as verifiable parental consent?
2. **Removed rules come back (Part C).** `docs/wic/youth-throwing-v1.md` lists rules "Removed by owner order (Step 27 A) — do not re-add". Two of them are the fixed yearly rest rule and the pitch-type age table. Part C brings back "4 months off a year, 2–3 in a row" and "fastballs and changeups only". **Assumption:** this new owner ruling overrides Step 27 A **for players under 13 only**. Ages 13 and up keep the current Hammers rest ratio and the readiness-based pitch rules. The doc gets updated to say this.
3. **Innings cap.** The code uses 100 innings a year for high school and younger. Part C sets 60 a year (age 8 and under) and 80 a year (ages 9–12). **Assumption:** these apply under 13, and 100 stays for ages 13 and up.
4. **AI providers and "no AI training".** The Parent Notice names Google AI and OpenAI as places the child's data goes. **Assumption:** the notice says data is sent to them only to produce analysis, not to train models. That depends on the providers' terms, which the lawyer should confirm. We will also never put children's data into our own pattern library or training tables.
5. **Decimal scale below 20.** **Assumption:** "decimal scale" means the existing sub-20 developing scale already in report cards. If no such scale exists, I'll report that and not invent one.

## A. Bat speed wording
On the plan card and the Start card, the line becomes: "Bat speed builds rotational power that transfers seamlessly into pitching velocity." No single pitch is named anywhere. Tests get updated.

## B. Under-13 parent-controlled account (switch `under13_parent_program`, OFF)
- **New switch.** Add it to the feature switches, set OFF. While it is OFF, today's behavior holds: under-13 signup is blocked and paused accounts show the paused screen.
- **Signup when ON:**
  1. An under-13 birthdate leads to "A parent or guardian must finish this signup."
  2. The parent enters their legal name, relationship, their own birthdate (must be 18+), their email (used as the login) and the child's first name or nickname.
  3. The parent reads the Parent Notice.
  4. The parent signs the Promise with a typed name, a finger-drawn signature and a checkbox.
  5. The parent pays with a card through the existing checkout.
  Nothing is saved until the signature step. The account opens only when the signature **and** a confirmed payment are both on file.
- **Paused accounts (when ON):** the screen becomes "Parent signature required" and leads into the same steps, including payment or card confirmation.
- **Consent record.** A new table stores: parent name, relationship, the 18+ result, the signature image (in private storage), typed name, promise and notice versions, time, device and IP, the payment ID and status. The parent can view and download it in Settings. Owners and admins can see it. Records can't be edited; withdrawing permission adds a new entry.
- **Parent controls in Settings:**
  - view the signed promise
  - see what is stored about the child
  - delete the child's data (needs a typed confirmation and starts a logged deletion request)
  - take back permission (locks the account at once)
  - a separate optional-sharing "yes" (for example PitchLab), off by default
- **Child protections:**
  - hidden from scouts, recruiters, search, leaderboards and public pages (same route as paused accounts)
  - no messaging with adults
  - emails and notifications go to the parent
  - left out of any training or pattern tables
- **Versioned texts.** The Promise and the Notice are stored with version numbers (v1 uses the owner's draft wording).

## C. Under-13 training (by birthdate)
- **Pitch Smart, exactly:**
  - Daily maximums and rest stay as listed.
  - The 7–8 band drops the 51 and 66 rest rows, which can't be reached under its 50-pitch maximum.
  - Innings: 60 a year at age 8 and under, 80 a year at ages 9–12.
  - Rest: 4 months a year with no throwing, 2–3 of them in a row.
  - Fastballs and changeups only.
  - Never pitch three days in a row, or in two games on the same day.
- **No weighted balls or weighted plyo-ball work under 13.** This is enforced in the planner and in the final rule check. Light-bat bat speed stays allowed.
- **Lifting:** each exercise's minimum age, growth mode and every rest rule still apply. No minimum age is lowered. Every other card stays on wherever the rules allow.

## D. Age path (one continuous record)
- **13th birthday:** the parent signs the teen Promise using the same signature system. The parent can then move the login to the teen's email and stays linked with view-only access. Recruiting follows the existing 13–17 parent-consent rules.
- **New 13–17 signups (switch ON):** a parent signs the teen permission.
- **Existing 13–17 accounts:** prompted for a parent signature, with a 30-day grace period counted from the day the switch turns on.
- **18th birthday:** the parent link ends, both are told, and the athlete is fully on their own.
- **No new schedule (cron) jobs.** Birthday changes are checked when the player opens the app or when a plan is built.

## E. Pause gaps
Add the paused and under-13 check to every function that processes or shows athlete data. That includes hydration checks, base-stealing analysis, hammer-chat, realtime playback, exercise-log coach and the analysis functions. I'll audit every leaderboard and public page, and add any missing database hiding rules. The owner has authorized these redeploys.

## F. Tests
- **Phone screenshots:** birthdate screen, under-13 block, paused screen, progress-photo height, growth card, pitcher Bat speed, Start card.
- **Real plans:**
  - growth mode on, then off (by adding height readings to a test account)
  - an advanced 16-year-old on the heavy track
- **Switch ON for test accounts only:** run B, C and D end to end, then set the switch back to OFF.
- **Sign-in needed.** Signing the preview in as a test player needs your approval. I'll ask for it clearly before I do it.
- **Payment:** uses Stripe's test mode if the project has it. If not, I'll stop at checkout and report.

## Live now vs after publish
Database changes and backend functions go live when deployed (owner-authorized). Screens and wording go live when the owner publishes. The switch stays OFF either way.

## Technical notes
- New tables: `parent_consents` (insert-only, with grants and row rules), `consent_texts` (versioned), `parent_links`, `child_data_deletion_requests`.
- A storage bucket for signatures; access only for the signer and owners/admins.
- `accountPause.ts` grows into a single "can this account be processed" check (paused, or under 13 without consent).
- Checkout confirmation is read back through the existing subscription check; the account opens on signature plus payment.
