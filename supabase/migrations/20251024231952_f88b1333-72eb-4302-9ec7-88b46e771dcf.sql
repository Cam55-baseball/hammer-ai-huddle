-- Migration: Fix authentication flow and add admin role

-- 1. Add RLS policy to allow users to insert their own role
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Add 'admin' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';