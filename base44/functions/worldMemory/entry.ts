import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Image provider ───────────────────────────────────────────────────────────
function getActiveProvider() {
  const providers = [
    { key: 'REPLICATE_API_TOKEN', id: 'replicate_flux' },
    { key: 'OPENAI_API_KEY', id: 'openai' },
  ];
  for (const p of providers) {
    try { if ((Deno.env.get(p.key) || '').length > 5) return p.id; } catch {}
  }
  return null;
}

async function callReplicate(apiToken, prompt) {
  const resp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiToken}`, 'Prefer': 'wait=60' },
    body: JSON.stringify({ input: { prompt: prompt.slice(0, 2000), aspect_ratio: '16:9', num_inference_steps: 4, output_format: 'webp', output_quality: 85 } }),
  });
  if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e?.detail || `Replicate error: ${resp.status}`); }
  const data = await resp.json();
  if (data.status === 'succeeded' && data.output) return Array.isArray(data.output) ? data.output[0] : data.output;
  if (data.id && (data.status === 'starting' || data.status === 'processing')) {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const r2 = await fetch(`https://api.replicate.com/v1/predictions/${data.id}`, { headers: { Authorization: `Bearer ${apiToken}` } });
      const d2 = await r2.json();
      if (d2.status === 'succeeded' && d2.output) return Array.isArray(d2.output) ? d2.output[0] : d2.output;
      if (d2.status === 'failed') throw new Error(d2.error || 'Replicate failed');
    }
    throw new Error('Replicate polling timeout');
  }
  throw new Error(`Replicate status: ${data.status}`);
}

async function callOpenAI(apiKey, prompt) {
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'dall-e-3', prompt: prompt.slice(0, 4000), n: 1, size: '1792x1024', quality: 'standard', response_format: 'url' }),
  });
  if (!resp.ok) throw new Error(`OpenAI image error: ${resp.status}`);
  const data = await resp.json();
  return data?.data?.[0]?.url || null;
}

function buildLocationRefPrompt(location) {
  const dna = location.dna || {};
  const parts = [
    dna.architectural_style,
    dna.color_palette,
    dna.lighting_profile,
    dna.atmosphere,
  ].filter(Boolean).join(', ');

  const desc = parts || location.description || location.canonical_name;
  return [
    `Cinematic environment concept art: ${location.canonical_name}`,
    desc,
    dna.time_of_day ? `time of day: ${dna.time_of_day}` : '',
    dna.weather ? `weather: ${dna.weather}` : '',
    dna.materials ? `materials: ${dna.materials}` : '',
    dna.props ? `props: ${dna.props}` : '',
    'wide establishing shot, epic scale, detailed environment, consistent world design',
    'high quality concept art, cinematic lighting, painterly style, production design',
  ].filter(Boolean).join(', ');
}

// ─── Location type classifier ──────────────────────────────────────────────────
function classifyLocationType(name, description) {
  const combined = `${name} ${description}`.toLowerCase();
  if (/room|hall|chamber|interior|palace interior|inn|tavern|cave interior|throne|bedroom|kitchen|cellar/.test(combined)) return 'interior';
  if (/city|town|village|kingdom|capital|market|street|square|district/.test(combined)) return 'city';
  if (/forest|jungle|desert|ocean|sea|mountain|valley|plains|swamp|river|lake|cliff/.test(combined)) return 'nature';
  if (/ship|boat|carriage|train|airship|vehicle/.test(combined)) return 'vehicle';
  if (/magic|realm|dimension|portal|mystical|enchanted|spirit|void/.test(combined)) return 'fantasy';
  return 'exterior';
}

// ─── Plan access ───────────────────────────────────────────────────────────────
function getPlanAccess(role) {
  const r = (role || 'free').toLowerCase();
  return {
    canView: true,
    canEdit: r !== 'free',
    canLock: r === 'starter' || r === 'premium' || r === 'elite' || r === 'admin',
    canUploadReference: r === 'premium' || r === 'elite' || r === 'admin',
    isAdmin: r === 'admin',
  };
}

