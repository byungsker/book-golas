WITH ranked_operations AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE status
          WHEN 'completed' THEN 1
          WHEN 'data_deleted' THEN 2
          ELSE 3
        END,
        updated_at DESC,
        token_hash
    ) AS operation_rank
  FROM public.account_deletion_operations
)
DELETE FROM public.account_deletion_operations AS operations
USING ranked_operations
WHERE operations.ctid = ranked_operations.ctid
  AND ranked_operations.operation_rank > 1;

DROP INDEX IF EXISTS public.account_deletion_operations_user_idx;

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_operations_user_idx
  ON public.account_deletion_operations (user_id);
