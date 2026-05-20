import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Image provider config loader ────────────────────────────────────────────
async function getImageProviderConfig(base44) {
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const routing = records?.[0]?.model_routing;
    const providers = routing?.providers || {};
    // Find first enabled image provider
    const imageProviders = ['openai_images', 'grok_image', 'gemini_image', 'flux', 'stable_diffusion', 'leonardo', 'ideogram'];
    for (const pid of imageProviders) {
      if (providers[pid]?.enabled) {
        return { enabled: true, provider_id: pid, config: providers[pid] };
      }
    }
    return { enabled: false };
  } catch (e) {
    console.warn('[StoryboardImage] Could not load provider config:', e.message);
    return { enabled: false };
  }
}

// ─── Action cost loader ───────────────────────────────────────────────────────
async function getImageCost(base44, action = 'generate_storyboard_image') {
  const defaults = {
    generate_storyboard_image: 3,
    regenerate_storyboard_image: 4,
    generate_storyboard_quality: 5,
    regenerate_storyboard_quality: 6,
    generate_storyboard_pro: 7,
    regenerate_storyboard_pro: 8,
  };
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const actionCosts = records?.[0]?.action_costs || {};
    return actionCosts[action] ?? defaults[action] ?? 3;
  } catch {
    return defaults[action] ?? 3;
  }
}

// ─── Plan access check ────────────────────────────────────────────────────────
function canUserGenerateImage(user, providerEnabled) {
  if (!providerEnabled) return { allowed: false, reason: 'Image generation provider is not configured yet.' };
  const role = (user.role || 'free').toLowerCase();
  if (role === 'admin') return { allowed: true };
  if (role === 'elite' || role === 'premium') return { allowed: true };
  if (role === 'starter') return { allowed: true }; // allowed if provider is on
  // free: not allowed unless admin enables trial
  return { allowed: false, reason: 'Image generation requires a paid plan. Upgrade to access storyboard images.' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, scene_id, project_id } = body;

    // ─── Action: check_provider ──────────────────────────────────────────────
    if (action === 'check_provider') {
      const providerCfg = await getImageProviderConfig(base44);
      const access = canUserGenerateImage(user, providerCfg.enabled);
      const cost = await getImageCost(base44, 'generate_storyboard_image');
      return Response.json({
        provider_enabled: providerCfg.enabled,
        provider_id: providerCfg.provider_id || null,
        access,
        default_gem_cost: cost,
      });
    }

    // ─── Action: generate_image ──────────────────────────────────────────────
    if (action === 'generate_image') {
      const { visual_prompt, aspect_ratio = '16:9', is_regeneration = false } = body;

      if (!scene_id) return Response.json({ error: 'Missing scene_id' }, { status: 400 });
      if (!visual_prompt) return Response.json({ error: 'Missing visual_prompt' }, { status: 400 });

      const providerCfg = await getImageProviderConfig(base44);
      const access = canUserGenerateImage(user, providerCfg.enabled);
      if (!access.allowed) {
        return Response.json({ error: access.reason }, { status: 403 });
      }

      const costAction = is_regeneration ? 'regenerate_storyboard_image' : 'generate_storyboard_image';
      const gemCost = await getImageCost(base44, costAction);

      // Gem balance check
      if (user.role !== 'admin') {
        const balance = user.gems_balance ?? 0;
        if (balance < gemCost) {
          return Response.json({
            error: `Not enough gems. This costs ${gemCost} gems. Current balance: ${balance}.`,
            insufficient_gems: true,
            balance,
            cost: gemCost,
          }, { status: 402 });
        }
      }

      // Mark scene as generating
      await base44.asServiceRole.entities.StoryboardScene.update(scene_id, {
        status: 'generating',
        error_message: null,
      });

      // ─── Provider dispatch ─────────────────────────────────────────────────
      // Currently: no provider is active → return provider_not_configured
      // Future: dispatch to real provider here
      console.log(`[StoryboardImage] Provider: ${providerCfg.provider_id || 'none'} | Scene: ${scene_id} | Cost: ${gemCost} gems`);

      // Placeholder — provider not live yet
      await base44.asServiceRole.entities.StoryboardScene.update(scene_id, {
        status: 'failed',
        error_message: 'Image generation provider is not configured yet.',
      });

      return Response.json({
        error: 'Image generation provider is not configured yet.',
        provider_not_configured: true,
      }, { status: 503 });
    }

    // ─── Action: approve_frame ───────────────────────────────────────────────
    if (action === 'approve_frame') {
      if (!scene_id) return Response.json({ error: 'Missing scene_id' }, { status: 400 });

      const scenes = await base44.asServiceRole.entities.StoryboardScene.filter({ id: scene_id });
      const scene = scenes?.[0];
      if (!scene) return Response.json({ error: 'Scene not found' }, { status: 404 });
      if (scene.user_id !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      await base44.asServiceRole.entities.StoryboardScene.update(scene_id, {
        approved: true,
        approved_at: new Date().toISOString(),
        approved_image_url: scene.image_url || null,
        approved_prompt: scene.visual_prompt,
      });

      console.log(`[StoryboardImage] Scene ${scene_id} approved by ${user.email}`);
      return Response.json({ success: true });
    }

    // ─── Action: unapprove_frame ─────────────────────────────────────────────
    if (action === 'unapprove_frame') {
      if (!scene_id) return Response.json({ error: 'Missing scene_id' }, { status: 400 });
      await base44.asServiceRole.entities.StoryboardScene.update(scene_id, {
        approved: false,
        approved_at: null,
        approved_image_url: null,
        approved_prompt: null,
      });
      return Response.json({ success: true });
    }

    // ─── Action: init_storyboard ─────────────────────────────────────────────
    // Creates scene records from extracted visual prompts
    if (action === 'init_storyboard') {
      const { scenes } = body; // [{ scene_number, visual_prompt, aspect_ratio }]
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      if (!scenes || !Array.isArray(scenes)) return Response.json({ error: 'Missing scenes array' }, { status: 400 });

      // Delete existing scenes for this project first
      const existing = await base44.asServiceRole.entities.StoryboardScene.filter({ project_id });
      for (const s of existing) {
        await base44.asServiceRole.entities.StoryboardScene.delete(s.id);
      }

      // Create new scene records
      const created = [];
      for (const s of scenes) {
        const record = await base44.asServiceRole.entities.StoryboardScene.create({
          project_id,
          user_id: user.email,
          scene_number: s.scene_number,
          visual_prompt: s.visual_prompt,
          aspect_ratio: s.aspect_ratio || '16:9',
          status: 'pending',
          approved: false,
          gems_used: 0,
        });
        created.push(record);
      }

      console.log(`[StoryboardImage] Initialized ${created.length} storyboard scenes for project ${project_id}`);
      return Response.json({ success: true, scene_count: created.length, scenes: created });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[StoryboardImage] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});