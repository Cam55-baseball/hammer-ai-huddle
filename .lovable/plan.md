

# Fix: Add 'the-unicorn' to sub_module_progress Check Constraint

## Problem
The `sub_module_progress` table has a check constraint (`sub_module_progress_sub_module_check`) that restricts the `sub_module` column to a predefined list of allowed values. The value `'the-unicorn'` was never added to this list, so any insert for The Unicorn workout fails with a constraint violation.

## Solution
Run a database migration that:
1. Drops the existing `sub_module_progress_sub_module_check` constraint
2. Re-creates it with `'the-unicorn'` added to the allowed values list

## Technical Details

**Migration SQL:**
- Query the existing constraint to see current allowed values
- `ALTER TABLE sub_module_progress DROP CONSTRAINT sub_module_progress_sub_module_check;`
- `ALTER TABLE sub_module_progress ADD CONSTRAINT sub_module_progress_sub_module_check CHECK (sub_module IN (...existing values..., 'the-unicorn'));`

**Files changed:** Database migration only (no code changes needed)

## Secondary Issue
The intermittent `check-subscription` 404 is a deployment timing issue and should resolve on its own once the edge function finishes deploying.

