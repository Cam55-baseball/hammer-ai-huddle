-- Power Primer (owner 2026-10-07): let the one arm ledger record PAP throws.
-- pap_max_throws count 1.5 each; pap_warmup counts 0.25 each. Additive only.
ALTER TABLE public.arm_ledger_entries DROP CONSTRAINT arm_ledger_entries_throw_type_check;
ALTER TABLE public.arm_ledger_entries ADD CONSTRAINT arm_ledger_entries_throw_type_check CHECK (throw_type = ANY (ARRAY[
  'catch_play','position_throws','infield_quick_release','infield_short_hops','outfield_crow_hop','long_toss',
  'catcher_throwdowns','pitcher_warmup','pitcher_catch_play','pap_max_throws','pap_warmup']));
-- Then switch on real-throw Power Primer actions:
UPDATE public.wk_feature_switches SET mode = 'all' WHERE feature_key = 'pap_real_throws';
