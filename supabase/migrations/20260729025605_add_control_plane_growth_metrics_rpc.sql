CREATE OR REPLACE FUNCTION public.get_control_plane_growth_metrics()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH cutoff AS (
    SELECT now() - interval '7 days' AS value
  ),
  active_users AS (
    SELECT user_id
    FROM public.books, cutoff
    WHERE user_id IS NOT NULL AND created_at >= cutoff.value
    UNION
    SELECT user_id
    FROM public.reading_progress_history, cutoff
    WHERE created_at >= cutoff.value
    UNION
    SELECT user_id
    FROM public.recall_search_history, cutoff
    WHERE created_at >= cutoff.value
  )
  SELECT jsonb_build_object(
    'total_users',
      (SELECT count(*) FROM public.users),
    'new_users_7d',
      (SELECT count(*) FROM public.users, cutoff
       WHERE created_at >= cutoff.value),
    'active_users_7d',
      (SELECT count(*) FROM active_users),
    'total_books',
      (SELECT count(*) FROM public.books),
    'books_created_7d',
      (SELECT count(*) FROM public.books, cutoff
       WHERE created_at >= cutoff.value),
    'users_with_books',
      (SELECT count(DISTINCT user_id) FROM public.books
       WHERE user_id IS NOT NULL),
    'total_reading_records',
      (SELECT count(*) FROM public.reading_progress_history),
    'reading_records_7d',
      (SELECT count(*) FROM public.reading_progress_history, cutoff
       WHERE created_at >= cutoff.value),
    'users_with_reading_records',
      (SELECT count(DISTINCT user_id) FROM public.reading_progress_history),
    'total_ai_recalls',
      (SELECT count(*) FROM public.recall_search_history),
    'ai_recalls_7d',
      (SELECT count(*) FROM public.recall_search_history, cutoff
       WHERE created_at >= cutoff.value),
    'users_with_ai_recall',
      (SELECT count(DISTINCT user_id) FROM public.recall_search_history)
  );
$$;

REVOKE ALL
ON FUNCTION public.get_control_plane_growth_metrics()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_control_plane_growth_metrics()
TO service_role;