// ─── AI: extract locations from blueprint ─────────────────────────────────────
async function extractLocationsWithAI(base44, masterPrompt, visualPrompt) {
  const allText = [masterPrompt || '', visualPrompt || ''].join('\n\n').slice(0, 6000);

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a world-building extraction engine for a story blueprint.

TASK: Extract ALL recurring locations, environments, and settings that appear in multiple scenes. Focus on places that have a consistent visual identity that must be maintained across scenes.

INCLUDE:
- Named kingdoms, cities, towns, villages
- Named buildings: palaces, castles, temples, inns, markets
- Natural environments: specific forests, deserts, mountains, oceans
- Interior spaces: throne rooms, dungeons, bedrooms, caves
- Fantastical places: magic realms, enchanted forests, spirit worlds
- Vehicles used as recurring settings: ships, carriages

DO NOT INCLUDE:
- Generic unnamed backgrounds (e.g. "a forest" with no identity)
- Abstract concepts or emotions
- Characters or objects
- One-time transitional locations

For each location, extract a "dna" object:
- architectural_style: style of buildings/structures (e.g. "Islamic golden age architecture")
- color_palette: dominant colors (e.g. "warm gold, deep blue, rich crimson")
- lighting_profile: how this place is typically lit (e.g. "warm torchlight, soft golden hour")
- atmosphere: mood and feel (e.g. "grand, opulent, busy")
- time_of_day: typical time (e.g. "midday", "night", "golden hour")
- weather: typical weather (e.g. "hot desert sun", "misty", "stormy")
- materials: dominant materials (e.g. "marble, gold, silk")
- props: recurring props/objects (e.g. "market stalls, spice jars, carpets")
- camera_style: cinematic approach (e.g. "wide establishing shots, low angle")
- color_grading: post-processing style (e.g. "warm desaturated, high contrast")
- emotional_tone: emotional quality (e.g. "majestic and overwhelming")
- consistency_prompt: compact single-line prompt for injection: "[location name]: [architectural style, lighting, colors, atmosphere]"

Blueprint:
${allText}`,
    response_json_schema: {
      type: 'object',
      properties: {
        locations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              canonical_name: { type: 'string' },
              aliases: { type: 'array', items: { type: 'string' } },
              description: { type: 'string' },
              scenes: { type: 'array', items: { type: 'number' } },
              dna: {
                type: 'object',
                properties: {
                  architectural_style: { type: 'string' },
                  color_palette: { type: 'string' },
                  lighting_profile: { type: 'string' },
                  atmosphere: { type: 'string' },
                  time_of_day: { type: 'string' },
                  weather: { type: 'string' },
                  materials: { type: 'string' },
                  props: { type: 'string' },
                  camera_style: { type: 'string' },
                  color_grading: { type: 'string' },
                  emotional_tone: { type: 'string' },
                  consistency_prompt: { type: 'string' },
                },
              },
            },
            required: ['canonical_name', 'description', 'scenes'],
          },
        },
      },
      required: ['locations'],
    },
  });

  return result?.locations || [];
}

// ─── Score calculation ─────────────────────────────────────────────────────────
function calcConsistencyScore(dna, lockType, hasReference) {
  if (!dna) return 0;
  const keys = ['architectural_style','color_palette','lighting_profile','atmosphere','camera_style','color_grading'];
  const filled = keys.filter(k => dna[k]?.trim?.()).length;
  let score = Math.round((filled / keys.length) * 50);
  if (lockType === 'text') score += 20;
  if (hasReference) score += 15;
  if (lockType === 'image') score += 15;
  return Math.min(score, 100);
}

// ─── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, project_id } = body;
    const access = getPlanAccess(user.role);

    // ── extract_locations ────────────────────────────────────────────────────
    if (action === 'extract_locations') {
      const { master_prompt, visual_prompt, force_reinit = false } = body;
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });

      const existing = await base44.asServiceRole.entities.WorldLocation.filter({ project_id });

      if (existing.length > 0 && !force_reinit) {
        return Response.json({ success: true, locations: existing, extracted: false });
      }

      if (force_reinit && existing.length > 0) {
        for (const loc of existing) {
          await base44.asServiceRole.entities.WorldLocation.delete(loc.id);
        }
        console.log(`[WorldMemory] Purged ${existing.length} old locations`);
      }

      const extracted = await extractLocationsWithAI(base44, master_prompt, visual_prompt);
      if (extracted.length === 0) {
        return Response.json({ success: true, locations: [], extracted: false, message: 'No recurring locations detected.' });
      }

      const created = [];
      for (let i = 0; i < extracted.length; i++) {
        const loc = extracted[i];
        const dna = loc.dna || {};
        const score = calcConsistencyScore(dna, 'none', false);

        const record = await base44.asServiceRole.entities.WorldLocation.create({
          project_id,
          user_id: user.email,
          canonical_name: loc.canonical_name,
          aliases: loc.aliases || [],
          location_type: classifyLocationType(loc.canonical_name, loc.description),
          description: loc.description,
          scenes: loc.scenes || [],
          lock_type: 'none',
          dna,
          consistency_score: score,
          sort_order: i,
        });
        created.push(record);
      }

      console.log(`[WorldMemory] Extracted ${created.length} locations for project ${project_id}`);
      return Response.json({ success: true, locations: created, extracted: true, count: created.length });
    }

    // ── get_locations ────────────────────────────────────────────────────────
    if (action === 'get_locations') {
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const locations = await base44.asServiceRole.entities.WorldLocation.filter({ project_id });
      return Response.json({ success: true, locations, access });
    }

    // ── update_location ──────────────────────────────────────────────────────
    if (action === 'update_location') {
      const { location_id, updates } = body;
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });
      const allowed = ['canonical_name','aliases','description','scenes','location_type'];
      const safe = {};
      for (const k of allowed) { if (updates?.[k] !== undefined) safe[k] = updates[k]; }
      await base44.asServiceRole.entities.WorldLocation.update(location_id, safe);
      return Response.json({ success: true });
    }

    // ── update_dna ───────────────────────────────────────────────────────────
    if (action === 'update_dna') {
      const { location_id, dna } = body;
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });

      const locs = await base44.asServiceRole.entities.WorldLocation.filter({ id: location_id });
      const loc = locs?.[0];
      if (!loc) return Response.json({ error: 'Location not found' }, { status: 404 });

      const score = calcConsistencyScore(dna, loc.lock_type, !!loc.reference_image_url);
      await base44.asServiceRole.entities.WorldLocation.update(location_id, { dna: dna || {}, consistency_score: score });
      return Response.json({ success: true, consistency_score: score });
    }

    // ── generate_dna ─────────────────────────────────────────────────────────
    if (action === 'generate_dna') {
      const { location_id, canonical_name, description } = body;
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });
      const text = description || canonical_name || '';
      if (text.length < 5) return Response.json({ error: 'No description to generate DNA from.' }, { status: 400 });

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a cinematic world-building DNA engine. Analyze this location and extract structured visual identity fields for consistent image generation across multiple scenes.

Location name: ${canonical_name}
Description: ${text}

Extract each field concisely (1 phrase max). Leave blank string if not mentioned.

Return JSON with these exact fields:
architectural_style, color_palette, lighting_profile, atmosphere, time_of_day, weather, materials, props, camera_style, color_grading, emotional_tone

Also return "consistency_prompt": a compact single-line string for image prompt injection.
Format: "[location name]: [architectural style, key lighting, colors, atmosphere]"`,
        response_json_schema: {
          type: 'object',
          properties: {
            architectural_style: { type: 'string' }, color_palette: { type: 'string' },
            lighting_profile: { type: 'string' }, atmosphere: { type: 'string' },
            time_of_day: { type: 'string' }, weather: { type: 'string' },
            materials: { type: 'string' }, props: { type: 'string' },
            camera_style: { type: 'string' }, color_grading: { type: 'string' },
            emotional_tone: { type: 'string' }, consistency_prompt: { type: 'string' },
          },
        },
      });

      const dna = result || {};
      const locs = await base44.asServiceRole.entities.WorldLocation.filter({ id: location_id });
      const loc = locs?.[0];
      const score = calcConsistencyScore(dna, loc?.lock_type || 'none', !!loc?.reference_image_url);
      await base44.asServiceRole.entities.WorldLocation.update(location_id, { dna, consistency_score: score });
      console.log(`[WorldMemory] DNA generated for "${canonical_name}", score: ${score}`);
      return Response.json({ success: true, dna, consistency_score: score });
    }

    // ── text_lock ────────────────────────────────────────────────────────────
    if (action === 'text_lock') {
      const { location_id } = body;
      if (!access.canLock) return Response.json({ error: 'Location lock requires a paid plan.' }, { status: 403 });
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });
      const locs = await base44.asServiceRole.entities.WorldLocation.filter({ id: location_id });
      const loc = locs?.[0];
      const score = calcConsistencyScore(loc?.dna, 'text', !!loc?.reference_image_url);
      await base44.asServiceRole.entities.WorldLocation.update(location_id, { lock_type: 'text', consistency_score: score });
      return Response.json({ success: true, lock_type: 'text', consistency_score: score });
    }

    // ── unlock ───────────────────────────────────────────────────────────────
    if (action === 'unlock') {
      const { location_id } = body;
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });
      await base44.asServiceRole.entities.WorldLocation.update(location_id, { lock_type: 'none' });
      return Response.json({ success: true });
    }

    // ── upload_reference ─────────────────────────────────────────────────────
    if (action === 'upload_reference') {
      const { location_id, image_url } = body;
      if (!access.canUploadReference) return Response.json({ error: 'Reference upload requires Creator Pro or higher.' }, { status: 403 });
      if (!location_id || !image_url) return Response.json({ error: 'Missing location_id or image_url' }, { status: 400 });
      const locs = await base44.asServiceRole.entities.WorldLocation.filter({ id: location_id });
      const loc = locs?.[0];
      const score = calcConsistencyScore(loc?.dna, loc?.lock_type || 'text', true);
      await base44.asServiceRole.entities.WorldLocation.update(location_id, {
        reference_image_url: image_url,
        lock_type: 'image',
        consistency_score: score,
      });
      return Response.json({ success: true, consistency_score: score });
    }

    // ── generate_reference ───────────────────────────────────────────────────
    if (action === 'generate_reference') {
      const { location_id } = body;
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });

      const provider = getActiveProvider();
      if (!provider) return Response.json({ error: 'Image provider not configured.', provider_not_configured: true }, { status: 503 });

      const locs = await base44.asServiceRole.entities.WorldLocation.filter({ id: location_id });
      const loc = locs?.[0];
      if (!loc) return Response.json({ error: 'Location not found' }, { status: 404 });

      const prompt = buildLocationRefPrompt(loc);
      console.log(`[WorldMemory] Generating reference for "${loc.canonical_name}"`);

      let imageUrl = null;
      let genError = null;
      try {
        if (provider === 'replicate_flux') {
          const token = Deno.env.get('REPLICATE_API_TOKEN') || '';
          imageUrl = await callReplicate(token, prompt);
        } else if (provider === 'openai') {
          const key = Deno.env.get('OPENAI_API_KEY') || '';
          imageUrl = await callOpenAI(key, prompt);
        }
      } catch (e) {
        genError = e.message;
        console.error('[WorldMemory] Reference gen error:', e.message);
      }

      if (!imageUrl) {
        return Response.json({ error: genError || 'Generation failed.', provider_error: true }, { status: 500 });
      }

      const score = calcConsistencyScore(loc.dna, 'text', true);
      await base44.asServiceRole.entities.WorldLocation.update(location_id, {
        reference_image_url: imageUrl,
        lock_type: loc.lock_type === 'none' ? 'text' : loc.lock_type,
        consistency_score: score,
      });
      console.log(`[WorldMemory] Reference generated for "${loc.canonical_name}"`);
      return Response.json({ success: true, image_url: imageUrl, consistency_score: score });
    }

    // ── approve_reference ─────────────────────────────────────────────────────
    if (action === 'approve_reference') {
      const { location_id } = body;
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });
      const locs = await base44.asServiceRole.entities.WorldLocation.filter({ id: location_id });
      const loc = locs?.[0];
      const score = calcConsistencyScore(loc?.dna, 'image', true);
      await base44.asServiceRole.entities.WorldLocation.update(location_id, {
        lock_type: 'image',
        consistency_score: score,
      });
      return Response.json({ success: true, lock_type: 'image', consistency_score: score });
    }

    // ── get_world_status ──────────────────────────────────────────────────────
    if (action === 'get_world_status') {
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const locations = await base44.asServiceRole.entities.WorldLocation.filter({ project_id });
      const withRefs = locations.filter(l => !!l.reference_image_url);
      const approved = locations.filter(l => l.lock_type === 'image');
      return Response.json({
        success: true,
        stats: {
          total: locations.length,
          with_refs: withRefs.length,
          approved: approved.length,
          has_any: locations.length > 0,
          has_refs: withRefs.length > 0,
          all_approved: locations.length > 0 && approved.length === locations.length,
        },
        access,
      });
    }

    // ── delete_location ──────────────────────────────────────────────────────
    if (action === 'delete_location') {
      const { location_id } = body;
      if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });
      await base44.asServiceRole.entities.WorldLocation.delete(location_id);
      return Response.json({ success: true });
    }

    // ── get_injected_prompts ─────────────────────────────────────────────────
    // Returns visual_prompt with locked location DNA injected
    if (action === 'get_injected_prompts') {
      const { visual_prompt } = body;
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const locations = await base44.asServiceRole.entities.WorldLocation.filter({ project_id });
      const locked = locations.filter(l => l.lock_type === 'text' || l.lock_type === 'image');

      let result = visual_prompt || '';
      for (const loc of locked) {
        const injection = loc.dna?.consistency_prompt || loc.description;
        if (!injection) continue;
        const sceneNums = (loc.scenes || []).join('|');
        if (!sceneNums) continue;
        const pattern = new RegExp(`(Scene\\s+(?:${sceneNums})\\s*:?[^\\n]*)`, 'gi');
        result = result.replace(pattern, (match) => {
          if (!match.includes('[WORLD:')) {
            return match + ` [WORLD: ${injection}]`;
          }
          return match;
        });
      }
      return Response.json({ success: true, visual_prompt: result, locked_count: locked.length });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[WorldMemory] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});