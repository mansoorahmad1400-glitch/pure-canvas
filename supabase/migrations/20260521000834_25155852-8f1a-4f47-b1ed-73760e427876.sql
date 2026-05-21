CREATE OR REPLACE FUNCTION public.set_updated_date()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_date = now(); RETURN NEW; END $$;

CREATE TABLE public."Project" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "project_type" text NOT NULL,
  "style" text,
  "visual_style_key" text,
  "genre" text,
  "tone" text,
  "mood" text,
  "target_format" text,
  "audience" text,
  "languages" text[],
  "idea_description" text,
  "status" text DEFAULT 'completed',
  "master_prompt" text,
  "visual_prompt" text,
  "sound_prompt" text,
  "narration_guide" text,
  "youtube_title" text,
  "youtube_description" text,
  "youtube_tags" text[],
  "thumbnail_concept" text,
  "youtube_package" jsonb,
  "gems_used" numeric DEFAULT 1,
  "generation_type" text DEFAULT 'standard',
  "scene_count" numeric,
  "recommended_tools" jsonb,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."GenerationLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text,
  "user_id" text NOT NULL,
  "gems_used" numeric NOT NULL,
  "generation_type" text DEFAULT 'standard' NOT NULL,
  "project_name" text,
  "project_type" text,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."GenerationLog" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."EconomyConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "config_key" text NOT NULL,
  "plans" jsonb,
  "gem_economy" jsonb,
  "model_costs" jsonb,
  "feature_access" jsonb,
  "action_costs" jsonb,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."EconomyConfig" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."GemTransaction" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_email" text NOT NULL,
  "user_id" text,
  "plan_name" text,
  "action_key" text NOT NULL,
  "action_label" text,
  "action_category" text NOT NULL,
  "gems_deducted" numeric DEFAULT 0,
  "gems_refunded" numeric DEFAULT 0,
  "balance_before" numeric,
  "balance_after" numeric,
  "status" text DEFAULT 'success' NOT NULL,
  "error_message" text,
  "admin_note" text,
  "project_id" text,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."GemTransaction" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."StoryboardScene" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "scene_number" numeric NOT NULL,
  "visual_prompt" text,
  "aspect_ratio" text DEFAULT '16:9',
  "image_url" text,
  "image_provider" text,
  "status" text DEFAULT 'pending',
  "approved" boolean DEFAULT false,
  "approved_at" text,
  "approved_image_url" text,
  "approved_prompt" text,
  "gems_used" numeric DEFAULT 0,
  "error_message" text,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."StoryboardScene" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."ProjectCharacter" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "original_name" text,
  "role" text DEFAULT 'supporting',
  "description_short" text,
  "description_full" text,
  "scenes" numeric[],
  "lock_type" text DEFAULT 'none',
  "consistency_status" text DEFAULT 'unlocked',
  "reference_image_url" text,
  "provider_embedding_id" text,
  "location_hints" text[],
  "gems_used" numeric DEFAULT 0,
  "sort_order" numeric DEFAULT 0,
  "dna" jsonb,
  "consistency_score" numeric DEFAULT 0,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."ProjectCharacter" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."VideoJob" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "scene_number" numeric NOT NULL,
  "provider" text,
  "resolution" text DEFAULT '480p',
  "duration" numeric DEFAULT 6,
  "motion_prompt" text,
  "transition_directive" text,
  "anchor_image_url" text,
  "first_frame_url" text,
  "last_frame_url" text,
  "prev_scene_last_frame" text,
  "next_scene_first_frame" text,
  "status" text DEFAULT 'not_started',
  "approved" boolean DEFAULT false,
  "video_url" text,
  "provider_data" jsonb,
  "gems_cost" numeric DEFAULT 0,
  "gems_refunded" numeric DEFAULT 0,
  "error_message" text,
  "completed_at" text,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."VideoJob" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."GeneratedImage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "scene_number" numeric NOT NULL,
  "provider" text,
  "prompt" text,
  "style_preset" text,
  "aspect_ratio" text DEFAULT '16:9',
  "quality" text DEFAULT 'standard',
  "consistency_mode" boolean DEFAULT false,
  "image_url" text,
  "thumbnail_url" text,
  "approved" boolean DEFAULT false,
  "master_frame" boolean DEFAULT false,
  "sent_to_video" boolean DEFAULT false,
  "gems_cost" numeric DEFAULT 0,
  "generation_time_ms" numeric,
  "error_message" text,
  "status" text DEFAULT 'generating',
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."GeneratedImage" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."AudioJob" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "scene_number" numeric NOT NULL,
  "provider" text,
  "action_type" text NOT NULL,
  "language" text,
  "voice_style" text,
  "prompt_text" text,
  "audio_url" text,
  "duration" numeric,
  "status" text DEFAULT 'pending',
  "approved" boolean DEFAULT false,
  "sent_to_export" boolean DEFAULT false,
  "gems_cost" numeric DEFAULT 0,
  "gems_refunded" numeric DEFAULT 0,
  "error_message" text,
  "completed_at" text,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."AudioJob" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."ExportJob" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "export_type" text NOT NULL,
  "resolution" text DEFAULT 'n/a',
  "format" text DEFAULT 'zip',
  "provider" text,
  "scenes_count" numeric DEFAULT 0,
  "status" text DEFAULT 'queued',
  "export_url" text,
  "thumbnail_url" text,
  "gems_cost" numeric DEFAULT 0,
  "gems_refunded" numeric DEFAULT 0,
  "failed_reason" text,
  "completed_at" text,
  "file_size_kb" numeric,
  "duration_seconds" numeric,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."ExportJob" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."WorldLocation" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "canonical_name" text NOT NULL,
  "aliases" text[],
  "location_type" text DEFAULT 'exterior',
  "description" text,
  "scenes" numeric[],
  "lock_type" text DEFAULT 'none',
  "consistency_score" numeric DEFAULT 0,
  "reference_image_url" text,
  "dna" jsonb,
  "sort_order" numeric DEFAULT 0,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."WorldLocation" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."StoryboardDirectorScene" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "scene_number" numeric NOT NULL,
  "story_text" text,
  "visual_prompt" text,
  "motion_prompt" text,
  "camera_direction" text DEFAULT 'wide_shot',
  "transition_type" text DEFAULT 'cut',
  "scene_duration" numeric DEFAULT 6,
  "detected_characters" text[],
  "detected_location" text,
  "pacing" text DEFAULT 'medium',
  "mood" text,
  "approved" boolean DEFAULT false,
  "sort_order" numeric DEFAULT 0,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."StoryboardDirectorScene" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."User" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "role" text DEFAULT 'user',
  "gems_balance" numeric DEFAULT 2,
  "gems_used_this_month" numeric DEFAULT 0,
  "gems_limit_monthly" numeric,
  "gems_reset_date" text,
  "subscription_plan" text,
  "subscription_status" text,
  "subscription_reset_date" text,
  "subscription_cancel_at" text,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "billing_issue" boolean DEFAULT false,
  "billing_issue_since" text,
  created_by_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_upd_project BEFORE UPDATE ON public."Project" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_generationlog BEFORE UPDATE ON public."GenerationLog" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_economyconfig BEFORE UPDATE ON public."EconomyConfig" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_gemtransaction BEFORE UPDATE ON public."GemTransaction" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_storyboardscene BEFORE UPDATE ON public."StoryboardScene" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_projectcharacter BEFORE UPDATE ON public."ProjectCharacter" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_videojob BEFORE UPDATE ON public."VideoJob" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_generatedimage BEFORE UPDATE ON public."GeneratedImage" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_audiojob BEFORE UPDATE ON public."AudioJob" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_exportjob BEFORE UPDATE ON public."ExportJob" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_worldlocation BEFORE UPDATE ON public."WorldLocation" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_storyboarddirectorscene BEFORE UPDATE ON public."StoryboardDirectorScene" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();
CREATE TRIGGER trg_upd_user BEFORE UPDATE ON public."User" FOR EACH ROW EXECUTE FUNCTION public.set_updated_date();

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['Project','GenerationLog','EconomyConfig','GemTransaction','StoryboardScene','ProjectCharacter','VideoJob','GeneratedImage','AudioJob','ExportJob','WorldLocation','StoryboardDirectorScene','User']) LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (created_by_id = auth.uid())', 'own_sel_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (created_by_id = auth.uid())', 'own_ins_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (created_by_id = auth.uid())', 'own_upd_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (created_by_id = auth.uid())', 'own_del_'||t, t);
  END LOOP;
END $$;