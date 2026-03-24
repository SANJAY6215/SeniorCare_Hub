-- ==============================================================================
-- 🚨 SENIORCARE HUB: PRODUCTION DATA WIPE SCRIPT (V4) 🚨
-- ==============================================================================

-- 1. Break the Caregiver-Senior self-referencing link so profiles don't block each other.
-- (The live database table is named public.profiles)
UPDATE public.profiles SET linked_senior_id = NULL;

-- 2. Explicitly delete child records FIRST. 
-- By deleting medications BEFORE the user is deleted, our secure audit triggers 
-- will execute successfully because the user still exists in auth.users.
DELETE FROM public.dose_logs;
DELETE FROM public.medications;

-- 3. Now wipe all the remaining dependent data using the EXACT table names
-- found in the application source code:
DELETE FROM public.security_logs;
DELETE FROM public.vitals;
DELETE FROM public.messages;
DELETE FROM "public"."chat-media";
DELETE FROM public.appointments;

-- 4. Finally, with all dependencies completely cleared, we can 
-- cleanly delete the core auth profiles. (This automatically deletes public.profiles)
DELETE FROM auth.users;

-- 2. Optional: Reset sequences if you use them (not strictly necessary with UUIDs, 
--    but good practice if there are any serial IDs left).
-- (No serial IDs are currently used in the core schema, all are UUIDs).

-- ==============================================================================
-- The database is now completely empty and ready for real users.
-- ==============================================================================
