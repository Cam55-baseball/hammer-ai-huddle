
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add retry and render tracking columns to promo_render_queue
ALTER TABLE public.promo_render_queue
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS render_id text;

-- Create trigger function that auto-invokes render-promo edge function on queue insert
CREATE OR REPLACE FUNCTION public.trigger_render_on_queue_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/render-promo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2lrYnNqYWxmdmp3cXpraWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTYyNjAsImV4cCI6MjA3NjU3MjI2MH0.TzgAEk17xlK_qAC4uRHFJTd9SoG5jRNInCUBIuEgA7A'
    ),
    body := jsonb_build_object('queue_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

-- Attach trigger to promo_render_queue
DROP TRIGGER IF EXISTS on_promo_queue_insert ON public.promo_render_queue;
CREATE TRIGGER on_promo_queue_insert
  AFTER INSERT ON public.promo_render_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_render_on_queue_insert();
