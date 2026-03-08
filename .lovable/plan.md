

# Pre-fill Base Distance in PostRepInput

## Problem
The "Base Dist (ft)" field in the optional rep details card starts empty, even though the user already selected a base distance during session setup.

## Fix

**`PostRepInput.tsx`**:
- Add a `config` prop (type `LeadConfig`) to receive the session configuration
- Initialize `baseDist` state with `config.baseDistanceFt` instead of `''`

**`BaseStealingTrainer.tsx`**:
- Pass `config` to `<PostRepInput>` where it's rendered

Two small changes, ~3 lines total.

