import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Export type definitions ──────────────────────────────────────────────────
const EXPORT_TYPES = {
  storyboard_pdf:    { label: 'Storyboard PDF',         format: 'pdf', provider: 'none',   requiresVideo: false },
  image_zip:         { label: 'Image Pack (ZIP)',        format: 'zip', provider: 'none',   requiresVideo: false },
  audio_zip:         { label: 'Audio Package (ZIP)',     format: 'zip', provider: 'none',   requiresVideo: false },
  prompt_pack:       { label: 'Prompt Pack (TXT)',       format: 'txt', provider: 'none',   requiresVideo: false },
  narration_script:  { label: 'Narration Script (TXT)', format: 'txt', provider: 'none',   requiresVideo: false },
  subtitles_srt:     { label: 'Subtitles (SRT)',         format: 'srt', provider: 'none',   requiresVideo: false },
  shorts_480p:       { label: 'Short (480p MP4)',        format: 'mp4', provider: 'ffmpeg', requiresVideo: true  },
  shorts_720p:       { label: 'Short (720p MP4)',        format: 'mp4', provider: 'ffmpeg', requiresVideo: true  },
  cinematic_1080p:   { label: 'Cinematic (1080p MP4)',   format: 'mp4', provider: 'ffmpeg', requiresVideo: true  },
};

// Default gem costs — admin can override via EconomyConfig
const DEFAULT_COSTS = {
  storyboard_pdf:   2,
  image_zip:        3,
  audio_zip:        2,
  prompt_pack:      0,
  narration_script: 0,
  subtitles_srt:    1,
  shorts_480p:      20,
  shorts_720p:      35,
  cinematic_1080p:  50,
};

// Providers that are "coming soon" / not yet wired
const VIDEO_RENDER_PROVIDERS = ['ffmpeg', 'runway', 'kling', 'luma', 'sora'];

function safeGetEnv(key) {
  try { return Deno.env.get(key) || ''; } catch { return ''; }
}

// Check if a video render provider is operational
// Currently none are wired, so this always returns false for video providers
function isVideoProviderConfigured(provider) {
  // Future: check env keys per provider
  // e.g. ffmpeg would check for a cloud render worker endpoint
  return false;
}

async function getActionCosts(base44) {
  try {
    const configs = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const cfg = configs[0];
    if (cfg?.action_costs) {
      return { ...DEFAULT_COSTS, ...cfg.action_costs };
    }
  } catch { /* use defaults */ }
  return { ...DEFAULT_COSTS };
}

async function getExportCost(exportType, costs) {
  // Map export type keys to action cost keys
  const costMap = {
    storyboard_pdf:   costs.export_storyboard_pdf   ?? costs.storyboard_pdf   ?? DEFAULT_COSTS.storyboard_pdf,
    image_zip:        costs.export_image_zip        ?? costs.image_zip        ?? DEFAULT_COSTS.image_zip,
    audio_zip:        costs.export_audio_zip        ?? costs.audio_zip        ?? DEFAULT_COSTS.audio_zip,
    prompt_pack:      costs.export_prompt_pack      ?? costs.prompt_pack      ?? DEFAULT_COSTS.prompt_pack,
    narration_script: costs.export_narration_script ?? costs.narration_script ?? DEFAULT_COSTS.narration_script,
    subtitles_srt:    costs.export_subtitles_srt    ?? costs.subtitles_srt    ?? DEFAULT_COSTS.subtitles_srt,
    shorts_480p:      costs.export_shorts_480p      ?? costs.shorts_480p      ?? DEFAULT_COSTS.shorts_480p,
    shorts_720p:      costs.export_shorts_720p      ?? costs.shorts_720p      ?? DEFAULT_COSTS.shorts_720p,
    cinematic_1080p:  costs.export_cinematic_1080p  ?? costs.cinematic_1080p  ?? DEFAULT_COSTS.cinematic_1080p,
  };
  return costMap[exportType] ?? 0;
}

async function deductGems(base44, user, gemCost, actionKey, projectId) {
  if (gemCost === 0) return;
  const balance = user.gems_balance ?? 0;
  await base44.asServiceRole.entities.User.update(user.id, {
    gems_balance: balance - gemCost,
  });
  await base44.asServiceRole.entities.GemTransaction.create({
    user_email:       user.email,
    user_id:          user.id,
    plan_name:        user.plan_name || 'free',
    action_key:       actionKey,
    action_label:     EXPORT_TYPES[actionKey]?.label || actionKey,
    action_category:  'export',
    gems_deducted:    gemCost,
    balance_before:   balance,
    balance_after:    balance - gemCost,
    status:           'success',
    project_id:       projectId,
  });
}

