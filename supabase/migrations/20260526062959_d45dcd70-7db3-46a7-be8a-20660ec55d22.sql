ALTER TABLE public.scene_videos
  ADD COLUMN IF NOT EXISTS image_id uuid,
  ADD COLUMN IF NOT EXISTS prompt_used text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS notes text;