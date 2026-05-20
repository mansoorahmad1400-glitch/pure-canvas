import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Image provider ───────────────────────────────────────────────────────────
function getActiveProvider() {
  const providers = [
    { key: 'REPLICATE_API_TOKEN', id: 'replicate_flux' },
    { key: 'OPENAI_API_KEY',      id: 'openai' },
  ];
  for (const p of providers) {
    try { if ((Deno.env.get(p.key) || '').length > 5) return p.id; } catch {}
  }
  return null;
}

// ─── Default costs ────────────────────────────────────────────────────────────
const DEFAULT_COSTS = {
  character_ref_generate:   0,
  character_ref_regenerate: 0,
};

async function loadCosts(base44) {
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const overrides = records?.[0]?.action_costs || {};
    return { ...DEFAULT_COSTS, ...Object.fromEntries(Object.keys(DEFAULT_COSTS).map(k => [k, overrides[k] ?? DEFAULT_COSTS[k]])) };
  } catch {
    return { ...DEFAULT_COSTS };
  }
}

// ─── Plan access ──────────────────────────────────────────────────────────────
function getPlanAccess(role) {
  const r = (role || 'free').toLowerCase();
  return {
    canGenerate: r !== 'free',
    isAdmin: r === 'admin',
  };
}

// ─── Build character portrait prompt (Disney style, small thumbnail) ────────
function buildCharacterPrompt(character, project) {
  const dna = character.dna || {};

  const parts = [];

  // Core identity from DNA
  if (dna.gender) parts.push(dna.gender);
  if (dna.age_range) parts.push(dna.age_range);
  if (dna.ethnicity) parts.push(dna.ethnicity);
  if (dna.body_type) parts.push(dna.body_type);
  if (dna.facial_structure) parts.push(`with ${dna.facial_structure} features`);
  if (dna.hairstyle) parts.push(`${dna.hairstyle} hair`);
  if (dna.beard_makeup) parts.push(dna.beard_makeup);
  if (dna.clothing_style) parts.push(`wearing ${dna.clothing_style}`);
  if (dna.color_palette) parts.push(`color palette: ${dna.color_palette}`);
  if (dna.accessories) parts.push(dna.accessories);

  // Fallback to description if DNA sparse
  const coreDesc = parts.length >= 3
    ? parts.join(', ')
    : (character.description_full || character.description_short || character.name);

  const tone = dna.personality_vibe ? `, ${dna.personality_vibe} expression` : '';

  // Disney-style small portrait
  const prompt = [
    `Disney character portrait: ${character.name}, ${coreDesc}${tone}`,
    `Disney animation style, warm colors, expressive face, character design`,
    `Studio Ghibli inspired, vibrant, family-friendly, round shapes`,
    `small icon portrait, cute and appealing, bright cheerful colors`,
    `clean polished 3D animation style, centered face`,
  ].filter(Boolean).join(', ');

  console.log(`[CharacterRef] Disney prompt for "${character.name}": ${prompt.slice(0, 200)}`);
  return prompt;
}

// ─── Replicate call ───────────────────────────────────────────────────────────
async function callReplicate(apiToken, prompt) {
  const resp = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
      'Prefer': 'wait=60',
    },
    body: JSON.stringify({
      input: {
        prompt: prompt.slice(0, 2000),
        aspect_ratio: '1:1',
        num_inference_steps: 4,
        output_format: 'webp',
        output_quality: 85,
      },
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.detail || `Replicate error: ${resp.status}`);
  }
  const data = await resp.json();
  if (data.status === 'succeeded' && data.output) {
    return Array.isArray(data.output) ? data.output[0] : data.output;
  }
  if (data.id && (data.status === 'starting' || data.status === 'processing')) {
    return await pollReplicate(apiToken, data.id);
  }
  throw new Error(`Replicate status: ${data.status}`);
}

async function pollReplicate(apiToken, id, max = 30) {
  for (let i = 0; i < max; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const resp = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const data = await resp.json();
    if (data.status === 'succeeded' && data.output) return Array.isArray(data.output) ? data.output[0] : data.output;
    if (data.status === 'failed') throw new Error(data.error || 'Replicate failed');
  }
  throw new Error('Replicate polling timeout');
}