async function refundGems(base44, user, gemCost, actionKey, jobId, reason) {
  if (gemCost === 0) return;
  const freshUsers = await base44.asServiceRole.entities.User.filter({ email: user.email });
  const freshUser = freshUsers[0];
  if (!freshUser) return;
  const currentBalance = freshUser.gems_balance ?? 0;
  await base44.asServiceRole.entities.User.update(user.id, {
    gems_balance: currentBalance + gemCost,
  });
  await base44.asServiceRole.entities.GemTransaction.create({
    user_email:       user.email,
    user_id:          user.id,
    action_key:       actionKey + '_refund',
    action_label:     'Refund: ' + (EXPORT_TYPES[actionKey]?.label || actionKey),
    action_category:  'export',
    gems_refunded:    gemCost,
    gems_deducted:    0,
    balance_before:   currentBalance,
    balance_after:    currentBalance + gemCost,
    status:           'refunded',
    error_message:    reason,
  });
  if (jobId) {
    await base44.asServiceRole.entities.ExportJob.update(jobId, {
      gems_refunded: gemCost,
    });
  }
}

// ─── Build a narration script from approved audio jobs ────────────────────────
async function buildNarrationScript(base44, projectId, project) {
  const audioJobs = await base44.asServiceRole.entities.AudioJob.filter({
    project_id: projectId,
    action_type: 'narration',
    approved: true,
  });

  const scenes = await base44.asServiceRole.entities.StoryboardScene.filter({ project_id: projectId });
  scenes.sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0));

  let script = `NARRATION SCRIPT\n`;
  script += `Project: ${project.title || 'Untitled'}\n`;
  script += `Generated: ${new Date().toISOString()}\n\n`;
  script += '='.repeat(60) + '\n\n';

  for (const scene of scenes) {
    const audioJob = audioJobs.find(j => j.scene_number === scene.scene_number);
    script += `SCENE ${scene.scene_number}\n`;
    script += '-'.repeat(30) + '\n';
    if (audioJob?.prompt_text) {
      script += `Narration:\n${audioJob.prompt_text}\n`;
    } else {
      script += `Narration: [No approved narration]\n`;
    }
    script += `\n`;
  }

  return script;
}

// ─── Build a prompt pack from visual prompts ──────────────────────────────────
async function buildPromptPack(base44, projectId, project) {
  const scenes = await base44.asServiceRole.entities.StoryboardScene.filter({ project_id: projectId });
  scenes.sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0));

  let pack = `VISUAL PROMPT PACK\n`;
  pack += `Project: ${project.title || 'Untitled'}\n`;
  pack += `Type: ${project.project_type || 'unknown'}\n`;
  pack += `Generated: ${new Date().toISOString()}\n\n`;
  pack += '='.repeat(60) + '\n\n';

  if (project.master_prompt) {
    pack += `MASTER STORY PROMPT\n${'─'.repeat(40)}\n${project.master_prompt}\n\n`;
  }

  pack += `SCENE VISUAL PROMPTS\n${'─'.repeat(40)}\n\n`;
  for (const scene of scenes) {
    pack += `Scene ${scene.scene_number}:\n${scene.visual_prompt || scene.approved_prompt || '[No prompt]'}\n\n`;
  }

  if (project.sound_prompt) {
    pack += `\nSOUND & MUSIC PROMPTS\n${'─'.repeat(40)}\n${project.sound_prompt}\n`;
  }

  return pack;
}

