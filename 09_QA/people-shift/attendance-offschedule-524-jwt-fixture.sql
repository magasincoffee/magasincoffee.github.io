-- JWT/PostgREST runtime only. Disposable QA, no hosted credentials.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_authenticator') THEN
 CREATE ROLE qa_authenticator LOGIN PASSWORD 'qa-only-524-password' NOINHERIT; END IF;
END $$;
GRANT authenticated,anon TO qa_authenticator;
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
GRANT EXECUTE ON FUNCTION public.can_access_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_manager_attendance_review_authority_v1(uuid) TO authenticated;
REVOKE ALL ON public.attendance_offschedule_requests_v1 FROM authenticated,anon;
-- The only API writers are SECURITY DEFINER functions, not table privileges.
DO $$ BEGIN
 IF has_table_privilege('authenticated','public.attendance_offschedule_requests_v1','INSERT')
 OR has_table_privilege('authenticated','public.attendance_offschedule_requests_v1','UPDATE')
 THEN RAISE EXCEPTION 'QA_DIRECT_WRITE_PRIVILEGE_LEAK'; END IF;
END $$;
NOTIFY pgrst, 'reload schema';
