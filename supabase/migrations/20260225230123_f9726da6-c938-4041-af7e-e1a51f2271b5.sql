
CREATE TABLE public.player_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  player_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can read own notes" ON public.player_notes FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Authors can insert own notes" ON public.player_notes FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own notes" ON public.player_notes FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own notes" ON public.player_notes FOR DELETE USING (auth.uid() = author_id);

CREATE TRIGGER update_player_notes_updated_at
  BEFORE UPDATE ON public.player_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
