import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Image provider registry ──────────────────────────────────────────────────
const IMAGE_PROVIDERS = [
  'REPLICATE_API_TOKEN',
  'OPENAI_API_KEY',
  'DALLE_API_KEY',
  'FLUX_API_KEY',
  'MIDJOURNEY_API_KEY',
  'SDXL_API_KEY',
  'IDEOGRAM_API_KEY',
  'LEONARDO_API_KEY',
  'RECRAFT_API_KEY',
  'GROK_IMAGE_API_KEY'
];
const IMAGE_PROVIDER_IDS = [
  'replicate_flux',
  'openai',
  'dalle',
  'flux',
  'midjourney',
  'sdxl',
  'ideogram',
  'leonardo',
  'recraft',
  'grok_image'
];

function getActiveImageProvider() {
  for (let i = 0; i < IMAGE_PROVIDERS.length; i++) {
    let val = '';
    try { val = Deno.env.get(IMAGE_PROVIDERS[i]) || ''; } catch {}
    if (val.length > 5) return IMAGE_PROVIDER_IDS[i];
  }
  // OPENAI_API_KEY is already set for blueprint generation — check if we allow image use
  try {
    const key = Deno.env.get('OPENAI_API_KEY') || '';
    if (key.length > 5) return 'openai';
  } catch {}
  return null;
}

// ─── Default gem costs ────────────────────────────────────────────────────────
const DEFAULT_COSTS = {
  image_generate_standard:     5,
  image_generate_hd:           10,
  image_upscale:               8,
  image_regenerate_standard:   6,
  image_regenerate_hd:         12,
  image_consistency_surcharge: 5,
};

async function loadCosts(base44) {
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const overrides = records?.[0]?.action_costs || {};
    const merged = { ...DEFAULT_COSTS };
    for (const k of Object.keys(DEFAULT_COSTS)) {
      if (overrides[k] !== undefined) merged[k] = overrides[k];
    }
    return merged;
  } catch {
    return { ...DEFAULT_COSTS };
  }
}

// ─── Plan access ──────────────────────────────────────────────────────────────
const BATCH_LIMITS = { free: 0, starter: 3, premium: 8, elite: 99, admin: 99 };

function getPlanImageAccess(role) {
  const r = (role || 'free').toLowerCase();
  return {
    canGenerate:    r !== 'free',
    canHD:          r === 'starter' || r === 'premium' || r === 'elite' || r === 'admin',
    canUpscale:     r === 'premium' || r === 'elite' || r === 'admin',
    canConsistency: r === 'premium' || r === 'elite' || r === 'admin',
    maxPerScene:    r === 'free' ? 1 : r === 'starter' ? 3 : 10,
    batchLimit:     BATCH_LIMITS[r] ?? 0,
    isAdmin:        r === 'admin',
  };
}

// ─── Style suffix registry ─────────────────────────────────────────────────────
const STYLE_SUFFIXES = {
  cinematic_realistic: 'cinematic photography, photorealistic, 8K, dramatic lighting, depth of field, film grain',
  pixar_style:         'Pixar 3D animation style, vibrant colors, subsurface scattering, warm lighting, family-friendly, rounded forms',
  anime:               'anime art style, cel-shaded, vibrant, expressive characters, Studio Ghibli inspired',
  hyper_realistic:     'hyper-realistic photography, ultra-detailed, 8K resolution, macro detail, studio lighting',
  fantasy:             'epic fantasy illustration, painterly, dramatic lighting, magical atmosphere, concept art',
  dark_thriller:       'dark cinematic thriller, desaturated palette, noir shadows, high contrast, gritty realism',
  pakistani_drama:     'South Asian drama aesthetic, warm tones, traditional clothing, cultural richness, emotional close-ups',
  disney_inspired:     'Disney storybook animation style, expressive, hand-drawn aesthetic, bright warm colors, enchanted world',
  neon_cyberpunk:      'neon cyberpunk cityscape, synthwave aesthetic, neon lights, rain-soaked streets, futuristic',
  historical_epic:     'historical epic cinematography, period-accurate costumes, grand architecture, cinematic scope',
};

