

That's the temporary debug strip we added in the last pass to verify the Adapt flow was actually swapping blocks (showing blockId, created_at, status, and preferences snapshot). It was gated by `import.meta.env.DEV`, but your preview environment evaluates as DEV, so it's visible.

Now that Adapt is confirmed working, we should remove it.

## Plan — Remove temp debug strip

Single file: `src/components/training-block/TrainingBlockView.tsx`

### Change
Delete the `import.meta.env.DEV`-gated debug block that renders `DEBUG blockId / created_at / status / prefs`.

### Out of scope
- No changes to `useTrainingBlock`, logging, or Adapt logic — console logs (`ADAPT CLICKED`, `ADAPT REQUEST`, etc.) stay for now.
- No changes to the "Apply changes to current block" button in `TrainingPreferencesEditor`.

### Verification
Reload `/training-block?mode=block` — debug strip is gone, rest of the view is unchanged.