// ─── OpenAI image call ────────────────────────────────────────────────────────
async function callOpenAI(apiKey, prompt) {
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'dall-e-3', prompt: prompt.slice(0, 4000), n: 1, size: '1024x1024', quality: 'standard', response_format: 'url' }),
  });
  if (!resp.ok) throw new Error(`OpenAI image error: ${resp.status}`);
  const data = await resp.json();
  return data?.data?.[0]?.url || null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, project_id, character_id } = body;

    const access = getPlanAccess(user.role);
    const costs = await loadCosts(base44);

    // ── generate ─────────────────────────────────────────────────────────────
    if (action === 'generate') {
      if (!project_id || !character_id) return Response.json({ error: 'Missing project_id or character_id' }, { status: 400 });
      if (!access.canGenerate && !access.isAdmin) return Response.json({ error: 'Character reference generation requires a paid plan.', plan_gate: true }, { status: 403 });

      const provider = getActiveProvider();
      if (!provider) return Response.json({ error: 'Image provider not configured.', provider_not_configured: true }, { status: 503 });

      // Load character + project
      const [chars, projects] = await Promise.all([
        base44.asServiceRole.entities.ProjectCharacter.filter({ id: character_id }),
        base44.asServiceRole.entities.Project.filter({ id: project_id }),
      ]);
      const character = chars?.[0];
      const project = projects?.[0];
      if (!character) return Response.json({ error: 'Character not found' }, { status: 404 });

      // Cost: regenerate if ref already exists
      const isRegen = !!character.reference_image_url;
      const gemCost = isRegen ? costs.character_ref_regenerate : costs.character_ref_generate;

      // Gem check
      const balance = user.gems_balance ?? 0;
      if (!access.isAdmin && balance < gemCost) {
        return Response.json({ error: `Not enough gems. Need ${gemCost} 💎, have ${balance}.`, insufficient_gems: true, balance, cost: gemCost }, { status: 402 });
      }

      // Deduct gems
      if (!access.isAdmin) {
        await base44.auth.updateMe({ gems_balance: balance - gemCost });
        await base44.asServiceRole.entities.GemTransaction.create({
          user_email: user.email, user_id: user.id, plan_name: user.role,
          action_key: isRegen ? 'character_ref_regenerate' : 'character_ref_generate',
          action_label: `Character ref: ${character.name}`,
          action_category: 'image',
          gems_deducted: gemCost, gems_refunded: 0,
          balance_before: balance, balance_after: balance - gemCost,
          status: 'pending', project_id,
        });
      }

      const prompt = buildCharacterPrompt(character, project);
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
        console.error('[CharacterRef] Provider error:', e.message);
      }

      if (imageUrl) {
        // Store on character record (pending approval)
        await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
          reference_image_url: imageUrl,
          consistency_status: 'reference_uploaded',
          lock_type: 'image',
        });
        if (!access.isAdmin) {
          await base44.asServiceRole.entities.GemTransaction.filter({ project_id, user_email: user.email })
            .then(txns => {
              const last = txns?.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))?.[0];
              if (last?.id) base44.asServiceRole.entities.GemTransaction.update(last.id, { status: 'success' });
            }).catch(() => {});
        }
        console.log(`[CharacterRef] Generated ref for "${character.name}": ${imageUrl.slice(0, 80)}`);
        return Response.json({ success: true, image_url: imageUrl, gems_deducted: access.isAdmin ? 0 : gemCost });
      } else {
        // Refund on failure
        if (!access.isAdmin) await base44.auth.updateMe({ gems_balance: balance });
        return Response.json({ error: genError || 'Generation failed.', provider_error: true }, { status: 500 });
      }
    }

    // ── approve ───────────────────────────────────────────────────────────────
    if (action === 'approve') {
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });
      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        consistency_status: 'image_locked',
        lock_type: 'image',
      });
      return Response.json({ success: true, consistency_status: 'image_locked' });
    }

    // ── unapprove ─────────────────────────────────────────────────────────────
    if (action === 'unapprove') {
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });
      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        consistency_status: 'reference_uploaded',
        lock_type: 'image',
      });
      return Response.json({ success: true });
    }

    // ── get_status (for checklist) ────────────────────────────────────────────
    if (action === 'get_status') {
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const chars = await base44.asServiceRole.entities.ProjectCharacter.filter({ project_id });
      const mainRoles = ['protagonist', 'antagonist'];
      const mainChars = chars.filter(c => mainRoles.includes(c.role));
      const hasAnyChars = chars.length > 0;
      const hasRefs = mainChars.some(c => !!c.reference_image_url);
      const approvedMain = mainChars.filter(c => c.consistency_status === 'image_locked');
      const allMainApproved = mainChars.length > 0 && approvedMain.length === mainChars.length;
      const provider = getActiveProvider();
      return Response.json({
        success: true,
        access,
        costs,
        provider_configured: !!provider,
        stats: {
          total: chars.length,
          main: mainChars.length,
          with_refs: chars.filter(c => !!c.reference_image_url).length,
          approved: approvedMain.length,
          all_main_approved: allMainApproved,
          has_any_chars: hasAnyChars,
          has_refs: hasRefs,
        },
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[CharacterRef] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});