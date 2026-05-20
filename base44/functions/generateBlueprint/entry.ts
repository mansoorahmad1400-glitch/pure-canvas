import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Quality label → user-visible description ──────────────────────────────
const QUALITY_DESC = {
  'Standard AI':   'Powered by Standard AI',
  'Enhanced AI':   'Powered by Enhanced AI',
  'Premium AI':    'Powered by Premium AI',
  'Cinematic AI':  'Powered by Cinematic AI',
  'Premium Trial': '✨ Premium Trial — first generation bonus',
  'Admin Override': 'Admin mode — direct model access',
};

// ─── Model routing via modelRouter function ─────────────────────────────────
// Calls modelRouter to resolve the correct provider/model for this user.
// Falls back to safe defaults if routing fails.

async function resolveModelForUser(base44, user) {
  const PLAN_DEFAULTS = {
    free:    { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI',  max_tokens: 16000 },
    user:    { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI',  max_tokens: 16000 },
    starter: { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI',  max_tokens: 16000 },
    premium: { provider: 'openai', model: 'gpt-4o',      quality_label: 'Enhanced AI',  max_tokens: 16000 },
    elite:   { provider: 'openai', model: 'gpt-4o',      quality_label: 'Premium AI',   max_tokens: 16000 },
    admin:   { provider: 'openai', model: 'gpt-4o',      quality_label: 'Admin Override', max_tokens: 16000 },
  };

  try {
    // Load routing config from EconomyConfig
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const routing = records?.[0]?.model_routing;

    const DEFAULT_ROUTING = {
      plan_models: {
        free_first:  { provider: 'openai', model: 'gpt-4o',      quality_label: 'Premium Trial' },
        free_second: { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI'   },
        starter:     { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI'   },
        premium:     { provider: 'openai', model: 'gpt-4o',      quality_label: 'Enhanced AI'   },
        elite:       { provider: 'openai', model: 'gpt-4o',      quality_label: 'Premium AI'    },
        admin:       { provider: 'openai', model: 'gpt-4o',      quality_label: 'Admin Override' },
      },
      fallback:            { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI' },
      cost_threshold_usd:  0.05,
      admin_cost_override: true,
    };

    const r = routing ? { ...DEFAULT_ROUTING, ...routing } : DEFAULT_ROUTING;
    const role = (user.role || 'free').toLowerCase();
    const gemsUsedTotal = (user.gems_limit_monthly ?? 2) - (user.gems_balance ?? 0);
    const isFirstFreeGen = (role === 'free' || role === 'user') && gemsUsedTotal === 0;

    let planRoute;
    if (role === 'admin')    planRoute = r.plan_models.admin;
    else if (role === 'elite')   planRoute = r.plan_models.elite;
    else if (role === 'premium') planRoute = r.plan_models.premium;
    else if (role === 'starter') planRoute = r.plan_models.starter;
    else if (isFirstFreeGen)     planRoute = r.plan_models.free_first;
    else                         planRoute = r.plan_models.free_second;

    // Cost protection
    const MODEL_COSTS = {
      'gpt-4o-mini': 0.002, 'gpt-4o': 0.01, 'o1-mini': 0.015, 'o3-mini': 0.04,
    };
    const cost = MODEL_COSTS[planRoute.model] ?? 0;
    const threshold = r.cost_threshold_usd ?? 0.05;
    const adminBypass = r.admin_cost_override && role === 'admin';

    if (!adminBypass && cost > threshold) {
      console.warn(`[BlueprintEngine] Cost protection: ${planRoute.model} ($${cost}) > $${threshold} — using fallback`);
      const fb = r.fallback;
      return { model: fb.model, quality_label: fb.quality_label || 'Standard AI', max_tokens: 16000, is_fallback: true, is_free_trial: false };
    }

    return {
      model: planRoute.model,
      quality_label: isFirstFreeGen ? 'Premium Trial' : (planRoute.quality_label || 'Standard AI'),
      max_tokens: planRoute.model?.startsWith('o1') || planRoute.model?.startsWith('o3') ? 65536 : 16000,
      is_fallback: false,
      is_free_trial: isFirstFreeGen,
    };
  } catch (e) {
    console.warn('[BlueprintEngine] Model routing failed, using default:', e.message);
    const role = (user.role || 'free').toLowerCase();
    return { ...(PLAN_DEFAULTS[role] || PLAN_DEFAULTS.free), is_fallback: false, is_free_trial: false };
  }
}

// ─── Blueprint Engine — Subscription Tier Scene Limits ────────────────────────
// FREE:    max 8  scenes — short previews / small concepts
// STARTER: max 12 scenes — complete short-form storytelling
// PREMIUM: max 15 scenes — advanced cinematic storytelling
// ELITE:   max 18 scenes — full production-level output
// ADMIN:   max 18 scenes — same as Elite
const PLAN_SCENE_LIMITS = {
  free:    8,
  starter: 12,
  premium: 15,
  elite:   18,
  admin:   18,
};
const PLAN_MIN_SCENES = {
  free:    4,
  starter: 6,
  premium: 8,
  elite:   10,
  admin:   10,
};

// ─── Validation config loader ─────────────────────────────────────────────
async function loadValidationConfig(base44) {
  const defaults = {
    strict_mode: true,
    max_retries: 2,
    batch_size: 6,
    forbidden_phrases: [
      'continue', 'remaining scenes', 'same as above', 'etc.', 'etc',
      'similar structure', 'repeat for', 'and so on', 'placeholder', '[same]', '[repeat]', '[continue]',
    ],
  };
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const stored = records?.[0]?.validation_config;
    if (stored) return { ...defaults, ...stored };
  } catch (e) {
    console.warn('[BlueprintEngine] Could not load validation config:', e.message);
  }
  return defaults;
}

// ─── Per-section validation ───────────────────────────────────────────────
function validateSection(parsed, section, totalScenes, validationCfg) {
  const errors = [];
  const forbidden = validationCfg.forbidden_phrases || [];

  if (section === 'master_prompt') {
    if (!parsed.master_prompt || parsed.master_prompt.trim().length < 50) {
      errors.push('Section A (Story/Concept) missing or too short');
    }
  }

  if (section === 'visual_prompt') {
    if (!parsed.visual_prompt || parsed.visual_prompt.trim().length < 100) {
      errors.push('Section B (Visual Prompts) missing or too short');
    } else {
      for (let i = 1; i <= totalScenes; i++) {
        if (!new RegExp(`Scene\\s*${i}[^0-9]`, 'i').test(parsed.visual_prompt)) {
          errors.push(`Visual Scene ${i} missing`);
        }
      }
      if (/scene\s*\d+\s*(to|through|–|-)\s*scene\s*\d+/i.test(parsed.visual_prompt)) {
        errors.push('Scene grouping detected in visual_prompt');
      }
      if (validationCfg.strict_mode !== false) {
        for (const phrase of forbidden) {
          if (new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(parsed.visual_prompt)) {
            errors.push(`Forbidden phrase "${phrase}" in visual_prompt`);
          }
        }
      }
    }
  }

  if (section === 'sound_prompt') {
    if (!parsed.sound_prompt || parsed.sound_prompt.trim().length < 100) {
      errors.push('Section C (Sound/Music) missing or too short');
    } else {
      for (let i = 1; i <= totalScenes; i++) {
        if (!new RegExp(`Scene\\s*${i}[^0-9]`, 'i').test(parsed.sound_prompt)) {
          errors.push(`Sound Scene ${i} missing`);
        }
      }
      if (/scene\s*\d+\s*(to|through|–|-)\s*scene\s*\d+/i.test(parsed.sound_prompt)) {
        errors.push('Scene grouping detected in sound_prompt');
      }
      if (validationCfg.strict_mode !== false) {
        for (const phrase of forbidden) {
          if (new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(parsed.sound_prompt)) {
            errors.push(`Forbidden phrase "${phrase}" in sound_prompt`);
          }
        }
      }
    }
  }

  if (section === 'youtube_package') {
    const yt = parsed.youtube_package;
    if (!yt || typeof yt !== 'object') {
      errors.push('Section D (YouTube Package) missing');
    } else {
      const requiredYt = ['title_primary', 'title_secondary', 'description_primary', 'description_secondary', 'tags', 'thumbnail_hook_primary', 'thumbnail_hook_secondary'];
      for (const f of requiredYt) {
        if (!yt[f] || String(yt[f]).trim().length < 2) errors.push(`YouTube field missing: ${f}`);
      }
    }
    if (!yt?.thumbnail_hook_primary && !yt?.thumbnail_concept) {
      errors.push('Section E (Thumbnail) missing');
    }
  }

  return errors;
}

// ─── Full output validator ───────────────────────────────────────────────────
function validateOutput(parsed, totalScenes, validationCfg) {
  const cfg = validationCfg || { strict_mode: true, forbidden_phrases: [] };
  return [
    ...validateSection(parsed, 'master_prompt', totalScenes, cfg),
    ...validateSection(parsed, 'visual_prompt', totalScenes, cfg),
    ...validateSection(parsed, 'sound_prompt', totalScenes, cfg),
    ...validateSection(parsed, 'youtube_package', totalScenes, cfg),
  ];
}

// ─── Output cleaner ──────────────────────────────────────────────────────────
function cleanOutput(parsed) {
  const clean = { ...parsed };
  const textFields = ['visual_prompt', 'sound_prompt', 'narration_guide'];
  for (const field of textFields) {
    if (typeof clean[field] === 'string') {
      let text = clean[field];
      text = text.replace(/(Scene\s+\d+\s*:?)/gi, '\n\n$1');
      text = text.replace(/\n{3,}/g, '\n\n');
      text = text.replace(/(---+\s*){2,}/g, '---\n');
      clean[field] = text.trim();
    }
  }
  if (typeof clean.master_prompt === 'string') clean.master_prompt = clean.master_prompt.trim();
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // ─── Plan detection ────────────────────────────────────────────────────────
    const role = (user.role || 'free').toLowerCase();

    // ─── Server-side gem balance check ─────────────────────────────────────────
    const GEM_COST = 1; // cost per blueprint generation
    if (role !== 'admin') {
      const balance = user.gems_balance ?? 0;
      if (balance < GEM_COST) {
        console.warn(`[BlueprintEngine] Insufficient gems for ${user.email}: balance=${balance}`);
        return Response.json({
          error: `You need ${GEM_COST} gem to generate a blueprint. Current balance: ${balance}.`,
          insufficient_gems: true,
          balance,
          cost: GEM_COST,
        }, { status: 402 });
      }
    }
    const planMax = PLAN_SCENE_LIMITS[role] ?? PLAN_SCENE_LIMITS.free;
    const planMin = PLAN_MIN_SCENES[role] ?? PLAN_MIN_SCENES.free;

    // ─── Dynamic model routing + validation config ─────────────────────────────
    const [routing, validationCfg] = await Promise.all([
      resolveModelForUser(base44, user),
      loadValidationConfig(base44),
    ]);
    const model = routing.model;
    const qualityLabel = routing.quality_label;
    const MAX_RETRIES = validationCfg.max_retries ?? 2;

    // ─── Extract scene count from prompt, enforce plan cap ─────────────────────
    const sceneMatch = prompt.match(/Total Scenes: (\d+)/);
    let totalScenes = sceneMatch ? parseInt(sceneMatch[1]) : planMin;

    if (totalScenes > planMax) {
      console.warn(`[BlueprintEngine] Requested ${totalScenes} scenes exceeds plan limit (${planMax}) for role "${role}". Clamping.`);
      totalScenes = planMax;
    }
    if (totalScenes < planMin) totalScenes = planMin;

    const planLabel = { free: 'Free', starter: 'Starter', premium: 'Creator Pro', elite: 'Studio Elite', admin: 'Admin' }[role] || role;
    const sceneList = Array.from({ length: totalScenes }, (_, i) => `Scene ${i + 1}`).join(', ');

    console.log(`[BlueprintEngine] Plan: ${planLabel} | Scenes: ${totalScenes}/${planMax} | Model: ${model} | Quality: ${qualityLabel} | FreeTrial: ${routing.is_free_trial} | Fallback: ${routing.is_fallback}`);

    const systemPrompt = `You are a professional AI content production assistant for StudioOne AI.

═══════════════════════════════════════════
BLUEPRINT ENGINE — HARD RULES (LOCKED)
═══════════════════════════════════════════

PLAN TIER: ${planLabel}
SCENE COUNT: You MUST generate exactly ${totalScenes} scenes. No more, no fewer.
PLAN SCENE LIMIT: ${planMax} scenes maximum for this plan tier.

COMPLETENESS RULES — VIOLATIONS CAUSE REGENERATION:
✔ Write EVERY scene individually: ${sceneList}
✔ Every scene must have ALL required sub-fields fully written
✔ ALL 5 sections must be complete: A. Story, B. Visual Prompts, C. Sound/Music, D. YouTube Package, E. Thumbnail

ABSOLUTELY FORBIDDEN (will trigger rejection and retry):
✗ "continue"
✗ "remaining scenes"
✗ "same as above"
✗ "etc." or "..."
✗ "[similar structure]"
✗ "[repeat for remaining scenes]"
✗ "Scene X to Scene Y" (grouping)
✗ Skipping any scene number
✗ Grouped scenes
✗ Incomplete sections

FAILURE RULE: If ANY section is incomplete, ANY scene is missing, or ANY forbidden phrase appears → the section will be retried automatically.

═══════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════

You MUST respond with a valid JSON object containing exactly these fields:

- master_prompt: string — Full story/concept (NOT scene-by-scene)

- visual_prompt: string — ALL ${totalScenes} scenes written individually.
  Scene 1 through Scene ${totalScenes}, every scene fully detailed with:
  Environment, Characters (FULL description — repeat exactly every scene), Action,
  Camera Angle, Camera Movement, Lighting, Mood, Scene Motion, Visual Style, Transition.
  NO placeholders. NO grouping.

- sound_prompt: string — ALL ${totalScenes} scenes written individually.
  Per scene: narration text, background music style, sound effects, timing note.
  NO placeholders. NO grouping.

- narration_guide: string — Scene-by-scene narration delivery guide for ALL ${totalScenes} scenes.
  Each scene: pacing, tone, emphasis notes.
  NO placeholders.

- youtube_package: object with ALL of these fields:
  - title_primary: string (primary title)
  - title_secondary: string (alternate title)
  - description_primary: string (3–4 lines ONLY, hook-based, NO long paragraphs)
  - description_secondary: string (3–4 lines ONLY, hook-based, NO long paragraphs)
  - tags: string (comma-separated, 10–20 tags)
  - thumbnail_hook_primary: string (max 6 words)
  - thumbnail_hook_secondary: string (max 6 words)

SCENE CHECKLIST: ${sceneList} — ALL must appear individually written in visual_prompt, sound_prompt, and narration_guide.`;

    // ─── Helper: call OpenAI once ─────────────────────────────────────────────
    async function callOpenAI(mdl, sysPrompt, userPrompt, maxTok) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: mdl,
          messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
          response_format: { type: 'json_object' },
          max_tokens: maxTok ?? 16000,
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('No content returned from OpenAI');
      return JSON.parse(content);
    }

    // ─── Smart retry engine ────────────────────────────────────────────────────
    // Try full generation. If validation fails, retry failed sections individually.
    let finalModel = model;
    let usedFallback = routing.is_fallback;
    let parsed = null;
    let lastErrors = [];
    const retryLog = [];

    // Attempt 1 + up to MAX_RETRIES for the full generation
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const useModel = attempt < 2 ? model : 'gpt-4o-mini'; // downgrade on 3rd try
        if (attempt > 0 && useModel !== model) { finalModel = useModel; usedFallback = true; }
        console.log(`[BlueprintEngine] Full generation attempt ${attempt + 1}/${MAX_RETRIES + 1} | model: ${useModel}`);
        parsed = await callOpenAI(useModel, systemPrompt, prompt, routing.max_tokens ?? 16000);

        lastErrors = validateOutput(parsed, totalScenes, validationCfg);
        retryLog.push({ attempt: attempt + 1, model: useModel, errors: lastErrors.length, status: lastErrors.length === 0 ? 'pass' : 'fail' });

        if (lastErrors.length === 0) break; // ✅ passed

        console.warn(`[BlueprintEngine] Attempt ${attempt + 1} failed validation (${lastErrors.length} errors). Errors:`, lastErrors.slice(0, 5));

        if (attempt < MAX_RETRIES) {
          // ─── Section-level retries: only re-request failing sections ──────
          const failedSections = [];
          if (lastErrors.some(e => e.includes('Story')))   failedSections.push('master_prompt');
          if (lastErrors.some(e => e.includes('Visual') || e.includes('visual'))) failedSections.push('visual_prompt');
          if (lastErrors.some(e => e.includes('Sound') || e.includes('sound')))  failedSections.push('sound_prompt');
          if (lastErrors.some(e => e.includes('YouTube') || e.includes('thumbnail'))) failedSections.push('youtube_package');

          for (const sec of failedSections) {
            const sectionNames = {
              master_prompt: 'A. STORY / CONCEPT',
              visual_prompt: `B. VISUAL PROMPTS — ALL ${totalScenes} SCENES individually — NO skipping, NO grouping`,
              sound_prompt:  `C. SOUND / MUSIC — ALL ${totalScenes} SCENES individually — NO skipping, NO grouping`,
              youtube_package: 'D. YOUTUBE PACKAGE + E. THUMBNAIL',
            };
            const sectionRetryPrompt = `CRITICAL RETRY — Section "${sectionNames[sec]}" failed validation.
Re-generate ONLY this section for the same project.
Original project prompt summary: ${prompt.slice(0, 500)}
Total scenes: ${totalScenes}
Return a JSON object with only the key: "${sec}".
ALL scene numbers must be present. NO forbidden phrases. NO placeholders. NO grouping.`;

            try {
              console.log(`[BlueprintEngine] Retrying section: ${sec}`);
              const sectionResult = await callOpenAI(finalModel, systemPrompt, sectionRetryPrompt, routing.max_tokens ?? 16000);
              if (sectionResult[sec]) {
                parsed[sec] = sectionResult[sec];
                console.log(`[BlueprintEngine] Section ${sec} retry successful`);
                retryLog.push({ attempt: `${attempt + 1}_section_${sec}`, model: finalModel, errors: 0, status: 'section_retry_pass' });
              }
            } catch (e) {
              console.warn(`[BlueprintEngine] Section retry failed for ${sec}:`, e.message);
              retryLog.push({ attempt: `${attempt + 1}_section_${sec}`, model: finalModel, errors: 1, status: 'section_retry_fail' });
            }
          }

          // Re-validate after section fixes
          lastErrors = validateOutput(parsed, totalScenes, validationCfg);
          if (lastErrors.length === 0) {
            retryLog.push({ attempt: `${attempt + 1}_after_section_fix`, model: finalModel, errors: 0, status: 'pass' });
            break;
          }
        }

      } catch (e) {
        console.error(`[BlueprintEngine] Attempt ${attempt + 1} threw:`, e.message);
        retryLog.push({ attempt: attempt + 1, model, errors: -1, status: 'exception', error: e.message });
        if (attempt === MAX_RETRIES) {
          return Response.json({ error: 'Generation failed after all retries. Please try again.' }, { status: 502 });
        }
      }
    }

    if (!parsed) {
      return Response.json({ error: 'Generation produced no output. Please try again.' }, { status: 502 });
    }

    // ─── Final validation check ────────────────────────────────────────────────
    const finalErrors = validateOutput(parsed, totalScenes, validationCfg);
    if (finalErrors.length > 0) {
      console.warn(`[BlueprintEngine] Final validation failed after retries:`, finalErrors);
      // Return partial-safe result with warning
      const cleaned = cleanOutput(parsed);
      return Response.json({
        ...cleaned,
        _scene_count: totalScenes,
        _plan: planLabel,
        _quality_label: qualityLabel,
        _model_used: finalModel,
        _used_fallback: usedFallback,
        _is_free_trial: routing.is_free_trial,
        _partial_warning: `Some sections could not be fully completed after ${MAX_RETRIES} retries. You may retry this generation.`,
        _retry_log: retryLog,
        _validation_errors: finalErrors,
      });
    }

    // ─── Clean and return ──────────────────────────────────────────────────────
    const cleaned = cleanOutput(parsed);
    console.log(`[BlueprintEngine] ✅ Success — ${totalScenes} scenes | plan: ${planLabel} | model: ${finalModel} | quality: ${qualityLabel} | retries: ${retryLog.length}`);
    return Response.json({
      ...cleaned,
      _scene_count: totalScenes,
      _plan: planLabel,
      _quality_label: qualityLabel,
      _model_used: finalModel,
      _used_fallback: usedFallback,
      _is_free_trial: routing.is_free_trial,
      _retry_log: retryLog,
    });

  } catch (error) {
    console.error('[BlueprintEngine] Fatal error:', error);
    return Response.json({ error: 'Generation failed. Please try again.' }, { status: 500 });
  }
});