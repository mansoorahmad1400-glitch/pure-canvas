ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS appearance text,
  ADD COLUMN IF NOT EXISTS personality text,
  ADD COLUMN IF NOT EXISTS voice_style text;