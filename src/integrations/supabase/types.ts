export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      AudioJob: {
        Row: {
          action_type: string
          approved: boolean | null
          audio_url: string | null
          completed_at: string | null
          created_by_id: string | null
          created_date: string
          duration: number | null
          error_message: string | null
          gems_cost: number | null
          gems_refunded: number | null
          id: string
          language: string | null
          project_id: string
          prompt_text: string | null
          provider: string | null
          scene_number: number
          sent_to_export: boolean | null
          status: string | null
          updated_date: string
          user_id: string
          voice_style: string | null
        }
        Insert: {
          action_type: string
          approved?: boolean | null
          audio_url?: string | null
          completed_at?: string | null
          created_by_id?: string | null
          created_date?: string
          duration?: number | null
          error_message?: string | null
          gems_cost?: number | null
          gems_refunded?: number | null
          id?: string
          language?: string | null
          project_id: string
          prompt_text?: string | null
          provider?: string | null
          scene_number: number
          sent_to_export?: boolean | null
          status?: string | null
          updated_date?: string
          user_id: string
          voice_style?: string | null
        }
        Update: {
          action_type?: string
          approved?: boolean | null
          audio_url?: string | null
          completed_at?: string | null
          created_by_id?: string | null
          created_date?: string
          duration?: number | null
          error_message?: string | null
          gems_cost?: number | null
          gems_refunded?: number | null
          id?: string
          language?: string | null
          project_id?: string
          prompt_text?: string | null
          provider?: string | null
          scene_number?: number
          sent_to_export?: boolean | null
          status?: string | null
          updated_date?: string
          user_id?: string
          voice_style?: string | null
        }
        Relationships: []
      }
      characters: {
        Row: {
          approval_status: string
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          reference_image_url: string | null
          role: string | null
          style_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          reference_image_url?: string | null
          role?: string | null
          style_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          reference_image_url?: string | null
          role?: string | null
          style_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      EconomyConfig: {
        Row: {
          action_costs: Json | null
          config_key: string
          created_by_id: string | null
          created_date: string
          feature_access: Json | null
          gem_economy: Json | null
          id: string
          model_costs: Json | null
          plans: Json | null
          updated_date: string
        }
        Insert: {
          action_costs?: Json | null
          config_key: string
          created_by_id?: string | null
          created_date?: string
          feature_access?: Json | null
          gem_economy?: Json | null
          id?: string
          model_costs?: Json | null
          plans?: Json | null
          updated_date?: string
        }
        Update: {
          action_costs?: Json | null
          config_key?: string
          created_by_id?: string | null
          created_date?: string
          feature_access?: Json | null
          gem_economy?: Json | null
          id?: string
          model_costs?: Json | null
          plans?: Json | null
          updated_date?: string
        }
        Relationships: []
      }
      ExportJob: {
        Row: {
          completed_at: string | null
          created_by_id: string | null
          created_date: string
          duration_seconds: number | null
          export_type: string
          export_url: string | null
          failed_reason: string | null
          file_size_kb: number | null
          format: string | null
          gems_cost: number | null
          gems_refunded: number | null
          id: string
          project_id: string
          provider: string | null
          resolution: string | null
          scenes_count: number | null
          status: string | null
          thumbnail_url: string | null
          updated_date: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_by_id?: string | null
          created_date?: string
          duration_seconds?: number | null
          export_type: string
          export_url?: string | null
          failed_reason?: string | null
          file_size_kb?: number | null
          format?: string | null
          gems_cost?: number | null
          gems_refunded?: number | null
          id?: string
          project_id: string
          provider?: string | null
          resolution?: string | null
          scenes_count?: number | null
          status?: string | null
          thumbnail_url?: string | null
          updated_date?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_by_id?: string | null
          created_date?: string
          duration_seconds?: number | null
          export_type?: string
          export_url?: string | null
          failed_reason?: string | null
          file_size_kb?: number | null
          format?: string | null
          gems_cost?: number | null
          gems_refunded?: number | null
          id?: string
          project_id?: string
          provider?: string | null
          resolution?: string | null
          scenes_count?: number | null
          status?: string | null
          thumbnail_url?: string | null
          updated_date?: string
          user_id?: string
        }
        Relationships: []
      }
      final_exports: {
        Row: {
          approved_scene_ids: string[] | null
          created_at: string
          final_video_url: string | null
          id: string
          preview_video_url: string | null
          project_id: string
          status: string
          updated_at: string
          user_id: string
          validation_notes: string | null
        }
        Insert: {
          approved_scene_ids?: string[] | null
          created_at?: string
          final_video_url?: string | null
          id?: string
          preview_video_url?: string | null
          project_id: string
          status?: string
          updated_at?: string
          user_id: string
          validation_notes?: string | null
        }
        Update: {
          approved_scene_ids?: string[] | null
          created_at?: string
          final_video_url?: string | null
          id?: string
          preview_video_url?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          validation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "final_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      GemTransaction: {
        Row: {
          action_category: string
          action_key: string
          action_label: string | null
          admin_note: string | null
          balance_after: number | null
          balance_before: number | null
          created_by_id: string | null
          created_date: string
          error_message: string | null
          gems_deducted: number | null
          gems_refunded: number | null
          id: string
          plan_name: string | null
          project_id: string | null
          status: string
          updated_date: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          action_category: string
          action_key: string
          action_label?: string | null
          admin_note?: string | null
          balance_after?: number | null
          balance_before?: number | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          gems_deducted?: number | null
          gems_refunded?: number | null
          id?: string
          plan_name?: string | null
          project_id?: string | null
          status?: string
          updated_date?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          action_category?: string
          action_key?: string
          action_label?: string | null
          admin_note?: string | null
          balance_after?: number | null
          balance_before?: number | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          gems_deducted?: number | null
          gems_refunded?: number | null
          id?: string
          plan_name?: string | null
          project_id?: string | null
          status?: string
          updated_date?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      GeneratedImage: {
        Row: {
          approved: boolean | null
          aspect_ratio: string | null
          consistency_mode: boolean | null
          created_by_id: string | null
          created_date: string
          error_message: string | null
          gems_cost: number | null
          generation_time_ms: number | null
          id: string
          image_url: string | null
          master_frame: boolean | null
          project_id: string
          prompt: string | null
          provider: string | null
          quality: string | null
          scene_number: number
          sent_to_video: boolean | null
          status: string | null
          style_preset: string | null
          thumbnail_url: string | null
          updated_date: string
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          aspect_ratio?: string | null
          consistency_mode?: boolean | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          gems_cost?: number | null
          generation_time_ms?: number | null
          id?: string
          image_url?: string | null
          master_frame?: boolean | null
          project_id: string
          prompt?: string | null
          provider?: string | null
          quality?: string | null
          scene_number: number
          sent_to_video?: boolean | null
          status?: string | null
          style_preset?: string | null
          thumbnail_url?: string | null
          updated_date?: string
          user_id: string
        }
        Update: {
          approved?: boolean | null
          aspect_ratio?: string | null
          consistency_mode?: boolean | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          gems_cost?: number | null
          generation_time_ms?: number | null
          id?: string
          image_url?: string | null
          master_frame?: boolean | null
          project_id?: string
          prompt?: string | null
          provider?: string | null
          quality?: string | null
          scene_number?: number
          sent_to_video?: boolean | null
          status?: string | null
          style_preset?: string | null
          thumbnail_url?: string | null
          updated_date?: string
          user_id?: string
        }
        Relationships: []
      }
      GenerationLog: {
        Row: {
          created_by_id: string | null
          created_date: string
          gems_used: number
          generation_type: string
          id: string
          project_id: string | null
          project_name: string | null
          project_type: string | null
          updated_date: string
          user_id: string
        }
        Insert: {
          created_by_id?: string | null
          created_date?: string
          gems_used: number
          generation_type?: string
          id?: string
          project_id?: string | null
          project_name?: string | null
          project_type?: string | null
          updated_date?: string
          user_id: string
        }
        Update: {
          created_by_id?: string | null
          created_date?: string
          gems_used?: number
          generation_type?: string
          id?: string
          project_id?: string | null
          project_name?: string | null
          project_type?: string | null
          updated_date?: string
          user_id?: string
        }
        Relationships: []
      }
      Project: {
        Row: {
          audience: string | null
          created_by_id: string | null
          created_date: string
          gems_used: number | null
          generation_type: string | null
          genre: string | null
          id: string
          idea_description: string | null
          languages: string[] | null
          master_prompt: string | null
          mood: string | null
          narration_guide: string | null
          project_type: string
          recommended_tools: Json | null
          scene_count: number | null
          sound_prompt: string | null
          status: string | null
          style: string | null
          target_format: string | null
          thumbnail_concept: string | null
          title: string
          tone: string | null
          updated_date: string
          visual_prompt: string | null
          visual_style_key: string | null
          youtube_description: string | null
          youtube_package: Json | null
          youtube_tags: string[] | null
          youtube_title: string | null
        }
        Insert: {
          audience?: string | null
          created_by_id?: string | null
          created_date?: string
          gems_used?: number | null
          generation_type?: string | null
          genre?: string | null
          id?: string
          idea_description?: string | null
          languages?: string[] | null
          master_prompt?: string | null
          mood?: string | null
          narration_guide?: string | null
          project_type: string
          recommended_tools?: Json | null
          scene_count?: number | null
          sound_prompt?: string | null
          status?: string | null
          style?: string | null
          target_format?: string | null
          thumbnail_concept?: string | null
          title: string
          tone?: string | null
          updated_date?: string
          visual_prompt?: string | null
          visual_style_key?: string | null
          youtube_description?: string | null
          youtube_package?: Json | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
        }
        Update: {
          audience?: string | null
          created_by_id?: string | null
          created_date?: string
          gems_used?: number | null
          generation_type?: string | null
          genre?: string | null
          id?: string
          idea_description?: string | null
          languages?: string[] | null
          master_prompt?: string | null
          mood?: string | null
          narration_guide?: string | null
          project_type?: string
          recommended_tools?: Json | null
          scene_count?: number | null
          sound_prompt?: string | null
          status?: string | null
          style?: string | null
          target_format?: string | null
          thumbnail_concept?: string | null
          title?: string
          tone?: string | null
          updated_date?: string
          visual_prompt?: string | null
          visual_style_key?: string | null
          youtube_description?: string | null
          youtube_package?: Json | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
        }
        Relationships: []
      }
      project_audio_assets: {
        Row: {
          approval_status: string
          asset_type: string
          audio_url: string | null
          created_at: string
          duration: number | null
          id: string
          project_id: string
          prompt_used: string | null
          provider: string | null
          scene_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          asset_type: string
          audio_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          project_id: string
          prompt_used?: string | null
          provider?: string | null
          scene_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          asset_type?: string
          audio_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          project_id?: string
          prompt_used?: string | null
          provider?: string | null
          scene_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_audio_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_audio_assets_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "storyboard_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      ProjectCharacter: {
        Row: {
          consistency_score: number | null
          consistency_status: string | null
          created_by_id: string | null
          created_date: string
          description_full: string | null
          description_short: string | null
          dna: Json | null
          gems_used: number | null
          id: string
          location_hints: string[] | null
          lock_type: string | null
          name: string
          original_name: string | null
          project_id: string
          provider_embedding_id: string | null
          reference_image_url: string | null
          role: string | null
          scenes: number[] | null
          sort_order: number | null
          updated_date: string
          user_id: string
        }
        Insert: {
          consistency_score?: number | null
          consistency_status?: string | null
          created_by_id?: string | null
          created_date?: string
          description_full?: string | null
          description_short?: string | null
          dna?: Json | null
          gems_used?: number | null
          id?: string
          location_hints?: string[] | null
          lock_type?: string | null
          name: string
          original_name?: string | null
          project_id: string
          provider_embedding_id?: string | null
          reference_image_url?: string | null
          role?: string | null
          scenes?: number[] | null
          sort_order?: number | null
          updated_date?: string
          user_id: string
        }
        Update: {
          consistency_score?: number | null
          consistency_status?: string | null
          created_by_id?: string | null
          created_date?: string
          description_full?: string | null
          description_short?: string | null
          dna?: Json | null
          gems_used?: number | null
          id?: string
          location_hints?: string[] | null
          lock_type?: string | null
          name?: string
          original_name?: string | null
          project_id?: string
          provider_embedding_id?: string | null
          reference_image_url?: string | null
          role?: string | null
          scenes?: number[] | null
          sort_order?: number | null
          updated_date?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          current_phase: string
          id: string
          language_primary: string | null
          language_secondary: string | null
          progress: number
          project_type: string
          status: string
          style: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_phase?: string
          id?: string
          language_primary?: string | null
          language_secondary?: string | null
          progress?: number
          project_type?: string
          status?: string
          style?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_phase?: string
          id?: string
          language_primary?: string | null
          language_secondary?: string | null
          progress?: number
          project_type?: string
          status?: string
          style?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scene_images: {
        Row: {
          approval_status: string
          created_at: string
          id: string
          image_url: string | null
          project_id: string
          prompt_used: string | null
          scene_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          project_id: string
          prompt_used?: string | null
          scene_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          id?: string
          image_url?: string | null
          project_id?: string
          prompt_used?: string | null
          scene_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_images_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "storyboard_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_videos: {
        Row: {
          approval_status: string
          created_at: string
          duration: number | null
          id: string
          project_id: string
          provider: string | null
          scene_id: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          approval_status?: string
          created_at?: string
          duration?: number | null
          id?: string
          project_id: string
          provider?: string | null
          scene_id: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          approval_status?: string
          created_at?: string
          duration?: number | null
          id?: string
          project_id?: string
          provider?: string | null
          scene_id?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scene_videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_videos_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "storyboard_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_scenes: {
        Row: {
          animation_prompt: string | null
          audio_mode: string
          audio_status: string
          audio_timing: number | null
          background_music_prompt: string | null
          camera_direction: string | null
          characters: string[] | null
          created_at: string
          dialogue_text: string | null
          environment_description: string | null
          id: string
          image_prompt: string | null
          narration_text: string | null
          project_id: string
          rhyme_lyrics: string | null
          scene_number: number
          scene_title: string | null
          sfx_prompt: string | null
          story_text: string | null
          transition_to_next: string | null
          updated_at: string
          user_id: string
          visual_status: string
          voice_style: string | null
        }
        Insert: {
          animation_prompt?: string | null
          audio_mode?: string
          audio_status?: string
          audio_timing?: number | null
          background_music_prompt?: string | null
          camera_direction?: string | null
          characters?: string[] | null
          created_at?: string
          dialogue_text?: string | null
          environment_description?: string | null
          id?: string
          image_prompt?: string | null
          narration_text?: string | null
          project_id: string
          rhyme_lyrics?: string | null
          scene_number: number
          scene_title?: string | null
          sfx_prompt?: string | null
          story_text?: string | null
          transition_to_next?: string | null
          updated_at?: string
          user_id: string
          visual_status?: string
          voice_style?: string | null
        }
        Update: {
          animation_prompt?: string | null
          audio_mode?: string
          audio_status?: string
          audio_timing?: number | null
          background_music_prompt?: string | null
          camera_direction?: string | null
          characters?: string[] | null
          created_at?: string
          dialogue_text?: string | null
          environment_description?: string | null
          id?: string
          image_prompt?: string | null
          narration_text?: string | null
          project_id?: string
          rhyme_lyrics?: string | null
          scene_number?: number
          scene_title?: string | null
          sfx_prompt?: string | null
          story_text?: string | null
          transition_to_next?: string | null
          updated_at?: string
          user_id?: string
          visual_status?: string
          voice_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      StoryboardDirectorScene: {
        Row: {
          approved: boolean | null
          camera_direction: string | null
          created_by_id: string | null
          created_date: string
          detected_characters: string[] | null
          detected_location: string | null
          id: string
          mood: string | null
          motion_prompt: string | null
          pacing: string | null
          project_id: string
          scene_duration: number | null
          scene_number: number
          sort_order: number | null
          story_text: string | null
          transition_type: string | null
          updated_date: string
          user_id: string
          visual_prompt: string | null
        }
        Insert: {
          approved?: boolean | null
          camera_direction?: string | null
          created_by_id?: string | null
          created_date?: string
          detected_characters?: string[] | null
          detected_location?: string | null
          id?: string
          mood?: string | null
          motion_prompt?: string | null
          pacing?: string | null
          project_id: string
          scene_duration?: number | null
          scene_number: number
          sort_order?: number | null
          story_text?: string | null
          transition_type?: string | null
          updated_date?: string
          user_id: string
          visual_prompt?: string | null
        }
        Update: {
          approved?: boolean | null
          camera_direction?: string | null
          created_by_id?: string | null
          created_date?: string
          detected_characters?: string[] | null
          detected_location?: string | null
          id?: string
          mood?: string | null
          motion_prompt?: string | null
          pacing?: string | null
          project_id?: string
          scene_duration?: number | null
          scene_number?: number
          sort_order?: number | null
          story_text?: string | null
          transition_type?: string | null
          updated_date?: string
          user_id?: string
          visual_prompt?: string | null
        }
        Relationships: []
      }
      StoryboardScene: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_image_url: string | null
          approved_prompt: string | null
          aspect_ratio: string | null
          created_by_id: string | null
          created_date: string
          error_message: string | null
          gems_used: number | null
          id: string
          image_provider: string | null
          image_url: string | null
          project_id: string
          scene_number: number
          status: string | null
          updated_date: string
          user_id: string
          visual_prompt: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_image_url?: string | null
          approved_prompt?: string | null
          aspect_ratio?: string | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          gems_used?: number | null
          id?: string
          image_provider?: string | null
          image_url?: string | null
          project_id: string
          scene_number: number
          status?: string | null
          updated_date?: string
          user_id: string
          visual_prompt?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_image_url?: string | null
          approved_prompt?: string | null
          aspect_ratio?: string | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          gems_used?: number | null
          id?: string
          image_provider?: string | null
          image_url?: string | null
          project_id?: string
          scene_number?: number
          status?: string | null
          updated_date?: string
          user_id?: string
          visual_prompt?: string | null
        }
        Relationships: []
      }
      User: {
        Row: {
          billing_issue: boolean | null
          billing_issue_since: string | null
          created_by_id: string | null
          created_date: string
          email: string
          full_name: string
          gems_balance: number | null
          gems_limit_monthly: number | null
          gems_reset_date: string | null
          gems_used_this_month: number | null
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at: string | null
          subscription_plan: string | null
          subscription_reset_date: string | null
          subscription_status: string | null
          updated_date: string
        }
        Insert: {
          billing_issue?: boolean | null
          billing_issue_since?: string | null
          created_by_id?: string | null
          created_date?: string
          email: string
          full_name: string
          gems_balance?: number | null
          gems_limit_monthly?: number | null
          gems_reset_date?: string | null
          gems_used_this_month?: number | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at?: string | null
          subscription_plan?: string | null
          subscription_reset_date?: string | null
          subscription_status?: string | null
          updated_date?: string
        }
        Update: {
          billing_issue?: boolean | null
          billing_issue_since?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string
          full_name?: string
          gems_balance?: number | null
          gems_limit_monthly?: number | null
          gems_reset_date?: string | null
          gems_used_this_month?: number | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at?: string | null
          subscription_plan?: string | null
          subscription_reset_date?: string | null
          subscription_status?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      VideoJob: {
        Row: {
          anchor_image_url: string | null
          approved: boolean | null
          completed_at: string | null
          created_by_id: string | null
          created_date: string
          duration: number | null
          error_message: string | null
          first_frame_url: string | null
          gems_cost: number | null
          gems_refunded: number | null
          id: string
          last_frame_url: string | null
          motion_prompt: string | null
          next_scene_first_frame: string | null
          prev_scene_last_frame: string | null
          project_id: string
          provider: string | null
          provider_data: Json | null
          resolution: string | null
          scene_number: number
          status: string | null
          transition_directive: string | null
          updated_date: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          anchor_image_url?: string | null
          approved?: boolean | null
          completed_at?: string | null
          created_by_id?: string | null
          created_date?: string
          duration?: number | null
          error_message?: string | null
          first_frame_url?: string | null
          gems_cost?: number | null
          gems_refunded?: number | null
          id?: string
          last_frame_url?: string | null
          motion_prompt?: string | null
          next_scene_first_frame?: string | null
          prev_scene_last_frame?: string | null
          project_id: string
          provider?: string | null
          provider_data?: Json | null
          resolution?: string | null
          scene_number: number
          status?: string | null
          transition_directive?: string | null
          updated_date?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          anchor_image_url?: string | null
          approved?: boolean | null
          completed_at?: string | null
          created_by_id?: string | null
          created_date?: string
          duration?: number | null
          error_message?: string | null
          first_frame_url?: string | null
          gems_cost?: number | null
          gems_refunded?: number | null
          id?: string
          last_frame_url?: string | null
          motion_prompt?: string | null
          next_scene_first_frame?: string | null
          prev_scene_last_frame?: string | null
          project_id?: string
          provider?: string | null
          provider_data?: Json | null
          resolution?: string | null
          scene_number?: number
          status?: string | null
          transition_directive?: string | null
          updated_date?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      WorldLocation: {
        Row: {
          aliases: string[] | null
          canonical_name: string
          consistency_score: number | null
          created_by_id: string | null
          created_date: string
          description: string | null
          dna: Json | null
          id: string
          location_type: string | null
          lock_type: string | null
          project_id: string
          reference_image_url: string | null
          scenes: number[] | null
          sort_order: number | null
          updated_date: string
          user_id: string
        }
        Insert: {
          aliases?: string[] | null
          canonical_name: string
          consistency_score?: number | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          dna?: Json | null
          id?: string
          location_type?: string | null
          lock_type?: string | null
          project_id: string
          reference_image_url?: string | null
          scenes?: number[] | null
          sort_order?: number | null
          updated_date?: string
          user_id: string
        }
        Update: {
          aliases?: string[] | null
          canonical_name?: string
          consistency_score?: number | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          dna?: Json | null
          id?: string
          location_type?: string | null
          lock_type?: string | null
          project_id?: string
          reference_image_url?: string | null
          scenes?: number[] | null
          sort_order?: number | null
          updated_date?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "premium" | "elite" | "starter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "premium", "elite", "starter"],
    },
  },
} as const
