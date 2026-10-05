# What drives Hammers Today, and the model to build in stages

Report first. Nothing in the app was changed to produce it. Each stage below needs the owner's approval before anything is built.

## Part 1: what drives each part of the day today

Key: Y = responds, P = partly or only switches it on/off, N = ignores, ? = not confirmed.

| Part of the day | Goals | Clip faults | Games | Practices | Check-ins | Workload | Season | Position | Own baselines | Next game | Age / level | Injury |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lifting | Y | Y | P | P | Y | Y | Y | P | N | Y | Y | Y |
| Conditioning | N | N | P | P | N | P | P | Y | N | P | N | P |
| Skill work | Y | Y | N | P | Y | P | Y | Y | N | Y | Y | Y |
| Defensive work | P | Y | N | P | P | N | P | Y | N | P | P | P |
| Warm-up | N | Y | N | N | P | N | P | P | N | P | P | ? |
| Recovery | N | N | P | P | Y | Y | P | N | N | Y | P | Y |
| Mobility | N | N | N | N | P | P | N | N | N | N | N | ? |
| Tex Vision / Mind Fuel | N | N | N | N | N | N | N | N | N | N | N | N |
| Nutrition targets | Y (body goals) | N | N | N | N | N | N | N | N | N | N | N |

**What the table shows:**
- **Games:** no part of the day reads what happened in a game. Game days and the next game's date change things, but game results never do. No part of the day reads at-bat or pitch records.
- **Practices:** a practice day can lower the load, but what the athlete actually did at practice never changes what is prescribed.
- **Own baselines:** the plan never reads the athlete's personal normal. Baselines exist only on the measurement side.
- **Conditioning:** it responds to position, and to being switched off on game days, after the season, and on rest or "take it easy" days. It is the same two drills on every training day: an inning-restart drill plus one drill set by position. The app has 10 conditioning session types, but they are only used to label the session afterwards. They never choose what the athlete does.
- **Check-ins:** short sleep (under 6 hours) or high soreness (8 or more) cuts lifting and skill intensity. Day intent and energy have no clear effect on the plan.
- **Workload:** the recovery limit on effort works. Lifting and recovery respond to it. Conditioning only responds when the whole day is switched off.

## Part 2: the athlete's goals

There are three kinds of goal, and they are treated very differently:

1. **Ranked training goals** (strength, speed, power and so on). These are saved and they do shape the plan. They change which lifting and skill work wins a slot, never the amount. The plan's explanation even says "you ranked X first." Only 13 goal rows exist, across 8 athletes, so most athletes have none and get no goal effect.
2. **Career goal** ("Where do you want the game to take you?"). This is saved as the athlete's target level. The plan builder ignores it on purpose: the code calls it "an aspiration, never an entitlement." Only Ask Hammer and the setup checklist read it.
3. **Mental goals** (the mental and career setup step). These are saved but nothing in the plan reads them.

Athletes can change all of these later through Settings → "Review answers", which reopens setup. There is no separate goals page.

**Verdict:** your expectation is half right. Training goals are used. Career and mental goals are collected and never shape the plan.

## Part 3: the complete model, layer by layer

Each layer only changes **what fills a slot** or **switches off work the recovery limit already allows**. The number of slots stays the same. Every change traces back to a dated record. There are no medical claims.

### Layer A: goals set the direction
- **Exists today:** ranked training goals shape lifting and skill choices.
- **Missing:** career and mental goals have no effect. Most athletes have ranked nothing. Conditioning and defensive work ignore goals.
- **To close the gap:**
  - Turn the career goal into a direction the plan can use. "Play in college" would lean toward the measurements recruiters look at (speed, arm strength, exit velocity), within the same limits on how much goals can sway choices.
  - Mental goals feed the Mind Fuel lesson choice only, not training.
  - Show "Rank your goals" on the identity card until it is answered.
- **What the athlete sees:** "Because you want to play in college, today's speed work comes first."

