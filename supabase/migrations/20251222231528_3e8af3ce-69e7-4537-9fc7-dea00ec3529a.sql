-- Add 5 new score columns to tex_vision_s2_diagnostics for extended cognitive assessment
ALTER TABLE tex_vision_s2_diagnostics
ADD COLUMN IF NOT EXISTS visual_tracking_score numeric,
ADD COLUMN IF NOT EXISTS peripheral_awareness_score numeric,
ADD COLUMN IF NOT EXISTS processing_under_load_score numeric,
ADD COLUMN IF NOT EXISTS impulse_control_score numeric,
ADD COLUMN IF NOT EXISTS fatigue_index_score numeric;