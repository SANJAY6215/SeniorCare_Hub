-- ==============================================================================
-- 🚨 SECURITY FIX: RATE LIMITS RLS LOCKDOWN 🚨
-- ==============================================================================
-- The Security Advisor flagged public.rate_limits because it is exposed to the API.
-- Since the rate limit tracking is handled exclusively by a "SECURITY DEFINER" 
-- database function, the table itself never needs to be read or written by users.
-- 
-- By enabling RLS and providing NO access policies, we perfectly lock down the table
-- against all unauthorized access (Deny All).
-- ==============================================================================

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
