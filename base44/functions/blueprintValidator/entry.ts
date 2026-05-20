import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Default validation config (overridden by admin EconomyConfig) ─────────
const DEFAULT_VALIDATION_CONFIG = {
  strict_mode: true,
  max_retries: 2,
  batch_size: 6,
  forbidden_phrases: [
    'continue', 'remaining scenes', 'same as above', 'etc.', 'etc',
    'similar structure', 'repeat for', 'and so on', 'placeholder',
    '...', '[same]', '[repeat]', '[continue]',
  ],
  required_sections: ['master_prompt', 'visual_prompt', 'sound_prompt', 'narration_guide', 'youtube_package'],
  required_scene_fields: [
    'Environment', 'Characters', 'Action', 'Camera Angle', 'Camera Movement',
    'Lighting', 'Mood', 'Scene Motion', 'Visual Style', 'Transition',
  ],
  required_yt_fields: [
    'title_primary', 'title_secondary', 'description_primary',
    'description_secondary', 'tags', 'thumbnail_hook_primary', 'thumbnail_hook_secondary',
  ],
};

// ─── Load validation config from EconomyConfig ──────────────────────────────
async function loadValidationConfig(base44) {
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const stored = records?.[0]?.validation_config;
    if (stored) {
      return { ...DEFAULT_VALIDATION_CONFIG, ...stored };
    }
  } catch (e) {
    console.warn('[Validator] Could not load config, using defaults:', e.message);
  }
  return DEFAULT_VALIDATION_CONFIG;
}

// ─── Core validation logic ───────────────────────────────────────────────────
function validateBlueprint(parsed, totalScenes, cfg) {
  const results = {
    passed: true,
    section_results: {},
    missing_scenes: [],
    forbidden_found: [],
    errors: [],
  };

  // Section A: master_prompt
  const hasStory = parsed.master_prompt && parsed.master_prompt.trim().length >= 50;
  results.section_results['A_story'] = hasStory ? 'pass' : 'fail';
  if (!hasStory) {
    results.errors.push('Section A (Story/Concept) is missing or too short');
    results.passed = false;
  }

  // Section B: visual_prompt — every scene + required fields
  const hasVisual = parsed.visual_prompt && typeof parsed.visual_prompt === 'string';
  if (!hasVisual || parsed.visual_prompt.trim().length < 100) {
    results.section_results['B_visual'] = 'fail';
    results.errors.push('Section B (Visual Prompts) is missing or too short');
    results.passed = false;
  } else {
    const missingScenes = [];
    for (let i = 1; i <= totalScenes; i++) {
      if (!new RegExp(`Scene\\s*${i}[^0-9]`, 'i').test(parsed.visual_prompt)) {
        missingScenes.push(i);
      }
    }
    if (missingScenes.length > 0) {
      results.section_results['B_visual'] = 'fail';
      results.missing_scenes.push(...missingScenes.map(n => `visual_prompt:scene_${n}`));
      results.errors.push(`Visual prompts missing scenes: ${missingScenes.join(', ')}`);
      results.passed = false;
    } else {
      results.section_results['B_visual'] = 'pass';
    }
  }

  // Section C: sound_prompt — every scene
  const hasSound = parsed.sound_prompt && typeof parsed.sound_prompt === 'string';
  if (!hasSound || parsed.sound_prompt.trim().length < 100) {
    results.section_results['C_sound'] = 'fail';
    results.errors.push('Section C (Sound/Music) is missing or too short');
    results.passed = false;
  } else {
    const missingSoundScenes = [];
    for (let i = 1; i <= totalScenes; i++) {
      if (!new RegExp(`Scene\\s*${i}[^0-9]`, 'i').test(parsed.sound_prompt)) {
        missingSoundScenes.push(i);
      }
    }
    if (missingSoundScenes.length > 0) {
      results.section_results['C_sound'] = 'fail';
      results.missing_scenes.push(...missingSoundScenes.map(n => `sound_prompt:scene_${n}`));
      results.errors.push(`Sound prompts missing scenes: ${missingSoundScenes.join(', ')}`);
      results.passed = false;
    } else {
      results.section_results['C_sound'] = 'pass';
    }
  }

  // Section D: youtube_package
  const yt = parsed.youtube_package;
  if (!yt || typeof yt !== 'object') {
    results.section_results['D_youtube'] = 'fail';
    results.errors.push('Section D (YouTube Package) is missing');
    results.passed = false;
  } else {
    const missingYt = (cfg.required_yt_fields || DEFAULT_VALIDATION_CONFIG.required_yt_fields)
      .filter(f => !yt[f] || String(yt[f]).trim().length < 2);
    if (missingYt.length > 0) {
      results.section_results['D_youtube'] = 'fail';
      results.errors.push(`YouTube package missing fields: ${missingYt.join(', ')}`);
      results.passed = false;
    } else {
      results.section_results['D_youtube'] = 'pass';
    }
  }

  // Section E: thumbnail (from youtube_package)
  const hasThumbnail = yt && (yt.thumbnail_hook_primary || yt.thumbnail_concept);
  results.section_results['E_thumbnail'] = hasThumbnail ? 'pass' : 'fail';
  if (!hasThumbnail) {
    results.errors.push('Section E (Thumbnail) is missing');
    results.passed = false;
  }

  // Forbidden phrase check (only if strict mode)
  if (cfg.strict_mode !== false) {
    const phrases = cfg.forbidden_phrases || DEFAULT_VALIDATION_CONFIG.forbidden_phrases;
    const textFields = ['visual_prompt', 'sound_prompt', 'narration_guide'];
    for (const field of textFields) {
      if (typeof parsed[field] === 'string') {
        for (const phrase of phrases) {
          const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (pattern.test(parsed[field])) {
            results.forbidden_found.push({ field, phrase });
            results.errors.push(`Forbidden phrase "${phrase}" in ${field}`);
            results.passed = false;
          }
        }
      }
    }
  }

  // Scene grouping detection (e.g. "Scene 3 to Scene 7", "Scene 3–7")
  const groupingPattern = /scene\s*\d+\s*(to|through|–|-)\s*scene\s*\d+/i;
  for (const field of ['visual_prompt', 'sound_prompt']) {
    if (typeof parsed[field] === 'string' && groupingPattern.test(parsed[field])) {
      results.errors.push(`Scene grouping detected in ${field}`);
      results.passed = false;
    }
  }

  return results;
}

