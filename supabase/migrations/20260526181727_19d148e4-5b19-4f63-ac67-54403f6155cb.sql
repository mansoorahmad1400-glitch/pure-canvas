
CREATE TABLE IF NOT EXISTS public.project_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  scene_id uuid,
  asset_type text NOT NULL,
  asset_role text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  public_url text,
  mime_type text,
  file_size bigint,
  duration_seconds numeric,
  width integer,
  height integer,
  provider text NOT NULL DEFAULT 'manual_upload',
  approval_status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assets TO authenticated;
GRANT ALL ON public.project_assets TO service_role;

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select_project_assets" ON public.project_assets
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_insert_project_assets" ON public.project_assets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update_project_assets" ON public.project_assets
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete_project_assets" ON public.project_assets
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS project_assets_project_idx ON public.project_assets(project_id);
CREATE INDEX IF NOT EXISTS project_assets_scene_idx   ON public.project_assets(scene_id);
CREATE INDEX IF NOT EXISTS project_assets_user_idx    ON public.project_assets(user_id);

CREATE TRIGGER trg_project_assets_set_updated_at
  BEFORE UPDATE ON public.project_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Storage bucket (public read for previews)
INSERT INTO storage.buckets (id, name, public)
VALUES ('studioone-assets', 'studioone-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Dev-safe storage policies for this bucket (any signed-in user).
DROP POLICY IF EXISTS "studioone_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "studioone_assets_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "studioone_assets_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "studioone_assets_auth_delete" ON storage.objects;

CREATE POLICY "studioone_assets_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'studioone-assets');
CREATE POLICY "studioone_assets_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'studioone-assets');
CREATE POLICY "studioone_assets_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'studioone-assets');
CREATE POLICY "studioone_assets_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'studioone-assets');
