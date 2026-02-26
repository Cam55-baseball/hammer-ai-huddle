
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sat_score integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS act_score integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gpa numeric(4,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ncaa_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_in_high_school boolean DEFAULT false;