// ─── Build a basic SRT subtitle file from narration ───────────────────────────
async function buildSRT(base44, projectId) {
  const audioJobs = await base44.asServiceRole.entities.AudioJob.filter({
    project_id: projectId,
    action_type: 'narration',
    approved: true,
  });
  audioJobs.sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0));

  if (audioJobs.length === 0) {
    return null;
  }

  let srt = '';
  let timeOffset = 0;
  for (let i = 0; i < audioJobs.length; i++) {
    const job = audioJobs[i];
    const duration = job.duration || 5;
    const start = timeOffset;
    const end = timeOffset + duration;

    const fmt = (s) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 1000);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
    };

    srt += `${i + 1}\n`;
    srt += `${fmt(start)} --> ${fmt(end)}\n`;
    srt += `${job.prompt_text || `Scene ${job.scene_number}`}\n\n`;
    timeOffset = end + 0.5;
  }
  return srt;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, project_id } = body;

    // ── get_status ─────────────────────────────────────────────────────────────
    if (action === 'get_status') {
      const costs = await getActionCosts(base44);

      // Gather project assets
      let scenes = [], images = [], audioJobs = [], videoJobs = [];
      if (project_id) {
        [scenes, images, audioJobs, videoJobs] = await Promise.all([
          base44.entities.StoryboardScene.filter({ project_id }),
          base44.entities.GeneratedImage.filter({ project_id }),
          base44.entities.AudioJob.filter({ project_id }),
          base44.entities.VideoJob.filter({ project_id }),
        ]);
      }

      const approvedScenes  = scenes.filter(s => s.approved);
      const approvedImages  = images.filter(i => i.approved);
      const approvedAudio   = audioJobs.filter(j => j.approved);
      const completedVideos = videoJobs.filter(j => j.status === 'completed');

      return Response.json({
        success: true,
        video_render_available: false, // future — no provider wired yet
        video_providers: VIDEO_RENDER_PROVIDERS.map(p => ({ key: p, configured: isVideoProviderConfigured(p) })),
        costs: {
          storyboard_pdf:   await getExportCost('storyboard_pdf', costs),
          image_zip:        await getExportCost('image_zip', costs),
          audio_zip:        await getExportCost('audio_zip', costs),
          prompt_pack:      await getExportCost('prompt_pack', costs),
          narration_script: await getExportCost('narration_script', costs),
          subtitles_srt:    await getExportCost('subtitles_srt', costs),
          shorts_480p:      await getExportCost('shorts_480p', costs),
          shorts_720p:      await getExportCost('shorts_720p', costs),
          cinematic_1080p:  await getExportCost('cinematic_1080p', costs),
        },
        summary: {
          total_scenes:      scenes.length,
          approved_scenes:   approvedScenes.length,
          approved_images:   approvedImages.length,
          approved_audio:    approvedAudio.length,
          completed_videos:  completedVideos.length,
          has_narration_script: approvedAudio.length > 0,
          has_video_clips:   completedVideos.length > 0,
        },
        user_balance: user.gems_balance ?? 0,
        user_role: user.role,
      });
    }

    // ── get_jobs ───────────────────────────────────────────────────────────────
    if (action === 'get_jobs') {
      const jobs = await base44.entities.ExportJob.filter({ project_id });
      return Response.json({ success: true, jobs });
    }

    // ── export ─────────────────────────────────────────────────────────────────
    if (action === 'export') {
      const { export_type } = body;
      if (!export_type || !EXPORT_TYPES[export_type]) {
        return Response.json({ error: 'Invalid export type' }, { status: 400 });
      }

      const typeMeta = EXPORT_TYPES[export_type];

      // Block video exports — no provider wired yet
      if (typeMeta.requiresVideo) {
        return Response.json({
          success: false,
          provider_not_configured: true,
          message: 'Video rendering requires a render provider (FFmpeg/cloud worker). None are configured yet.',
        });
      }

      const costs = await getActionCosts(base44);
      const gemCost = await getExportCost(export_type, costs);

      const balance = user.gems_balance ?? 0;
      if (gemCost > 0 && balance < gemCost) {
        return Response.json({ error: 'Insufficient gems', required: gemCost, balance }, { status: 402 });
      }

      // Fetch project
      const projects = await base44.entities.Project.filter({ id: project_id });
      const project = projects[0];
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

      // Create pending job
      const job = await base44.entities.ExportJob.create({
        project_id,
        user_id: user.email,
        export_type,
        format: typeMeta.format,
        provider: typeMeta.provider,
        status: 'preparing',
        gems_cost: gemCost,
      });

      // Deduct gems upfront
      if (gemCost > 0) {
        await deductGems(base44, user, gemCost, export_type, project_id);
      }

      // ── Perform the actual export ──────────────────────────────────────────
      let exportResult = null;

      if (export_type === 'prompt_pack') {
        const text = await buildPromptPack(base44, project_id, project);
        exportResult = { content: text, filename: `${project.title || 'prompts'}_prompt_pack.txt` };
      }

      if (export_type === 'narration_script') {
        const text = await buildNarrationScript(base44, project_id, project);
        exportResult = { content: text, filename: `${project.title || 'script'}_narration.txt` };
      }

      if (export_type === 'subtitles_srt') {
        const srt = await buildSRT(base44, project_id);
        if (!srt) {
          // Refund — nothing to export
          if (gemCost > 0) await refundGems(base44, user, gemCost, export_type, job.id, 'No approved narration found for SRT');
          await base44.entities.ExportJob.update(job.id, { status: 'failed', failed_reason: 'No approved narration audio found' });
          return Response.json({ success: false, error: 'No approved narration found to build subtitles from.' });
        }
        exportResult = { content: srt, filename: `${project.title || 'subtitles'}.srt` };
      }

      if (export_type === 'storyboard_pdf') {
        // Return metadata only — frontend renders PDF via jsPDF
        const scenes = await base44.entities.StoryboardScene.filter({ project_id });
        scenes.sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0));
        exportResult = {
          type: 'client_render_pdf',
          scenes: scenes.map(s => ({
            scene_number: s.scene_number,
            visual_prompt: s.visual_prompt || s.approved_prompt || '',
            image_url: s.approved_image_url || s.image_url || null,
            approved: s.approved,
          })),
          project_title: project.title,
          project_type: project.project_type,
        };
      }

      if (export_type === 'image_zip') {
        const images = await base44.entities.GeneratedImage.filter({ project_id, approved: true });
        if (images.length === 0) {
          if (gemCost > 0) await refundGems(base44, user, gemCost, export_type, job.id, 'No approved images');
          await base44.entities.ExportJob.update(job.id, { status: 'failed', failed_reason: 'No approved images found' });
          return Response.json({ success: false, error: 'No approved images found to export.' });
        }
        exportResult = {
          type: 'image_list',
          images: images.map(i => ({
            scene_number: i.scene_number,
            image_url: i.image_url,
            prompt: i.prompt,
          })),
        };
      }

      if (export_type === 'audio_zip') {
        const audioJobs = await base44.entities.AudioJob.filter({ project_id, approved: true });
        if (audioJobs.length === 0) {
          if (gemCost > 0) await refundGems(base44, user, gemCost, export_type, job.id, 'No approved audio');
          await base44.entities.ExportJob.update(job.id, { status: 'failed', failed_reason: 'No approved audio found' });
          return Response.json({ success: false, error: 'No approved audio found to export.' });
        }
        exportResult = {
          type: 'audio_list',
          audio: audioJobs.map(j => ({
            scene_number: j.scene_number,
            action_type: j.action_type,
            audio_url: j.audio_url,
            prompt_text: j.prompt_text,
          })),
        };
      }

      // Mark job complete
      await base44.entities.ExportJob.update(job.id, {
        status: 'complete',
        completed_at: new Date().toISOString(),
        scenes_count: exportResult?.scenes?.length || exportResult?.images?.length || exportResult?.audio?.length || 0,
      });

      return Response.json({ success: true, job_id: job.id, export_type, ...exportResult });
    }

    // ── generate_social ────────────────────────────────────────────────────────
    if (action === 'generate_social') {
      const projects = await base44.entities.Project.filter({ id: project_id });
      const project = projects[0];
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

      const context = `
Title: ${project.title}
Type: ${project.project_type}
Audience: ${project.audience || 'general'}
Master Story: ${(project.master_prompt || '').slice(0, 500)}
YouTube Title: ${project.youtube_package?.title_primary || project.youtube_title || ''}
YouTube Description: ${(project.youtube_package?.description_primary || project.youtube_description || '').slice(0, 300)}
Tags: ${project.youtube_package?.tags || (project.youtube_tags || []).join(', ')}
      `.trim();

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate social media content packages for this video project. Be creative, platform-appropriate, and engaging.

PROJECT CONTEXT:
${context}

Generate optimized content for each platform. Each should feel native to that platform's culture and format.

Return ONLY valid JSON matching this schema exactly.`,
        response_json_schema: {
          type: 'object',
          properties: {
            tiktok: {
              type: 'object',
              properties: {
                hook: { type: 'string' },
                caption: { type: 'string' },
                hashtags: { type: 'string' },
                cta: { type: 'string' },
              },
            },
            instagram_reels: {
              type: 'object',
              properties: {
                hook: { type: 'string' },
                caption: { type: 'string' },
                hashtags: { type: 'string' },
                cta: { type: 'string' },
              },
            },
            youtube_shorts: {
              type: 'object',
              properties: {
                hook: { type: 'string' },
                caption: { type: 'string' },
                hashtags: { type: 'string' },
                cta: { type: 'string' },
              },
            },
            facebook: {
              type: 'object',
              properties: {
                hook: { type: 'string' },
                caption: { type: 'string' },
                hashtags: { type: 'string' },
                cta: { type: 'string' },
              },
            },
            twitter_x: {
              type: 'object',
              properties: {
                hook: { type: 'string' },
                caption: { type: 'string' },
                hashtags: { type: 'string' },
                cta: { type: 'string' },
              },
            },
          },
        },
      });

      return Response.json({ success: true, social: result });
    }

    // ── cancel_job ─────────────────────────────────────────────────────────────
    if (action === 'cancel_job') {
      const { job_id } = body;
      const jobs = await base44.asServiceRole.entities.ExportJob.filter({ id: job_id });
      const job = jobs[0];
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
      if (user.role !== 'admin' && job.user_id !== user.email) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Refund gems for non-complete jobs
      if (job.status !== 'complete' && job.gems_cost > 0 && job.gems_refunded === 0) {
        await refundGems(base44, user, job.gems_cost, job.export_type, job_id, 'Job cancelled');
      }
      await base44.asServiceRole.entities.ExportJob.update(job_id, { status: 'failed', failed_reason: 'Cancelled by user/admin' });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[exportPipeline]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});