// ─── Script context → style suffix enrichment ─────────────────────────────────
function buildScriptContextSuffix(scriptContext) {
  if (!scriptContext) return '';
  const { project_type, audience, tone, mood } = scriptContext;

  const AUDIENCE_SUFFIX = {
    kids:      'designed for young children, colorful, safe and expressive',
    family:    'family-friendly, warm and emotionally engaging',
    teens:     'dynamic and relatable for teenagers',
    adults:    'mature and sophisticated visuals',
    universal: 'clear and accessible for all ages',
  };
  const TYPE_SUFFIX = {
    rhyme:       'playful nursery rhyme visual rhythm',
    fairy_tale:  'enchanted fairy tale world with magical creatures',
    educational: 'clear illustrative educational visuals',
    fantasy:     'epic magical fantasy atmosphere',
    mythology:   'grand ancient mythological scale',
    adventure:   'high-energy action adventure dynamism',
    story:       'character-driven emotional narrative',
    documentary: 'authentic documentary realism',
    mystery:     'suspenseful atmospheric mystery',
    folktale:    'traditional cultural folktale artistry',
  };

  const parts = [];
  if (AUDIENCE_SUFFIX[audience]) parts.push(AUDIENCE_SUFFIX[audience]);
  if (TYPE_SUFFIX[project_type]) parts.push(TYPE_SUFFIX[project_type]);
  if (tone) parts.push(`tone: ${tone}`);
  if (mood) parts.push(`mood: ${mood}`);
  parts.push('maintain consistent art style, color palette, and character design across all scenes');

  return parts.filter(Boolean).join(', ');
}

// ─── Build prompt with style + character + world consistency ─────────────────
function buildImagePrompt(basePrompt, stylePreset, characters, scriptContext, worldLocations) {
  let prompt = basePrompt.trim();

  // Inject character DNA / descriptions + approved reference notes for consistency
  if (characters && characters.length > 0) {
    const charDescs = characters
      .filter(c => c.description_full || c.description_short || c.dna?.consistency_prompt)
      .map(c => {
        const injection = c.dna?.consistency_prompt || c.description_full || c.description_short;
        const refNote = c.reference_image_url && c.consistency_status === 'image_locked'
          ? ` [approved reference locked]` : '';
        return `[CHARACTER: ${injection}${refNote}]`;
      })
      .join(' ');
    if (charDescs) prompt = `${charDescs} — ${prompt}`;
  }

  // Inject world/location DNA for environment consistency
  if (worldLocations && worldLocations.length > 0) {
    const worldDescs = worldLocations
      .filter(l => (l.lock_type === 'text' || l.lock_type === 'image') && (l.dna?.consistency_prompt || l.description))
      .map(l => {
        const injection = l.dna?.consistency_prompt || l.description;
        const refNote = l.reference_image_url && l.lock_type === 'image' ? ` [environment reference locked]` : '';
        return `[WORLD: ${injection}${refNote}]`;
      })
      .join(' ');
    if (worldDescs) prompt = `${worldDescs} — ${prompt}`;
  }

  // Append style suffix
  const suffix = STYLE_SUFFIXES[stylePreset];
  if (suffix) prompt = `${prompt}. Style: ${suffix}.`;

  // Append script context enrichment (genre, audience, mood, consistency directive)
  const contextSuffix = buildScriptContextSuffix(scriptContext);
  if (contextSuffix) prompt = `${prompt} Context: ${contextSuffix}.`;

  return prompt;
}

