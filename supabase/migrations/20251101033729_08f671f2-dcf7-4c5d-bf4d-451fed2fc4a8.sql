-- Create scout applications table
CREATE TABLE IF NOT EXISTS public.scout_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('baseball', 'softball')),
  organization_letter_url TEXT,
  video_submission_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.scout_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own application
CREATE POLICY "Users can view own application"
ON public.scout_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own application
CREATE POLICY "Users can insert own application"
ON public.scout_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending application
CREATE POLICY "Users can update own pending application"
ON public.scout_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (status = 'pending');

-- Policy: Owners can view all applications
CREATE POLICY "Owners can view all applications"
ON public.scout_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Policy: Owners can update all applications
CREATE POLICY "Owners can update applications"
ON public.scout_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Add trigger for updated_at
CREATE TRIGGER update_scout_applications_updated_at
BEFORE UPDATE ON public.scout_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_scout_applications_user_id ON public.scout_applications(user_id);
CREATE INDEX idx_scout_applications_status ON public.scout_applications(status);

-- Create storage buckets (with conflict handling)
INSERT INTO storage.buckets (id, name, public)
VALUES ('scout-letters', 'scout-letters', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('scout-videos', 'scout-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Scout Letters Storage Policies (drop if exists, then create)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own letters" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own letters" ON storage.objects;
  DROP POLICY IF EXISTS "Owners can view all letters" ON storage.objects;
END $$;

CREATE POLICY "Users can upload their own letters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scout-letters' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own letters"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scout-letters' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can view all letters"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scout-letters' AND
  public.has_role(auth.uid(), 'owner')
);

-- Scout Videos Storage Policies (drop if exists, then create)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
  DROP POLICY IF EXISTS "Owners can view all videos" ON storage.objects;
END $$;

CREATE POLICY "Users can upload their own scout videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scout-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own scout videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scout-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can view all scout videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scout-videos' AND
  public.has_role(auth.uid(), 'owner')
);