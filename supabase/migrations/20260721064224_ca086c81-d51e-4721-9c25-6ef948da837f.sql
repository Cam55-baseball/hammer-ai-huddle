
CREATE TABLE public.recall_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recall_threads TO authenticated;
GRANT ALL ON public.recall_threads TO service_role;
ALTER TABLE public.recall_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recall threads" ON public.recall_threads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX recall_threads_user_updated_idx ON public.recall_threads(user_id, updated_at DESC);

CREATE TABLE public.recall_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.recall_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recall_messages TO authenticated;
GRANT ALL ON public.recall_messages TO service_role;
ALTER TABLE public.recall_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recall messages" ON public.recall_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX recall_messages_thread_created_idx ON public.recall_messages(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.recall_touch_thread()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.recall_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER recall_messages_touch_thread
  AFTER INSERT ON public.recall_messages
  FOR EACH ROW EXECUTE FUNCTION public.recall_touch_thread();
