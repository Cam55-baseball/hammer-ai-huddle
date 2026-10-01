# Drill Builder in the Owner's Library + Drill Circulation

Items 1 and 2 are done: drills show to everyone with full instructions, and the Report Card is locked to owner and admin. This plan covers item 3, which needs your approval first. That approval covers the circulation rules.

## What you will get

**A drill builder page in the Owner's Library** (owner and admin only):
- **Browse and edit every drill in one place**, grouped by where it appears: the six analyses (baseball hitting, softball hitting, baseball pitching, softball windmill, baseball throwing, softball throwing), each Hammers Today plan slot, and the defensive library.
- **"New drill" opens a form, not free text.** It starts empty. Fields:
  - Where it lands (you can choose more than one)
  - Sport
  - Name
  - Faults it fixes (picked from the existing list)
  - Phase, with its number written out
  - Type (feel, iso, constraint, transfer, timing)
  - Dose
  - Set-up
  - Steps, in order
  - The cue
  - What it feels like when it's right
  - What it feels like when it's wrong
  - The common mistake
  - Equipment
  - Video
- **Tagging is built in.** Once you save a drill with a fault picked, the analysis prescribes it automatically for that fault.
- **Missing fault?** There is a "Request a new fault" button that saves your request for development. It does not create a new fault on its own, so the analysis never gets a fault it can't detect.
- **Built-in drills can be edited too.** When you edit one I wrote, your version replaces mine everywhere. You can also switch any drill on or off.

## Circulation rules (please approve or edit)

1. **Rotate drills that fix the same fault.** When several drills match a fault, each athlete gets them in turn rather than always the first one. An athlete sees a drill they haven't had before ahead of one they've already been given.
2. **Usage lifts priority slowly.** We record when an athlete opens a drill, marks it done, and comes back to it on a later day. Drills that get done and repeated move up gradually.
3. **No drill takes over a fault.** Even the most-used drill is served at most about half the time for a fault. Every active drill keeps a guaranteed share.
4. **New drills get a fair start.** A drill you just added is boosted for its first few weeks so it gets a real chance.
5. **Your picks win.** You can pin a drill as "always include" or switch it off. That overrides the rotation.
6. **Honest labelling.** The builder shows usage as "Used / Repeated" counts and never calls it "effective" or "best." Getting a drill done is not proof it fixes the fault. Proving that would mean tracking whether the fault shows up less in an athlete's later clips. I can build that later if you want it.

## Technical details

- New table `owner_drills`: a full drill record with `source` (`owner` or `override:<built-in id>`), `placements[]`, `fault_keys[]`, `active`, `pinned` and an empty `video_url`. Owner and admin can write; signed-in users can read active rows. GRANTs and row-level security are applied in the same migration.
- New table `fault_key_requests` (owner and admin only).
- New table `drill_engagement` (`user_id`, `drill_id`, `event` = `opened` / `completed` / `returned`). Users write their own rows. Priority is computed from totals.
- `matchPrescriptionDrills` merges the built-in catalog with `owner_drills` rows, so overrides replace the built-in drill by id. A rotation step then ranks matches by score, with an unseen-first bonus, a usage weight capped at 50% of the share, and a new-drill boost.
- Hammers Today plan drills and defensive library drills appear through their existing sources. Editing them writes override rows rather than changing generation code (generation-path changes are frozen). Before building, I'll confirm exactly where those drills live. If any can't be overridden without touching generation, I'll stop and report back.
- Tests:
  - an owner-created drill is matched for its fault
  - an override replaces its built-in drill
  - no single drill gets more than its capped share across a run of picks
  - a non-staff user can't write drills
- Nothing gets published or deployed.
