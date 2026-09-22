DROP POLICY IF EXISTS "Public can view visible demo video" ON public.landing_demo_video;

CREATE POLICY "Anyone can view the visible demo video"
ON public.landing_demo_video
FOR SELECT
TO anon
USING (is_visible = true);

CREATE POLICY "Signed-in users view visible demo video; owners view all"
ON public.landing_demo_video
FOR SELECT
TO authenticated
USING (is_visible = true OR public.has_role(auth.uid(), 'owner'::app_role));