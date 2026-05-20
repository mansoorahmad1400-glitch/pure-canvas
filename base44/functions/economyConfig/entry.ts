import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Default economy configuration — used when no DB record exists yet
const DEFAULT_CONFIG = {
  plans: {
    free:    { monthly_price: 0,     yearly_price: 0,      max_scenes: 8,  monthly_gems: 2,    generation_access: true,  export_access: false, ai_model: 'gpt-4o-mini' },
    starter: { monthly_price: 9.99,  yearly_price: 99.99,  max_scenes: 12, monthly_gems: 200,  generation_access: true,  export_access: true,  ai_model: 'gpt-4o-mini' },
    premium: { monthly_price: 19.99, yearly_price: 199.99, max_scenes: 15, monthly_gems: 500,  generation_access: true,  export_access: true,  ai_model: 'gpt-4o-mini' },
    elite:   { monthly_price: 39.99, yearly_price: 399.99, max_scenes: 18, monthly_gems: 1200, generation_access: true,  export_access: true,  ai_model: 'gpt-4o' },
  },
  gem_economy: {
    cost_per_generation: 1,
    cost_per_export: 1,
    bonus_gems_new_user: 0,
    referral_reward: 5,
    free_daily_gems: 0,
  },
  model_costs: {
    openai:  { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
    gemini:  { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
    grok:    { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
    future:  { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
  },
  feature_access: {
    free:    { image_gen: false, video_gen: false, exports: false, cinematic_mode: false, ultra_prompts: false, long_form: false, thumbnail_gen: false, youtube_package: true  },
    starter: { image_gen: false, video_gen: false, exports: true,  cinematic_mode: false, ultra_prompts: false, long_form: false, thumbnail_gen: true,  youtube_package: true  },
    premium: { image_gen: true,  video_gen: false, exports: true,  cinematic_mode: true,  ultra_prompts: false, long_form: false, thumbnail_gen: true,  youtube_package: true  },
    elite:   { image_gen: true,  video_gen: true,  exports: true,  cinematic_mode: true,  ultra_prompts: true,  long_form: true,  thumbnail_gen: true,  youtube_package: true  },
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // action: 'save' → write; anything else → read
    if (body.action === 'save') {
      const { plans, gem_economy, model_costs, feature_access, action_costs } = body;

      const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });

      let saved;
      if (records && records.length > 0) {
        saved = await base44.asServiceRole.entities.EconomyConfig.update(records[0].id, {
          plans, gem_economy, model_costs, feature_access, action_costs,
        });
      } else {
        saved = await base44.asServiceRole.entities.EconomyConfig.create({
          config_key: 'main', plans, gem_economy, model_costs, feature_access, action_costs,
        });
      }

      console.log('[EconomyConfig] Saved by admin:', user.email);
      return Response.json({ success: true, config: saved });
    }

    // Default: read
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    if (records && records.length > 0) {
      return Response.json({ config: records[0] });
    }
    return Response.json({ config: { config_key: 'main', ...DEFAULT_CONFIG }, is_default: true });

  } catch (error) {
    console.error('[EconomyConfig] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});