// ─── Actually call Replicate (Flux) image generation ──────────────────────────
async function callReplicateImage(apiToken, prompt, aspectRatio, quality) {
  // Use flux-dev for HD (better quality), flux-schnell for standard (faster)
  const modelOwner = 'black-forest-labs';
  const modelName = quality === 'hd' ? 'flux-dev' : 'flux-schnell';

  // Flux uses aspect_ratio string directly
  const aspectMap = {
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1':  '1:1',
    '21:9': '21:9',
  };
  const aspect = aspectMap[aspectRatio] || '16:9';
  const numSteps = quality === 'hd' ? 28 : 4;

  console.log(`[Replicate] Model: ${modelOwner}/${modelName} | Aspect: ${aspect} | Steps: ${numSteps}`);

  const resp = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
      'Prefer': 'wait=60',
    },
    body: JSON.stringify({
      input: {
        prompt: prompt.slice(0, 2000),
        aspect_ratio: aspect,
        num_inference_steps: numSteps,
        output_format: 'webp',
        output_quality: quality === 'hd' ? 95 : 80,
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.detail || err?.error || `Replicate API error: ${resp.status}`);
  }

  const data = await resp.json();
  console.log(`[Replicate] Response status: ${data.status} | ID: ${data.id}`);

  if (data.status === 'succeeded' && data.output) {
    return Array.isArray(data.output) ? data.output[0] : data.output;
  }

  // Poll if still processing
  if (data.id && (data.status === 'starting' || data.status === 'processing')) {
    return await pollReplicateResult(apiToken, data.id);
  }

  throw new Error(`Replicate generation failed with status: ${data.status}`);
}

