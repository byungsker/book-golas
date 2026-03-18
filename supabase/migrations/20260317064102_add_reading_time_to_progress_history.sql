ALTER TABLE public.reading_progress_history ADD COLUMN reading_time integer DEFAULT 0;
COMMENT ON COLUMN public.reading_progress_history.reading_time IS 'Reading duration in seconds for this progress record';
