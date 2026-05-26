ALTER TABLE public.scene_images
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS notes text;