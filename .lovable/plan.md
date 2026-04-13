

# Refine Weak Elite Scenario: Double or Nothing (Baseball)

## Current Problem
Scenario `f1000001-0000-0000-0000-000000000003` is abstract:
- **Text**: "You push aggressively toward second knowing the throw may go elsewhere."
- **Correct answer**: "Bait a throw to create chaos"
- No runner position, no outs, no ball location, no defensive action. Single-variable read.

## Replacement Scenario

**scenario_text**: "Runner on first, 1 out. You hit a sharp single to right field. Rounding first hard, you see the right fielder charging the ball on the grass while the runner ahead of you is being waved to third. The shortstop is cheating toward second, but the second baseman is still covering the cutoff relay. Do you take second?"

**options**:
1. "Take second aggressively — the SS is vacating coverage and the throw is going to third"
2. "Hold at first — the right fielder is charging and could throw behind you"
3. "Stop between first and second to draw a throw and buy time for the lead runner"
4. "Sprint to second no matter what — you always take the extra base"

**correct_answer**: "Take second aggressively — the SS is vacating coverage and the throw is going to third"

**wrong_explanations**:
- "Hold at first — the right fielder is charging and could throw behind you" → "The RF's momentum is toward home/third. A snap throw behind you is low-percentage and the SS has vacated. You're giving up a free base."
- "Stop between first and second to draw a throw and buy time for the lead runner" → "Stopping in no-man's land with 1 out creates a force/tag situation. The lead runner is already being waved — your job is to take the open base, not manufacture a rundown."
- "Sprint to second no matter what — you always take the extra base" → "Blind aggression ignores the read. If the SS had stayed at second or the RF fielded cleanly on the dirt, you'd be out. The decision is right HERE, but the reason matters."

**game_consequence**: "Runner takes second on the throw to third. With runners at 2nd and 3rd with 1 out, the next batter's sac fly scores both runs."

## What Changes
- Single UPDATE to scenario `f1000001-0000-0000-0000-000000000003`
- No other scenarios touched
- Multi-variable read: RF charge direction + SS positioning + throw destination + lead runner action