### Layer B: clip faults set the technical work
- **Exists today:** faults from clips push up drill choice for skill, warm-up and defensive slots. The effect fades by half every 21 days and drops away entirely after 120 days with no repeat. There are 80 fault records across 18 athletes.
- **Missing:** a fault that is fixed keeps getting drills for weeks. Nothing notices when a newer clip of the same skill is clean.
- **To close the gap:** when a newer clip of the same skill is analysed and doesn't show the fault, fade that fault's drills right away. Say so on the card ("your last clip didn't show it").
- **What the athlete sees:** drills stop the moment they've fixed the fault, instead of weeks later.

### Layer C: games and practices check the load and the reality
- **Exists today:** game days and the date of the next game only.
- **Missing:** results of logged games, and what was actually done at practice.
- **To close the gap:**
  - Add up throwing from logged games (pitch counts) and practice sessions into the same load the recovery limit already uses. A heavy game week then leaves less room automatically. No second plan is created.
  - A fault seen in both a game and a clip ranks above one seen in clips only. Before this can work, the game records need the same fault labels, which they don't have today.
- **What the athlete sees:** a three-game weekend means a lighter Monday. Their real problem in games gets the drill time.

### Layer D: check-ins and workload set the amount
- **Exists today:** sleep, soreness and the recovery limit work.
- **Missing:** day intent and energy have no effect. Conditioning ignores both check-ins and workload.
- **To close the gap:** pass the existing reductions through to conditioning. Day intent ("light day") picks the lighter option for each slot. It never adds work.

### Layer E: season and the next game set the shape (folds in the conditioning proposal)
- **Exists today:** lifting and skill already follow both. Conditioning is two fixed drills.
- **To close the gap:** connect the 10 existing session types so they actually choose conditioning, rotating by:
  - Off-season: building conditioning and repeated sprints.
  - Preseason: practice-day type sessions.
  - In season: short, sharp work, and nothing hard within 48 hours of a game.
  - Pitchers: their own session the day after a start.
  - Tournaments: tournament-day sessions.
  - Coming back after time off: return-to-conditioning sessions.

  The main work stays short, repeated sprints with full rest — what the game demands, not long-distance fitness. Same slot count, same safety limits.
- **What the athlete sees:** conditioning that changes through the year and around their games, instead of the same two drills every day.

### Layer F: their own baselines set what "normal" means
- **Exists today:** personal baselines are recorded but the plan never reads them.
- **To close the gap:** use them in one place only. When a measurement drifts clearly below the athlete's own normal (the existing alert rule: at least 8 clips), that skill gets priority for a slot. Drifting above normal earns nothing extra. Mostly this should explain the plan rather than change it.
- **What the athlete sees:** "Your bat speed is below your normal this week — so today's work is about getting it back."

### Layer G: The General explains it all (folds in The General inference proposal)
- Add a "What your records show" section. Each item links two real records, with dates and the number of data points. Something only appears once it has at least 5 data points.
- It also shows **why today's plan changed** and **which layer caused it**, using Layers A–F.
- It is read-only and never sets the amount of work.

## Suggested order for approval
1. **E — conditioning.** Biggest gap, and the session types are already built.
2. **B — fault fades when fixed.** Small change, big honesty gain.
3. **D — day intent and conditioning respond to check-ins and workload.**
4. **C — game and practice load feeds the recovery limit.** Needs game load tallied.
5. **A — career goal direction** and the goal-ranking prompt.
6. **G — The General "What your records show".**
7. **F — baselines in the plan.** Last, because few athletes have 8 or more clips yet.
8. **C, part two — faults in game records.** Only after game logging captures fault labels.

## Technical notes
- The daily plan is built by `wk-generate-daily`. Goal weighting: `_shared/wic/goals/emphasis.ts`. Fault fading: `faultLedger/priority.ts`. Conditioning: `engines/conditioning.ts` plus `conditioning/templates.ts`, where the 10 session types are currently used only for labelling.
- Stages A–F all change how the plan is built, which is currently frozen. Each one needs your sign-off by name, its own tests, and a live redeploy that you authorise.
- Not confirmed:
  - Whether the profile-goal path in `emphasis.ts` can ever run, because those profile fields may not exist.
  - Where clip faults are written into `wk_fault_signals`. Rows exist, but the code that writes them wasn't found.
  - Whether mobility exists as its own slot, or only sits inside warm-up and recovery.
