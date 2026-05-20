import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Video provider registry ──────────────────────────────────────────────────
const VIDEO_PROVIDERS = {
  runway:              { label: 'Runway Gen-3',       key: 'RUNWAY_API_KEY',        minDuration: 5, maxDuration: 10, status: 'available' },
  kling:               { label: 'Kling 1.5',          key: 'KLING_API_KEY',         minDuration: 5, maxDuration: 10, status: 'available' },
  sora:                { label: 'Sora',               key: 'SORA_API_KEY',          minDuration: 5, maxDuration: 10, status: 'available' },
  pika:                { label: 'Pika 1.5',           key: 'PIKA_API_KEY',          minDuration: 3, maxDuration: 10, status: 'available' },
  luma:                { label: 'Luma Dream',         key: 'LUMA_API_KEY',          minDuration: 5, maxDuration: 10, status: 'available' },
  grok_video:          { label: 'Grok Video',         key: 'GROK_VIDEO_API_KEY',    minDuration: 6, maxDuration: 10, status: 'available' },
  grok_imagine_video:  { label: 'Grok Imagine Video', key: 'XAI_API_KEY',           minDuration: 6, maxDuration: 15, status: 'waiting_api_access', note: 'Current API key does not have video generation access' },
  replicate:           { label: 'Replicate (SVD)',    key: 'REPLICATE_API_TOKEN',   minDuration: 4, maxDuration: 15, status: 'available' },
};

async function testProviderConnection(provider) {
  const config = VIDEO_PROVIDERS[provider];
  if (!config) return { connected: false, reason: 'Unknown provider' };
  
  const apiKey = Deno.env.get(config.key);
  if (!apiKey || apiKey.length < 5) {
    return { connected: false, reason: 'API key not configured' };
  }
  
  // Grok Imagine Video special handling - API key exists but video not available
  if (provider === 'grok_imagine_video') {
    return { 
      connected: true, 
      video: false, 
      reason: 'Current API key does not have video generation access. Requires xAI Imagine API upgrade.' 
    };
  }
  
  // For other providers, key presence = available
  return { connected: true, video: true };
}

function getConfiguredProvider() {
  // Prioritize Replicate for video generation (it's actually working)
  const replicateKey = Deno.env.get('REPLICATE_API_TOKEN') || '';
  if (replicateKey.length > 5) return 'replicate';
  
  // Then check other providers (excluding Grok Imagine Video which is not available)
  for (const [id, config] of Object.entries(VIDEO_PROVIDERS)) {
    if (id === 'replicate') continue; // Already checked
    if (id === 'grok_imagine_video') continue; // Not available yet
    let val = '';
    try { val = Deno.env.get(config.key) || ''; } catch {}
    if (val.length > 5) return id;
  }
  return null;
}

// ─── Gem cost lookup ──────────────────────────────────────────────────────────
const DEFAULT_VIDEO_COSTS = {
  video_480p_6s:        20,
  video_480p_10s:       35,
  video_480p_15s:       50,
  video_720p_6s:        30,
  video_720p_10s:       50,
  video_720p_15s:       75,
  video_480p_6s_regen:  30,
  video_480p_10s_regen: 45,
  video_480p_15s_regen: 60,
  video_720p_6s_regen:  55,
  video_720p_10s_regen: 60,
  video_720p_15s_regen: 85,
};

async function getVideoCost(base44, resolution, duration, isRegen) {
  const key = `video_${resolution}_${duration}s${isRegen ? '_regen' : ''}`;
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const actionCosts = records?.[0]?.action_costs || {};
    return actionCosts[key] ?? DEFAULT_VIDEO_COSTS[key] ?? 20;
  } catch {
    return DEFAULT_VIDEO_COSTS[key] ?? 20;
  }
}

// ─── Plan check for video access ──────────────────────────────────────────────
function canUseVideo(role) {
  const r = (role || 'free').toLowerCase();
  // Video requires Creator Pro (premium) or higher
  return r === 'admin' || r === 'premium' || r === 'elite';
}