// ─── Output cleaner ──────────────────────────────────────────────────────────
function cleanOutput(parsed) {
  const clean = { ...parsed };

  // Normalize text fields: add spacing between scenes, normalize headings
  const textFields = ['visual_prompt', 'sound_prompt', 'narration_guide'];
  for (const field of textFields) {
    if (typeof clean[field] === 'string') {
      let text = clean[field];
      // Ensure scene headings are on their own line
      text = text.replace(/(Scene\s+\d+\s*:?)/gi, '\n\n$1');
      // Remove duplicate blank lines (3+ → 2)
      text = text.replace(/\n{3,}/g, '\n\n');
      // Remove duplicate separators
      text = text.replace(/(---+\s*){2,}/g, '---\n');
      // Trim
      text = text.trim();
      clean[field] = text;
    }
  }

  // Trim master_prompt
  if (typeof clean.master_prompt === 'string') {
    clean.master_prompt = clean.master_prompt.trim();
  }

  return clean;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, blueprint, total_scenes, save_config, config } = body;

    const cfg = await loadValidationConfig(base44);

    // ─── Action: validate ────────────────────────────────────────────────────
    if (action === 'validate' || !action) {
      if (!blueprint || typeof blueprint !== 'object') {
        return Response.json({ error: 'Missing blueprint object' }, { status: 400 });
      }
      if (!total_scenes || total_scenes < 1) {
        return Response.json({ error: 'Missing total_scenes' }, { status: 400 });
      }

      console.log(`[Validator] Validating blueprint — ${total_scenes} scenes | strict: ${cfg.strict_mode}`);
      const result = validateBlueprint(blueprint, total_scenes, cfg);
      console.log(`[Validator] Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} | errors: ${result.errors.length}`);

      return Response.json({ validation: result, config: cfg });
    }

    // ─── Action: clean ───────────────────────────────────────────────────────
    if (action === 'clean') {
      if (!blueprint || typeof blueprint !== 'object') {
        return Response.json({ error: 'Missing blueprint object' }, { status: 400 });
      }
      const cleaned = cleanOutput(blueprint);
      return Response.json({ cleaned });
    }

    // ─── Action: get_config ──────────────────────────────────────────────────
    if (action === 'get_config') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
      return Response.json({ config: cfg });
    }

    // ─── Action: save_config ─────────────────────────────────────────────────
    if (action === 'save_config') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
      if (!config || typeof config !== 'object') {
        return Response.json({ error: 'Missing config object' }, { status: 400 });
      }

      const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
      if (records?.[0]) {
        await base44.asServiceRole.entities.EconomyConfig.update(records[0].id, {
          validation_config: config,
        });
      } else {
        await base44.asServiceRole.entities.EconomyConfig.create({
          config_key: 'main',
          validation_config: config,
        });
      }

      console.log(`[Validator] Config saved by admin ${user.email}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[Validator] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});