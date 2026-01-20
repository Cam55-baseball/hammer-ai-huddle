-- Add RLS policy to allow coaches to manage their follows using the same scout_follows table
CREATE POLICY "Coaches can view their follows"
ON public.scout_follows
FOR SELECT
TO authenticated
USING (
  scout_id = auth.uid() 
  AND public.user_has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Coaches can create follows"
ON public.scout_follows
FOR INSERT
TO authenticated
WITH CHECK (
  scout_id = auth.uid() 
  AND public.user_has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Coaches can update their follows"
ON public.scout_follows
FOR UPDATE
TO authenticated
USING (
  scout_id = auth.uid() 
  AND public.user_has_role(auth.uid(), 'coach'::app_role)
)
WITH CHECK (
  scout_id = auth.uid() 
  AND public.user_has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Coaches can delete their follows"
ON public.scout_follows
FOR DELETE
TO authenticated
USING (
  scout_id = auth.uid() 
  AND public.user_has_role(auth.uid(), 'coach'::app_role)
);