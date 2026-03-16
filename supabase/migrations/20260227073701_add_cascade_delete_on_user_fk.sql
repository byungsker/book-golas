ALTER TABLE public.fcm_tokens
  DROP CONSTRAINT IF EXISTS fcm_tokens_user_id_fkey,
  ADD CONSTRAINT fcm_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.push_logs
  DROP CONSTRAINT IF EXISTS push_logs_user_id_fkey,
  ADD CONSTRAINT push_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;