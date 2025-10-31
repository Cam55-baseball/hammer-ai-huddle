-- Create coupon_metadata table for owner-defined coupon information
CREATE TABLE public.coupon_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code text UNIQUE NOT NULL,
  custom_name text,
  description text,
  is_ambassador boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_metadata ENABLE ROW LEVEL SECURITY;

-- Owner-only access policies
CREATE POLICY "Owners can view all coupon metadata"
  ON public.coupon_metadata
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert coupon metadata"
  ON public.coupon_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update coupon metadata"
  ON public.coupon_metadata
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Add trigger for updated_at
CREATE TRIGGER update_coupon_metadata_updated_at
  BEFORE UPDATE ON public.coupon_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for fast lookups
CREATE INDEX idx_coupon_metadata_code ON public.coupon_metadata(coupon_code);
CREATE INDEX idx_coupon_metadata_ambassador ON public.coupon_metadata(is_ambassador) WHERE is_ambassador = true;