async function pollReplicateResult(apiToken, predictionId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000)); // 2s poll
    const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${apiToken}` },
    });
    if (!resp.ok) throw new Error('Polling failed');
    const data = await resp.json();
    if (data.status === 'succeeded' && data.output) {
      return Array.isArray(data.output) ? data.output[0] : data.output;
    }
    if (data.status === 'failed') {
      throw new Error(data.error || 'Replicate generation failed');
    }
  }
  throw new Error('Replicate polling timeout');
}

// ─── Actually call OpenAI image generation ─────────────────────────────────────
async function callOpenAIImage(apiKey, prompt, aspectRatio, quality) {
  // Map aspect ratio to DALL-E size
  const sizeMap = {
    '16:9': '1792x1024',
    '9:16': '1024x1792',
    '1:1':  '1024x1024',
    '21:9': '1792x1024', // closest available
  };
  const size = sizeMap[aspectRatio] || '1792x1024';
  const model = quality === 'hd' ? 'dall-e-3' : 'dall-e-3';
  const qualityParam = quality === 'hd' ? 'hd' : 'standard';

  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: prompt.slice(0, 4000), // DALL-E 3 limit
      n: 1,
      size,
      quality: qualityParam,
      response_format: 'url',
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`OpenAI image API error: ${resp.status}`);
  }

  const data = await resp.json();
  return data?.data?.[0]?.url || null;
}

// ─── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, project_id } = body;
    const access = getPlanImageAccess(user.role);
    const costs = await loadCosts(base44);

    // ── action: get_status ──────────────────────────────────────────────────
    if (action === 'get_status') {
      const activeProvider = getActiveImageProvider();
      return Response.json({
        success: true,
        provider_configured: !!activeProvider,
        active_provider: activeProvider,
        access,
        costs,
        user_balance: user.gems_balance ?? 0,
        user_role: user.role,
      });
    }

    // ── action: get_images ──────────────────────────────────────────────────
    if (action === 'get_images') {
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const images = await base44.asServiceRole.entities.GeneratedImage.filter({ project_id });
      return Response.json({ success: true, images });
    }

    // ── action: generate ────────────────────────────────────────────────────
    if (action === 'generate') {
      const {
        scene_number, base_prompt, style_preset = 'cinematic_realistic',
        style_source = 'manual',
        script_context = null,
        aspect_ratio = '16:9', quality = 'standard',
        consistency_mode = false, character_ids = [],
      } = body;

      console.log(`[ImageGeneration] Style: ${style_preset} (source: ${style_source}) | Script context: ${JSON.stringify(script_context)}`);

      if (!project_id || !scene_number) {
        return Response.json({ error: 'Missing project_id or scene_number' }, { status: 400 });
      }

      // Plan gate
      if (!access.canGenerate && !access.isAdmin) {
        return Response.json({ error: 'Image generation requires a paid plan.', plan_gate: true }, { status: 403 });
      }
      if (quality === 'hd' && !access.canHD) {
        return Response.json({ error: 'HD image generation requires Starter or higher.', plan_gate: true }, { status: 403 });
      }
      if (consistency_mode && !access.canConsistency) {
        return Response.json({ error: 'Consistency mode requires Creator Pro or higher.', plan_gate: true }, { status: 403 });
      }

      // Provider gate
      const activeProvider = getActiveImageProvider();
      if (!activeProvider) {
        return Response.json({
          error: 'Image provider not connected yet.',
          provider_not_configured: true,
        }, { status: 503 });
      }

      // Check max images per scene
      const existing = await base44.asServiceRole.entities.GeneratedImage.filter({ project_id, scene_number });
      const completedCount = existing.filter(i => i.status === 'completed').length;
      if (!access.isAdmin && completedCount >= access.maxPerScene) {
        return Response.json({
          error: `Your plan allows max ${access.maxPerScene} image(s) per scene.`,
          plan_gate: true,
        }, { status: 403 });
      }

      // Determine if regeneration (scene already has images)
      const isRegen = completedCount > 0;

      // Calculate cost
      let gemCost = quality === 'hd'
        ? (isRegen ? costs.image_regenerate_hd : costs.image_generate_hd)
        : (isRegen ? costs.image_regenerate_standard : costs.image_generate_standard);
      if (consistency_mode) gemCost += costs.image_consistency_surcharge;

      // Gem check
      const balance = user.gems_balance ?? 0;
      if (!access.isAdmin && balance < gemCost) {
        return Response.json({
          error: `Not enough gems. Need ${gemCost} 💎, have ${balance}.`,
          insufficient_gems: true,
          balance,
          cost: gemCost,
        }, { status: 402 });
      }

      // Load characters for consistency — always include approved references for scene injection
      let characters = [];
      {
        const allChars = await base44.asServiceRole.entities.ProjectCharacter.filter({ project_id });
        // Always inject image_locked (approved) characters regardless of consistency_mode toggle
        const approvedChars = allChars.filter(c =>
          c.consistency_status === 'image_locked' &&
          (c.scenes?.includes(scene_number) || !c.scenes?.length)
        );
        if (consistency_mode && character_ids.length > 0) {
          const selected = allChars.filter(c => character_ids.includes(c.id) || c.scenes?.includes(scene_number));
          // Merge: approved chars take priority, add any extra selected ones
          const merged = [...approvedChars];
          for (const c of selected) {
            if (!merged.find(m => m.id === c.id)) merged.push(c);
          }
          characters = merged;
        } else {
          characters = approvedChars;
        }
      }

      // Load locked world locations relevant to this scene
      let worldLocations = [];
      try {
        const allLocs = await base44.asServiceRole.entities.WorldLocation.filter({ project_id });
        worldLocations = allLocs.filter(l =>
          (l.lock_type === 'text' || l.lock_type === 'image') &&
          (l.scenes?.includes(scene_number) || l.scenes?.length === 0)
        );
      } catch { /* world memory not yet populated — skip silently */ }

      // Build prompt — inject characters + world locations + script context
      const fullPrompt = buildImagePrompt(base_prompt || '', style_preset, consistency_mode ? characters : [], script_context, worldLocations);

      // Deduct gems (before generation so balance is reserved)
      if (!access.isAdmin) {
        await base44.auth.updateMe({ gems_balance: balance - gemCost });
      }

      // Create job record
      const jobRecord = await base44.asServiceRole.entities.GeneratedImage.create({
        project_id,
        user_id: user.email,
        scene_number,
        provider: activeProvider,
        prompt: fullPrompt,
        style_preset,
        aspect_ratio,
        quality,
        consistency_mode,
        status: 'generating',
        gems_cost: gemCost,
      });
      console.log(`[ImageGeneration] Job created: ${jobRecord.id} | Style: ${style_preset} | Source: ${style_source}`);

      // Log gem transaction
      if (!access.isAdmin) {
        await base44.asServiceRole.entities.GemTransaction.create({
          user_email: user.email,
          user_id: user.id,
          plan_name: user.role,
          action_key: quality === 'hd' ? (isRegen ? 'image_regenerate_hd' : 'image_generate_hd') : (isRegen ? 'image_regenerate_standard' : 'image_generate_standard'),
          action_label: `Generate scene ${scene_number} image (${quality}${consistency_mode ? ' + consistency' : ''})`,
          action_category: 'image',
          gems_deducted: gemCost,
          gems_refunded: 0,
          balance_before: balance,
          balance_after: balance - gemCost,
          status: 'pending',
          project_id,
        });
      }

      // ── Dispatch to provider ──────────────────────────────────────────────
      const startTime = Date.now();
      let imageUrl = null;
      let genError = null;

      try {
        if (activeProvider === 'replicate_flux') {
          let apiToken = '';
          try { apiToken = Deno.env.get('REPLICATE_API_TOKEN') || ''; } catch {}
          if (!apiToken) throw new Error('REPLICATE_API_TOKEN not configured');
          imageUrl = await callReplicateImage(apiToken, fullPrompt, aspect_ratio, quality, 'flux');
        } else if (activeProvider === 'openai') {
          let apiKey = '';
          try { apiKey = Deno.env.get('OPENAI_API_KEY') || ''; } catch {}
          imageUrl = await callOpenAIImage(apiKey, fullPrompt, aspect_ratio, quality);
        } else {
          throw new Error(`Provider "${activeProvider}" not yet integrated`);
        }
      } catch (e) {
        genError = e.message;
        console.error('[ImageGeneration] Provider error:', e.message);
      }

      const genTime = Date.now() - startTime;

      const debugLog = {
        provider: activeProvider,
        latency_ms: genTime,
        prompt_chars: fullPrompt.length,
        aspect_ratio,
        quality,
        success: !!imageUrl,
        error: genError || null,
      };
      console.log('[ImageGeneration] Debug:', JSON.stringify(debugLog));

      if (imageUrl) {
        // Success
        const completedRecord = {
          image_url: imageUrl,
          thumbnail_url: imageUrl,
          status: 'completed',
          generation_time_ms: genTime,
        };
        await base44.asServiceRole.entities.GeneratedImage.update(jobRecord.id, completedRecord);
        if (!access.isAdmin) {
          await base44.asServiceRole.entities.GemTransaction.filter({ project_id, user_email: user.email })
            .then(txns => {
              const last = txns?.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))?.[0];
              if (last?.id) base44.asServiceRole.entities.GemTransaction.update(last.id, { status: 'success', balance_after: balance - gemCost });
            }).catch(() => {});
        }
        return Response.json({
          success: true,
          image: { ...jobRecord, ...completedRecord },
          gems_deducted: gemCost,
          debug: debugLog,
        });
      } else {
        // Failure — refund gems
        await base44.asServiceRole.entities.GeneratedImage.update(jobRecord.id, {
          status: 'failed',
          error_message: genError || 'Unknown error',
        });
        if (!access.isAdmin) {
          await base44.auth.updateMe({ gems_balance: balance }); // restore
          await base44.asServiceRole.entities.GemTransaction.create({
            user_email: user.email,
            user_id: user.id,
            plan_name: user.role,
            action_key: 'image_refund',
            action_label: `Refund: failed image scene ${scene_number}`,
            action_category: 'image',
            gems_deducted: 0,
            gems_refunded: gemCost,
            balance_before: balance - gemCost,
            balance_after: balance,
            status: 'refunded',
            project_id,
          });
        }
        return Response.json({
          error: genError || 'Image generation failed.',
          refunded: gemCost,
          provider_error: true,
        }, { status: 500 });
      }
    }

    // ── action: approve ─────────────────────────────────────────────────────
    if (action === 'approve') {
      const { image_id } = body;
      if (!image_id) return Response.json({ error: 'Missing image_id' }, { status: 400 });
      const imgs = await base44.asServiceRole.entities.GeneratedImage.filter({ id: image_id });
      const img = imgs?.[0];
      if (!img) return Response.json({ error: 'Image not found' }, { status: 404 });
      if (img.user_id !== user.email && !access.isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      // Unapprove all other images for this scene first
      const sceneImages = await base44.asServiceRole.entities.GeneratedImage.filter({ project_id: img.project_id, scene_number: img.scene_number });
      for (const si of sceneImages) {
        if (si.id !== image_id) {
          await base44.asServiceRole.entities.GeneratedImage.update(si.id, { approved: false, master_frame: false });
        }
      }

      await base44.asServiceRole.entities.GeneratedImage.update(image_id, { approved: true, master_frame: true });

      // Also sync to StoryboardScene for video pipeline compatibility
      if (project_id) {
        const scenes = await base44.asServiceRole.entities.StoryboardScene.filter({ project_id: img.project_id, scene_number: img.scene_number });
        const scene = scenes?.[0];
        if (scene) {
          await base44.asServiceRole.entities.StoryboardScene.update(scene.id, {
            approved: true,
            approved_at: new Date().toISOString(),
            approved_image_url: img.image_url,
            approved_prompt: img.prompt,
            image_url: img.image_url,
            status: 'completed',
          });
        }
      }

      return Response.json({ success: true });
    }

    // ── action: unapprove ───────────────────────────────────────────────────
    if (action === 'unapprove') {
      const { image_id } = body;
      if (!image_id) return Response.json({ error: 'Missing image_id' }, { status: 400 });
      await base44.asServiceRole.entities.GeneratedImage.update(image_id, { approved: false, master_frame: false });
      return Response.json({ success: true });
    }

    // ── action: send_to_video ───────────────────────────────────────────────
    if (action === 'send_to_video') {
      const { image_id } = body;
      if (!image_id) return Response.json({ error: 'Missing image_id' }, { status: 400 });
      const imgs = await base44.asServiceRole.entities.GeneratedImage.filter({ id: image_id });
      const img = imgs?.[0];
      if (!img) return Response.json({ error: 'Image not found' }, { status: 404 });
      if (!img.approved) return Response.json({ error: 'Only approved images can be sent to the video pipeline.' }, { status: 400 });

      await base44.asServiceRole.entities.GeneratedImage.update(image_id, { sent_to_video: true });

      // Sync anchor to StoryboardScene
      const scenes = await base44.asServiceRole.entities.StoryboardScene.filter({ project_id: img.project_id, scene_number: img.scene_number });
      const scene = scenes?.[0];
      if (scene) {
        await base44.asServiceRole.entities.StoryboardScene.update(scene.id, {
          approved_image_url: img.image_url,
        });
      }

      return Response.json({ success: true });
    }

    // ── action: delete_image ────────────────────────────────────────────────
    if (action === 'delete_image') {
      const { image_id } = body;
      if (!image_id) return Response.json({ error: 'Missing image_id' }, { status: 400 });
      await base44.asServiceRole.entities.GeneratedImage.delete(image_id);
      return Response.json({ success: true });
    }

    // ── action: save_manual ─────────────────────────────────────────────────
    if (action === 'save_manual') {
      const { project_id, scene_number, image_url, aspect_ratio } = body;
      if (!project_id || !scene_number || !image_url) return Response.json({ error: 'Missing fields' }, { status: 400 });
      const image = await base44.asServiceRole.entities.GeneratedImage.create({
        project_id,
        user_id: user.email,
        scene_number,
        image_url,
        thumbnail_url: image_url,
        status: 'completed',
        style_preset: 'manual_upload',
        aspect_ratio: aspect_ratio || '16:9',
        quality: 'standard',
        gems_cost: 0,
        approved: false,
        prompt: 'Manually uploaded image',
      });
      return Response.json({ success: true, image });
    }

    // ── action: replace_image ───────────────────────────────────────────────
    if (action === 'replace_image') {
      const { image_id, image_url } = body;
      if (!image_id || !image_url) return Response.json({ error: 'Missing fields' }, { status: 400 });
      await base44.asServiceRole.entities.GeneratedImage.update(image_id, {
        image_url,
        thumbnail_url: image_url,
        style_preset: 'manual_upload',
        gems_cost: 0,
        approved: false,
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[ImageGeneration] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});