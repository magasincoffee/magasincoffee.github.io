-- TASK-035 concurrent execution reconciliation.
-- Canonical main already owns recipient resolution inside
-- supabase/functions/notification-email-worker/index.ts.
-- Remove the duplicate RPC ownership introduced by 20260918120917.

drop function if exists public.resolve_notification_email_targets_v1(uuid);
drop function if exists public.skip_notification_email_v1(uuid,text);
