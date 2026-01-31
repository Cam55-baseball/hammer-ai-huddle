-- ============================================
-- Security Fix: Extension in Public Schema
-- Move pg_net from public to extensions schema
-- ============================================

-- Drop pg_net from public schema and recreate in extensions
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- Security Fix: Overly Permissive RLS Policies
-- Replace "Service role" policies with proper checks
-- These policies allow service_role key operations from edge functions
-- but should NOT use (true) as the condition
-- ============================================

-- 1. Fix audit_log table
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_log;
-- Audit logs should only be written by edge functions using service_role
-- No policy needed for service_role since it bypasses RLS by default
-- The old policy with (true) was redundant and dangerous

-- 2. Fix mind_fuel_challenges table
DROP POLICY IF EXISTS "Service role can insert challenges" ON public.mind_fuel_challenges;
DROP POLICY IF EXISTS "Service role can update challenges" ON public.mind_fuel_challenges;
-- Service role bypasses RLS, these explicit (true) policies are unnecessary

-- 3. Fix mind_fuel_lessons table
DROP POLICY IF EXISTS "Service role can insert lessons" ON public.mind_fuel_lessons;
-- Service role bypasses RLS, this policy is unnecessary

-- 4. Fix mind_fuel_streaks table
DROP POLICY IF EXISTS "Service role can insert streaks" ON public.mind_fuel_streaks;
DROP POLICY IF EXISTS "Service role can update streaks" ON public.mind_fuel_streaks;
-- Service role bypasses RLS, these policies are unnecessary

-- 5. Fix monthly_reports table
DROP POLICY IF EXISTS "Service role can insert reports" ON public.monthly_reports;
-- Service role bypasses RLS, this policy is unnecessary

-- 6. Fix nutrition_daily_tips table
DROP POLICY IF EXISTS "Service role can insert tips" ON public.nutrition_daily_tips;
-- Service role bypasses RLS, this policy is unnecessary

-- 7. Fix processed_webhook_events table
DROP POLICY IF EXISTS "Service role can insert webhook events" ON public.processed_webhook_events;
-- Service role bypasses RLS, this policy is unnecessary

-- 8. Fix user_report_cycles table
DROP POLICY IF EXISTS "Service role can insert cycles" ON public.user_report_cycles;
DROP POLICY IF EXISTS "Service role can update cycles" ON public.user_report_cycles;
-- Service role bypasses RLS, these policies are unnecessary