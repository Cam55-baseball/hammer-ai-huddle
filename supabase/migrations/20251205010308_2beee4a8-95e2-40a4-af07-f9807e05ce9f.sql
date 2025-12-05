-- Add column to track if video contributes to progress report
ALTER TABLE public.videos 
ADD COLUMN contributes_to_progress boolean NOT NULL DEFAULT true;