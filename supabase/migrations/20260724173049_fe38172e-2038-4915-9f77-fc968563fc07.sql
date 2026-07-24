
CREATE TABLE public.landing_demo_video (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'upload',
  title text,
  is_visible boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_demo_video TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_demo_video TO authenticated;
GRANT ALL ON public.landing_demo_video TO service_role;

ALTER TABLE public.landing_demo_video ENABLE ROW LEVEL SECURITY;

-- Public can read only visible rows; owners can read all
CREATE POLICY "Public can view visible demo video"
  ON public.landing_demo_video FOR SELECT
  USING (is_visible = true OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert demo video"
  ON public.landing_demo_video FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update demo video"
  ON public.landing_demo_video FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete demo video"
  ON public.landing_demo_video FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_landing_demo_video_updated_at
  BEFORE UPDATE ON public.landing_demo_video
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
