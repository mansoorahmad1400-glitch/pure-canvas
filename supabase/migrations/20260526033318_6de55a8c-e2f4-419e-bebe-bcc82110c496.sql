
-- =========================================================
-- StudioOne AI v2 schema (simplified workflow)
-- All tables keyed off auth.users via user_id (uuid)
-- =========================================================

-- Shared updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- projects ----------
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT 'story',
  style TEXT,
  language_primary TEXT DEFAULT 'en',
  language_secondary TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_phase TEXT NOT NULL DEFAULT 'storyboard',
  progress NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_user ON public.projects(user_id);

-- ---------- storyboard_scenes ----------
CREATE TABLE public.storyboard_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  -- VISUAL
  scene_title TEXT,
  story_text TEXT,
  characters TEXT[] DEFAULT '{}',
  environment_description TEXT,
  camera_direction TEXT,
  image_prompt TEXT,
  animation_prompt TEXT,
  transition_to_next TEXT DEFAULT 'cut',
  visual_status TEXT NOT NULL DEFAULT 'draft',
  -- AUDIO
  dialogue_text TEXT,
  narration_text TEXT,
  rhyme_lyrics TEXT,
  background_music_prompt TEXT,
  sfx_prompt TEXT,
  voice_style TEXT,
  audio_timing NUMERIC,
  audio_mode TEXT NOT NULL DEFAULT 'layered', -- 'layered' | 'rhyme_song'
  audio_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, scene_number)
);
CREATE INDEX idx_scenes_project ON public.storyboard_scenes(project_id);

-- ---------- characters ----------
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'supporting',
  description TEXT,
  style_prompt TEXT,
  reference_image_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_characters_project ON public.characters(project_id);

-- ---------- scene_images ----------
CREATE TABLE public.scene_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.storyboard_scenes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  prompt_used TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scene_images_scene ON public.scene_images(scene_id);

-- ---------- scene_videos ----------
CREATE TABLE public.scene_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.storyboard_scenes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT,
  provider TEXT,
  duration NUMERIC,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scene_videos_scene ON public.scene_videos(scene_id);

-- ---------- project_audio_assets ----------
CREATE TABLE public.project_audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.storyboard_scenes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- voice|dialogue|narration|music|sfx|rhyme_song|mix
  audio_url TEXT,
  provider TEXT,
  prompt_used TEXT,
  duration NUMERIC,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audio_project ON public.project_audio_assets(project_id);
CREATE INDEX idx_audio_scene ON public.project_audio_assets(scene_id);

-- ---------- final_exports ----------
CREATE TABLE public.final_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_scene_ids UUID[] DEFAULT '{}',
  preview_video_url TEXT,
  final_video_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued', -- queued|rendering|ready|failed
  validation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_exports_project ON public.final_exports(project_id);

-- =========================================================
-- Enable RLS + per-user policies
-- =========================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects','storyboard_scenes','characters','scene_images',
    'scene_videos','project_audio_assets','final_exports'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "own_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "own_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "own_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "own_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (user_id = auth.uid());', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();', t);
  END LOOP;
END$$;
