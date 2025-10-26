-- Fix the create_free_subscription function to work with current schema
-- The function was referencing videos_remaining column which no longer exists

CREATE OR REPLACE FUNCTION public.create_free_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, 
    plan, 
    status, 
    subscribed_modules,
    current_period_end
  )
  VALUES (
    NEW.id, 
    'free', 
    'active', 
    ARRAY[]::text[],
    now() + interval '7 days'
  );
  RETURN NEW;
END;
$$;