// ─── Provider dispatch ────────────────────────────────────────────────────────
async function dispatchToProvider(base44, jobId, provider, params) {
  const { anchor_image_url, motion_prompt, transition_directive, resolution, duration, project_id, scene_number } = params;

  // Replicate Video Generation (Stable Video Diffusion / KTX)
  if (provider === 'replicate') {
    const apiToken = Deno.env.get('REPLICATE_API_TOKEN');
    if (!apiToken || apiToken.length < 5) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }

    console.log(`[Replicate] Dispatching job ${jobId} for scene ${scene_number}`);

    // Map resolution to Replicate format
    const dimensions = resolution === '720p' 
      ? { width: 1280, height: 720 }
      : { width: 854, height: 480 };

    // Use Stable Video Diffusion or KTX model
    const requestBody = {
      version: "a00d0b7dcbb9c3fbb34ba87d2d5b46c56969c84a628bf778a5913a7211e72563", // SVD model version
      input: {
        video_url: anchor_image_url,
        video_length: duration === 15 ? "15_frames" : (duration === 10 ? "10_frames" : "6_frames"),
        motion_bucket_id: 127,
        frames_per_second: 24,
      }
    };

    // Submit to Replicate API
    const submitResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!submitResponse.ok) {
      const errorData = await submitResponse.json().catch(() => ({}));
      throw new Error(`Replicate API error: ${errorData.detail || submitResponse.statusText}`);
    }

    const submitData = await submitResponse.json();
    const predictionId = submitData.id;

    if (!predictionId) {
      throw new Error('No prediction ID returned from Replicate');
    }

    // Update job with Replicate prediction ID
    await base44.asServiceRole.entities.VideoJob.update(jobId, {
      status: 'rendering',
      provider_data: { replicate_prediction_id: predictionId },
    });

    // Poll for completion (poll every 3 seconds, max 5 minutes)
    let attempts = 0;
    const maxAttempts = 100;
    let videoUrl = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const status = statusData.status;

        if (status === 'succeeded') {
          videoUrl = statusData.output?.video_url || statusData.output?.[0];
          break;
        } else if (status === 'failed' || status === 'error') {
          throw new Error(statusData.error?.message || 'Generation failed');
        }
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out');
    }

    // Update job as completed
    await base44.asServiceRole.entities.VideoJob.update(jobId, {
      status: 'completed',
      video_url: videoUrl,
      completed_at: new Date().toISOString(),
    });

    console.log(`[Replicate] Job ${jobId} completed successfully`);
    return { success: true, video_url: videoUrl };
  }

  // Other providers (placeholder for future implementation)
  console.log(`[VideoPipeline] Provider ${provider} not yet implemented, marking as failed`);
  throw new Error(`Provider ${provider} not implemented`);
}

function buildGrokPrompt(motionPrompt, transitionDirective, resolution, duration) {
  const parts = [];
  if (motionPrompt) parts.push(motionPrompt);
  if (transitionDirective) parts.push(`Transition: ${transitionDirective}`);
  parts.push(`Duration: ${duration} seconds`);
  parts.push(`Resolution: ${resolution}`);
  parts.push('Style: cinematic, family-safe, high quality');
  return parts.join('. ');
}

