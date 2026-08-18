# Add a "Free agent" competition level

Athletes between teams currently have no honest answer to "What level do you compete at right now?" — every option assumes an active roster spot. This adds a Free agent option, with an optional "last level played" so training and weighting stay anchored to reality instead of collapsing to a guess.

## What the athlete sees

- A new **Unaffiliated** group at the top of the level picker with one chip: **Free agent / between teams**.
- When selected, a follow-up sub-picker appears: **Last level you played (optional)** — the same tier list, minus the free agent chip.
- Skipping the follow-up is allowed and stays explicitly unknown — nothing is invented.
- Available on every surface that uses the shared picker: athlete onboarding, Tell Hammer, game setup, and practice game logging.

## Behavior

- Free agent alone carries neutral competition weighting (no credit inflation, no penalty).
- When a last level is provided, competition weighting resolves from that level with a small unaffiliated reduction applied, matching the existing free-agent reduction already defined in the contract-status rules.
- Age group / home state / play state prompts follow the *last level played*, not the free agent chip itself, so a between-teams travel-ball athlete still gets age-group and state capture.

## Technical detail

- `src/data/baseball/competitionLevels.ts` and `src/data/softball/competitionLevels.ts`: add category `'unaffiliated'` to the `CompetitionLevel` type and a `free_agent` entry per sport (neutral multiplier, neutral difficulty index, `pre_collegiate: false`).
- `src/data/competitionWeighting.ts`:
  - `getCompetitionLevelsByCategory` — add `'unaffiliated'` first in the category order with label "Between Teams".
  - `CompetitionWeightInputs` — add optional `lastLevelKey`; when `levelKey === 'free_agent'`, resolve the base level from `lastLevelKey` and apply the `freeAgentReduction` from `src/data/contractStatusRules.ts`. With no last level, return neutral values.
- `src/components/shared/CompetitionLevelPicker.tsx`:
  - `CompetitionSelection` gains `lastLevel?: string`.
  - Render the last-level sub-picker (composite mode) when `level === 'free_agent'`; the free agent chip is excluded from that sub-grid.
  - Age-group / state conditionals read the effective level (`lastLevel` when free agent, otherwise `level`).
  - Legacy string mode still emits just the level key, so Tell Hammer / practice logging keep working unchanged.
- Consumers that persist the composite selection (onboarding competition step) store `lastLevel` alongside the existing fields; no schema change is needed if the selection is stored as a JSON context blob — this will be confirmed against the onboarding save path before writing, and a column/JSON key added only if the save path is column-mapped.
