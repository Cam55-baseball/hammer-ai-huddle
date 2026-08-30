# Standards, Evaluation Filtering, and Video Taxonomy

## Build
- Make “New standard” deterministic: open the creation form, smoothly bring it into the viewport, and focus the Organization input. Apply the same behavior to the empty-state action.
- Add an evaluator-only player selector above “Filed by me.” Populate it from distinct athletes present in that evaluator’s fetched reports, default to “All players,” and filter reports and child-detail loading without changing athlete-facing views.
- Replace unconstrained video classification controls with a shared sport → category → sub-skill taxonomy. Changing an upstream selection clears now-invalid downstream values, and save paths validate the combination before persistence.
- Cover baseball and softball across hitting, pitching, throwing, fielding, catching, baserunning, strength, and mental. Sub-skills will use concrete mechanics, outcomes, and development targets already represented by the analysis/planning system; sport-specific pitches remain isolated to their legal pitching branch.
- Keep the existing weighted movement/result/context/correction taxonomy for recommendation scoring, but map the new categorical selection into compatible structured fields/tags so current consumers continue to work.

## Validation
- Add focused tests for taxonomy constraints and evaluator filtering where practical.
- In a loaded browser, click “New standard” and confirm the creation form is visible in the viewport with its first input focused.
- Verify the evaluator selector changes the rendered report list and “All players” restores it.
- Verify sport/category changes expose only valid sub-skills and clear invalid prior choices.

## Technical note
Richer constrained tags should reduce false semantic collisions by giving videos more specific, legal identities. It will not by itself prove or fully resolve an 88% suppression rate: if suppression is caused by the dedupe algorithm’s similarity threshold/key construction, that requires a separate measured adjustment after comparing before/after suppression telemetry. This work will preserve that distinction rather than loosening dedupe blindly.
