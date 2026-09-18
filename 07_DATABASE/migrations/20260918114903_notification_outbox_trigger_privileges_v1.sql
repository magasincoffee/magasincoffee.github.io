-- TASK-034 security hardening.
-- Production migration applied via Supabase as version 20260918114903.
-- Trigger functions are invoked by Postgres triggers and must not be exposed as RPCs.

revoke execute on function public.notification_schedule_trigger_v1() from public,anon,authenticated;
revoke execute on function public.notification_attendance_trigger_v1() from public,anon,authenticated;
revoke execute on function public.notification_shift_swap_trigger_v1() from public,anon,authenticated;
revoke execute on function public.notification_shift_give_trigger_v1() from public,anon,authenticated;
