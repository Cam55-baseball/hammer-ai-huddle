
-- Add per-side tagging to save surfaces so declared switch hitters and
-- ambidextrous throwers can file L / R / Both saves independently.

-- library_video_likes: add side + widen unique constraint
ALTER TABLE public.library_video_likes
  ADD COLUMN IF NOT EXISTS side text
    CHECK (side IN ('L','R','both'));

ALTER TABLE public.library_video_likes
  DROP CONSTRAINT IF EXISTS library_video_likes_user_id_video_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS library_video_likes_user_video_side_uidx
  ON public.library_video_likes (user_id, video_id, COALESCE(side, ''));

-- vault_saved_tips: add side (nullable = "not applicable / single-side user")
ALTER TABLE public.vault_saved_tips
  ADD COLUMN IF NOT EXISTS side text
    CHECK (side IN ('L','R','both'));

CREATE INDEX IF NOT EXISTS vault_saved_tips_user_side_idx
  ON public.vault_saved_tips (user_id, side);

-- vault_workout_notes: add side
ALTER TABLE public.vault_workout_notes
  ADD COLUMN IF NOT EXISTS side text
    CHECK (side IN ('L','R','both'));

CREATE INDEX IF NOT EXISTS vault_workout_notes_user_side_idx
  ON public.vault_workout_notes (user_id, side);

-- vault_saved_drills already has side + check; add helpful index
CREATE INDEX IF NOT EXISTS vault_saved_drills_user_side_idx
  ON public.vault_saved_drills (user_id, side);