// ─── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── action: get_status ──────────────────────────────────────────────────
    // Returns provider config state + plan access + gem costs for the workspace
    if (action === 'get_status') {
      const activeProvider = getConfiguredProvider();
      const gemCosts = {};
      for (const key of Object.keys(DEFAULT_VIDEO_COSTS)) {
        gemCosts[key] = await getVideoCost(base44, '480p', 6, false); // placeholder; resolved per call
      }

      // Fetch actual costs from economy config once
      let actionCosts = { ...DEFAULT_VIDEO_COSTS };
      try {
        const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
        if (records?.[0]?.action_costs) {
          actionCosts = { ...DEFAULT_VIDEO_COSTS, ...records[0].action_costs };
        }
      } catch {}

      // Test provider connections
      const providerTests = {};
      for (const providerId of Object.keys(VIDEO_PROVIDERS)) {
        providerTests[providerId] = await testProviderConnection(providerId);
      }

      return Response.json({
        success: true,
        provider_configured: !!activeProvider,
        active_provider: activeProvider,
        providers: VIDEO_PROVIDERS,
        provider_tests: providerTests,
        plan_access: canUseVideo(user.role),
        gem_costs: actionCosts,
        user_balance: user.gems_balance ?? 0,
        user_role: user.role,
      });
    }

    // ── action: get_jobs ────────────────────────────────────────────────────
    if (action === 'get_jobs') {
      const { project_id } = body;
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });

      const jobs = await base44.asServiceRole.entities.VideoJob.filter({ project_id });
      return Response.json({ success: true, jobs });
    }

    // ── action: submit_job ──────────────────────────────────────────────────
    if (action === 'submit_job') {
      const { project_id, scene_number, anchor_image_url, motion_prompt, transition_directive, resolution, duration } = body;

      if (!project_id || !scene_number) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Gate: plan access
      if (!canUseVideo(user.role)) {
        return Response.json({
          error: 'Video generation requires Creator Pro or Studio Elite plan.',
          plan_gate: true,
        }, { status: 403 });
      }

      // Gate: anchor image must exist + be approved (passed from frontend which checks storyboard)
      if (!anchor_image_url) {
        return Response.json({
          error: 'An approved storyboard frame is required to animate this scene.',
          missing_anchor: true,
        }, { status: 400 });
      }

      // Gate: provider
      const activeProvider = getConfiguredProvider();
      if (!activeProvider) {
        return Response.json({
          error: 'No video provider is configured. Video generation is coming soon.',
          provider_not_configured: true,
        }, { status: 503 });
      }
      
      // Special handling for Grok Imagine Video - not available yet
      if (activeProvider === 'grok_imagine_video') {
        // Refund gems immediately if charged
        if (gemCost > 0) {
          const currentBalance = user.gems_balance ?? 0;
          await base44.auth.updateMe({ gems_balance: currentBalance + gemCost });
          await base44.asServiceRole.entities.GemTransaction.create({
            user_email: user.email,
            user_id: user.id,
            plan_name: user.role,
            action_key: 'video_grok_unavailable',
            action_label: 'Refund: Grok Video not available',
            action_category: 'video',
            gems_deducted: 0,
            gems_refunded: gemCost,
            balance_before: currentBalance,
            balance_after: currentBalance + gemCost,
            status: 'refunded',
            project_id,
          });
        }
        return Response.json({
          error: 'Grok Video is not available for this API key yet. Please choose another provider (Replicate, Runway, Kling, Pika, Luma) or enable it later.',
          grok_unavailable: true,
          suggested_fallbacks: ['replicate', 'runway', 'kling', 'luma', 'pika'],
        }, { status: 503 });
      }

      // Check if job already exists for this scene
      const existing = await base44.asServiceRole.entities.VideoJob.filter({ project_id, scene_number });
      const isRegen = existing.length > 0;

      // Calculate gem cost
      const gemCost = await getVideoCost(base44, resolution || '480p', duration || 6, isRegen);
      const balance = user.gems_balance ?? 0;

      if (!user.role || user.role === 'free' || user.role === 'starter') {
        return Response.json({
          error: 'Video generation requires Creator Pro or Studio Elite plan.',
          plan_gate: true,
        }, { status: 403 });
      }

      if (balance < gemCost) {
        return Response.json({
          error: `Not enough gems. This job costs ${gemCost} 💎 but your balance is ${balance}.`,
          insufficient_gems: true,
          balance,
          cost: gemCost,
        }, { status: 402 });
      }

      // Deduct gems
      await base44.auth.updateMe({ gems_balance: balance - gemCost });

      // Log gem transaction
      await base44.asServiceRole.entities.GemTransaction.create({
        user_email: user.email,
        user_id: user.id,
        plan_name: user.role,
        action_key: `video_${resolution || '480p'}_${duration || 6}s${isRegen ? '_regen' : ''}`,
        action_label: `Animate scene ${scene_number} (${resolution || '480p'} / ${duration || 6}s)`,
        action_category: 'video',
        gems_deducted: gemCost,
        gems_refunded: 0,
        balance_before: balance,
        balance_after: balance - gemCost,
        status: 'pending',
        project_id,
      });

      // Load previous/next scene for frame chaining
      const allJobs = await base44.asServiceRole.entities.VideoJob.filter({ project_id });
      const prevScene = allJobs.find(j => j.scene_number === scene_number - 1);
      const nextScene = allJobs.find(j => j.scene_number === scene_number + 1);

      // Create job record with frame chaining fields
      const job = await base44.asServiceRole.entities.VideoJob.create({
        project_id,
        user_id: user.email,
        scene_number,
        provider: activeProvider,
        resolution: resolution || '480p',
        duration: duration || 6,
        motion_prompt: motion_prompt || '',
        transition_directive: transition_directive || '',
        anchor_image_url,
        first_frame_url: anchor_image_url,
        prev_scene_last_frame: prevScene?.last_frame_url || null,
        next_scene_first_frame: nextScene?.first_frame_url || null,
        status: 'queued',
        gems_cost: gemCost,
        gems_refunded: 0,
      });

      // Dispatch to provider API
      try {
        await dispatchToProvider(base44, job.id, activeProvider, {
          anchor_image_url,
          motion_prompt: motion_prompt || '',
          transition_directive: transition_directive || '',
          resolution: resolution || '480p',
          duration: duration || 6,
          project_id,
          scene_number,
        });
      } catch (providerError) {
        console.error(`[VideoPipeline] Provider error for scene ${scene_number}:`, providerError);
        // Refund gems on failure
        const currentBalance = user.gems_balance ?? 0;
        await base44.auth.updateMe({ gems_balance: currentBalance + gemCost });
        await base44.asServiceRole.entities.VideoJob.update(job.id, {
          status: 'failed',
          gems_refunded: gemCost,
          error_message: providerError.message || 'Provider API failed',
        });
        await base44.asServiceRole.entities.GemTransaction.create({
          user_email: user.email,
          user_id: user.id,
          plan_name: user.role,
          action_key: `video_${resolution || '480p'}_${duration || 6}s_refund`,
          action_label: `Refund: failed scene ${scene_number} job`,
          action_category: 'video',
          gems_deducted: 0,
          gems_refunded: gemCost,
          balance_before: currentBalance,
          balance_after: currentBalance + gemCost,
          status: 'refunded',
          project_id,
        });
        return Response.json({
          error: 'Video generation failed. Gems refunded.',
          details: providerError.message,
        }, { status: 500 });
      }

      return Response.json({ success: true, job, gems_deducted: gemCost });
    }

    // ── action: cancel_job ──────────────────────────────────────────────────
    if (action === 'cancel_job') {
      const { job_id } = body;
      if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });

      const jobs = await base44.asServiceRole.entities.VideoJob.filter({ id: job_id });
      const job = jobs?.[0];
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

      if (job.user_id !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Refund if not completed
      if (job.status !== 'completed' && job.gems_cost > 0) {
        const currentBalance = user.gems_balance ?? 0;
        await base44.auth.updateMe({ gems_balance: currentBalance + job.gems_cost });
        await base44.asServiceRole.entities.VideoJob.update(job_id, {
          status: 'failed',
          gems_refunded: job.gems_cost,
          error_message: 'Cancelled by user',
        });
        await base44.asServiceRole.entities.GemTransaction.create({
          user_email: user.email,
          user_id: user.id,
          plan_name: user.role,
          action_key: 'video_refund',
          action_label: `Refund: cancelled scene ${job.scene_number} job`,
          action_category: 'video',
          gems_deducted: 0,
          gems_refunded: job.gems_cost,
          balance_before: currentBalance,
          balance_after: currentBalance + job.gems_cost,
          status: 'refunded',
          project_id: job.project_id,
        });
      } else {
        await base44.asServiceRole.entities.VideoJob.update(job_id, { status: 'failed', error_message: 'Cancelled by user' });
      }

      return Response.json({ success: true, refunded: job.gems_cost });
    }

    // ── action: update_prompts ──────────────────────────────────────────────
    if (action === 'update_prompts') {
      const { job_id, motion_prompt, transition_directive, resolution, duration } = body;
      if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });
      await base44.asServiceRole.entities.VideoJob.update(job_id, {
        motion_prompt: motion_prompt ?? undefined,
        transition_directive: transition_directive ?? undefined,
        resolution: resolution ?? undefined,
        duration: duration ?? undefined,
      });
      return Response.json({ success: true });
    }

    // ── action: generate_motion_prompt ──────────────────────────────────────
    if (action === 'generate_motion_prompt') {
      const { scene_number, visual_prompt, project_id } = body;
      if (!visual_prompt) return Response.json({ error: 'Missing visual_prompt' }, { status: 400 });

      // Load project for tone/genre context
      let projectCtx = '';
      if (project_id) {
        try {
          const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
          const p = projects?.[0];
          if (p) projectCtx = `Project tone: ${p.tone || 'cinematic'}. Audience: ${p.audience || 'general'}. Genre: ${p.genre || 'story'}.`;
        } catch {}
      }

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a cinematic motion director for AI video generation. Convert this static scene description into a vivid, specific motion prompt for an AI video generator.

${projectCtx}

Scene ${scene_number} visual description:
${visual_prompt.slice(0, 1500)}

Write a single motion prompt paragraph (2-4 sentences) that describes:
1. Camera movement (dolly, pan, tilt, crane, handheld, static, etc.)
2. Subject/character movement (gestures, expressions, actions)
3. Environmental animation (wind, light flicker, crowd movement, water, etc.)
4. Emotional atmosphere and pacing
5. A natural transition cue at the end

Keep it cinematic and specific. Do NOT reference "the image" or "the scene" — describe the motion as if directing a real shot.
Return only the motion prompt text, no labels or formatting.`,
      });

      const motionPrompt = typeof result === 'string' ? result.trim() : '';

      // Auto-generate transition hint from visual_prompt
      let transitionHint = 'Smooth fade transition';
      const lower = (visual_prompt || '').toLowerCase();
      if (/fade|dissolve/.test(lower)) transitionHint = 'Cinematic dissolve to next scene';
      else if (/cut|jump/.test(lower)) transitionHint = 'Hard cut to next scene';
      else if (/pan|wipe/.test(lower)) transitionHint = 'Wipe pan to next scene';

      console.log(`[VideoPipeline] Motion prompt generated for scene ${scene_number}: ${motionPrompt.slice(0, 100)}`);
      return Response.json({ success: true, motion_prompt: motionPrompt, transition_hint: transitionHint });
    }

    // ── action: get_approved_images ──────────────────────────────────────────
    // Returns approved GeneratedImage records per scene for the animation workspace
    if (action === 'get_approved_images') {
      const { project_id } = body;
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const images = await base44.asServiceRole.entities.GeneratedImage.filter({ project_id, approved: true });
      // Return only the latest approved image per scene_number
      const byScene = {};
      for (const img of images) {
        if (!byScene[img.scene_number] || new Date(img.updated_date) > new Date(byScene[img.scene_number].updated_date)) {
          byScene[img.scene_number] = img;
        }
      }
      return Response.json({ success: true, approved_images: Object.values(byScene) });
    }

    // ── action: approve_video ────────────────────────────────────────────────
    // Approve a completed video clip (gate for Audio Studio)
    if (action === 'approve_video') {
      const { job_id } = body;
      if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });
      const jobs = await base44.asServiceRole.entities.VideoJob.filter({ id: job_id });
      const job = jobs?.[0];
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
      if (job.user_id !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (job.status !== 'completed' || !job.video_url) {
        return Response.json({ error: 'Only completed videos with a URL can be approved' }, { status: 400 });
      }
      await base44.asServiceRole.entities.VideoJob.update(job_id, { approved: true });
      return Response.json({ success: true });
    }

    // ── action: unapprove_video ──────────────────────────────────────────────
    if (action === 'unapprove_video') {
      const { job_id } = body;
      if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });
      await base44.asServiceRole.entities.VideoJob.update(job_id, { approved: false });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[VideoPipeline] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});