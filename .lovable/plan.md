

# Auto-Populate "Team Playing For" from Organization

## Problem
When a coach who owns an organization opens Game Setup, the "Team Playing For" field is blank. It should auto-populate with their organization name.

## Changes

### `src/components/game-scoring/GameSetupForm.tsx`
- Import `useOrganization` hook
- Call `useOrganization()` to get `myOrgs.data`
- Also import `usePlayerOrganization` for coaches who are members (not owners)
- In a `useEffect`, if the user has an org (either as owner via `myOrgs.data[0]?.name` or as member via `orgName`), set `teamName` to that value — only if `teamName` is still empty (don't override user edits)
- Priority: owner org name first, then member org name

### Summary
Single file change. Add a `useEffect` that seeds `teamName` from the user's organization on mount. The field remains editable so users can override it.

