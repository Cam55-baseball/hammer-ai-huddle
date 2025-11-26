-- Add foreign key constraints for video_annotations to profiles table
ALTER TABLE public.video_annotations
ADD CONSTRAINT video_annotations_scout_id_fkey 
FOREIGN KEY (scout_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.video_annotations
ADD CONSTRAINT video_annotations_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;