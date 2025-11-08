-- Fix security issues in RLS policies

-- 1. Fix processed_webhook_events table - restrict to owners only
DROP POLICY IF EXISTS "Service role can select webhook events" ON public.processed_webhook_events;

CREATE POLICY "Owners can view webhook events"
ON public.processed_webhook_events
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- 2. Fix app_settings table - require authentication
DROP POLICY IF EXISTS "Everyone can view app settings" ON public.app_settings;

CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);