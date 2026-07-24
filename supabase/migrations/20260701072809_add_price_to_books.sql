-- BOK-378: Store book list price from Aladin metadata
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS price INTEGER;
