ALTER TABLE public.wk_movement_catalog ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.wk_movement_catalog DROP COLUMN IF EXISTS recovery_cost;
ALTER TABLE public.wk_movement_catalog DROP COLUMN IF EXISTS recovery_demand;
ALTER TABLE public.wk_prescriptions ALTER COLUMN sequence_role SET NOT NULL;
ALTER TABLE public.wk_prescriptions ALTER COLUMN dosage_unit SET NOT NULL;