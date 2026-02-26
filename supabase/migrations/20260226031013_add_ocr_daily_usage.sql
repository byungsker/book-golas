ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ocr_daily_usage_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ocr_usage_reset_date DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE OR REPLACE FUNCTION increment_ocr_daily_usage(p_user_id UUID)
RETURNS TABLE(new_count INT, daily_limit INT) AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.users
  SET
    ocr_daily_usage_count = CASE
      WHEN ocr_usage_reset_date < CURRENT_DATE THEN 1
      ELSE COALESCE(ocr_daily_usage_count, 0) + 1
    END,
    ocr_usage_reset_date = CURRENT_DATE
  WHERE id = p_user_id
  RETURNING ocr_daily_usage_count INTO v_count;

  RETURN QUERY SELECT v_count, 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_ocr_daily_usage(p_user_id UUID)
RETURNS TABLE(usage_count INT, reset_date DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN u.ocr_usage_reset_date < CURRENT_DATE THEN 0
      ELSE COALESCE(u.ocr_daily_usage_count, 0)
    END,
    u.ocr_usage_reset_date
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
