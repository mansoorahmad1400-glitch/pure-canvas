import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Hard blocklist: names that are NEVER valid characters ────────────────────
const BLOCKED_NAMES = new Set([
  'prompt','character','characters','scene','scenes','visual','visuals',
  'story','narration','narrations','camera','transition','transitions',
  'lighting','light','environment','background','setting','location',
  'kingdom','city','town','village','castle','forest','desert','ocean',
  'mountain','sky','world','realm','place','area','land','region',
  'intro','outro','opening','closing','section','part','chapter',
  'sequence','note','notes','overview','summary','description',
  'style','mood','tone','color','colour','palette','effect','effects',
  'action','motion','movement','direction','shot','frame','clip',
  'music','sound','audio','voiceover','subtitle','caption','title',
  'agrabah','aladdin_cave','cave','market','marketplace','palace',
  'lamp','carpet','magic carpet','treasure','jewel','gem','gold',
]);

function isValidCharacterName(name) {
  if (!name || name.trim().length < 2) return false;
  const lower = name.trim().toLowerCase().replace(/[^a-z\s]/g, '').trim();
  if (BLOCKED_NAMES.has(lower)) return false;
  // Reject clear production labels (e.g. "Scene 1", "Prompt 2")
  if (/^(scene|prompt|visual|camera|shot|transition|lighting|narration|environment|background)\s*\d*$/i.test(name.trim())) return false;
  return true;
}

// ─── Canonical key: strip titles + normalize for dedup comparison ──────────────
const STRIP_TITLES = /^(princess|prince|king|queen|mr|mrs|ms|dr|lord|lady|sir|sultan|vizier|grand|master)\s+/gi;

function canonicalKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(STRIP_TITLES, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Prefer the richer / longer display name when merging
function preferredDisplayName(a, b) {
  // If one has a title prefix and the other doesn't, prefer the one WITH the title
  const aHasTitle = /^(princess|prince|king|queen|sultan|lord|lady|sir|vizier)\s/i.test(a);
  const bHasTitle = /^(princess|prince|king|queen|sultan|lord|lady|sir|vizier)\s/i.test(b);
  if (aHasTitle && !bHasTitle) return a;
  if (bHasTitle && !aHasTitle) return b;
  // Otherwise prefer longer name (more descriptive)
  return a.length >= b.length ? a : b;
}

// Role importance — higher index = more important
const ROLE_RANK = { background: 0, minor: 1, supporting: 2, narrator: 2, antagonist: 3, protagonist: 3 };

function higherRole(a, b) {
  return (ROLE_RANK[a] ?? 0) >= (ROLE_RANK[b] ?? 0) ? a : b;
}

// ─── Server-side deduplication + merge ────────────────────────────────────────
function deduplicateCharacters(chars) {
  const map = new Map(); // canonical key → merged character object

  for (const c of chars) {
    const key = canonicalKey(c.name);
    if (!map.has(key)) {
      map.set(key, {
        ...c,
        aliases: Array.isArray(c.aliases) ? [...c.aliases] : [],
      });
    } else {
      const existing = map.get(key);
      // Merge: prefer richer display name
      const betterName = preferredDisplayName(existing.name, c.name);
      if (betterName !== existing.name) {
        existing.aliases.push(existing.name);
        existing.name = betterName;
      } else if (c.name !== existing.name) {
        existing.aliases.push(c.name);
      }
      // Merge aliases
      for (const alias of (c.aliases || [])) {
        if (!existing.aliases.includes(alias) && alias !== existing.name) {
          existing.aliases.push(alias);
        }
      }
      // Merge scenes (unique sorted)
      const sceneSet = new Set([...(existing.scenes || []), ...(c.scenes || [])]);
      existing.scenes = [...sceneSet].sort((a, b) => a - b);
      // Keep higher role
      existing.role = higherRole(existing.role, c.role);
      // Keep richer description
      if (!existing.description_full || (c.description_full && c.description_full.length > existing.description_full.length)) {
        existing.description_full = c.description_full;
      }
      map.set(key, existing);
    }
  }

  // Re-assign sort_order after dedup
  return [...map.values()].map((c, idx) => ({ ...c, sort_order: idx }));
}

// ─── Extract living characters using AI ────────────────────────────────────────
async function extractCharactersWithAI(base44, masterPrompt, visualPrompt) {
  const allText = [masterPrompt || '', visualPrompt || ''].join('\n\n').slice(0, 6000);

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a character extraction engine for a story blueprint.

TASK: Extract ALL living characters — main characters, supporting characters, recurring background roles (vendors, guards, creatures, animals, crowd members who appear in multiple scenes).

ALIAS MERGING RULES:
- If the same character appears under different names/titles (e.g. "Jasmine" and "Princess Jasmine", "Aladdin" and "Prince Ali"), merge them into ONE entry.
- Use the most descriptive canonical name (prefer "Princess Jasmine" over "Jasmine").
- List all other names in the "aliases" array.

ROLE CLASSIFICATION:
- protagonist: central character, drives the story, appears in many scenes
- antagonist: villain or opposing force
- supporting: named or role-based characters who participate in scenes (merchants, guards, dancers, named animals)
- minor: briefly mentioned living beings
- background: extras/crowd who appear only as atmosphere but recur visually

INCLUDE living beings:
- Named human characters
- Animals (horses, monkeys, tigers, birds)
- Magical/fantastical creatures (genies, djinn, talking animals)
- Unnamed but recurring roles (palace guard, market vendor, street child) — use descriptive role name
- Non-human personified beings (a genie is a character, not an object)

DO NOT INCLUDE:
- Locations: cities, kingdoms, deserts, forests, castles, caves, markets, palaces
- Objects: lamps, carpets, treasure, jewels
- Production terms: camera, lighting, transition, shot, visual, prompt, scene, narration, background, environment
- Abstract concepts or section labels

For each character, also extract a "dna" object with these visual identity fields (leave blank string if not mentioned):
gender, age_range, ethnicity, facial_structure, hairstyle, beard_makeup, clothing_style, color_palette, body_type, accessories, personality_vibe, emotional_tone, style_category
Also include "consistency_prompt": a compact single-line prompt "[name]: [key visual traits]" for image generation injection.

Fields per character:
- name: canonical display name
- aliases: array of other names this character goes by (can be empty [])
- role: protagonist | antagonist | supporting | minor | background
- description_short: one-line visual description (max 100 chars)
- description_full: detailed visual appearance for image generation (age, features, clothing, etc.)
- scenes: array of scene numbers (integers) where this character physically appears
- dna: object with visual identity fields as described above

Blueprint:
${allText}`,
    response_json_schema: {
      type: 'object',
      properties: {
        characters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              aliases: { type: 'array', items: { type: 'string' } },
              role: { type: 'string', enum: ['protagonist', 'antagonist', 'supporting', 'minor', 'background'] },
              description_short: { type: 'string' },
              description_full: { type: 'string' },
              scenes: { type: 'array', items: { type: 'number' } },
              dna: {
                type: 'object',
                properties: {
                  gender: { type: 'string' }, age_range: { type: 'string' }, ethnicity: { type: 'string' },
                  facial_structure: { type: 'string' }, hairstyle: { type: 'string' }, beard_makeup: { type: 'string' },
                  clothing_style: { type: 'string' }, color_palette: { type: 'string' }, body_type: { type: 'string' },
                  accessories: { type: 'string' }, personality_vibe: { type: 'string' }, emotional_tone: { type: 'string' },
                  style_category: { type: 'string' }, consistency_prompt: { type: 'string' },
                },
              },
            },
            required: ['name', 'aliases', 'role', 'description_short', 'description_full', 'scenes'],
          },
        },
      },
      required: ['characters'],
    },
  });

  // Post-AI: validate names, deduplicate and merge aliases
  const raw = result?.characters || [];
  const valid = raw.filter(c => isValidCharacterName(c.name));
  const deduped = deduplicateCharacters(valid);
  console.log(`[CharacterHub] AI returned ${raw.length}, valid: ${valid.length}, after dedup: ${deduped.length}`);
  return deduped;
}

// ─── Gem cost loader ───────────────────────────────────────────────────────────
async function getActionCost(base44, action) {
  const defaults = { image_facelock: 2, image_lock_character: 2 };
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    const actionCosts = records?.[0]?.action_costs || {};
    return actionCosts[action] ?? defaults[action] ?? 2;
  } catch {
    return defaults[action] ?? 2;
  }
}

// ─── Plan access checks ────────────────────────────────────────────────────────
function getPlanAccess(userRole) {
  const role = (userRole || 'free').toLowerCase();
  return {
    canView: true,
    canRename: true,
    canTextLock: role === 'admin' || role === 'starter' || role === 'premium' || role === 'elite',
    canUploadReference: role === 'admin' || role === 'premium' || role === 'elite',
    canImageLock: role === 'admin' || role === 'elite',
    isAdmin: role === 'admin',
  };
}

// ─── Safe string replace in prompts ───────────────────────────────────────────
function replaceNameInText(text, oldName, newName) {
  if (!text || !oldName || !newName) return text;
  // Word-boundary safe replacement (case-insensitive for first match)
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`\\b${escaped}\\b`, 'g'), newName);
}

// ─── Inject character descriptions into visual prompts ─────────────────────────
function injectCharacterDescriptions(visualPrompt, characters) {
  if (!visualPrompt) return visualPrompt;
  let result = visualPrompt;
  for (const char of characters) {
    if ((char.lock_type === 'text' || char.lock_type === 'image')) {
      // Prefer DNA consistency_prompt, fallback to description_full
      const injectionText = char.dna?.consistency_prompt || char.description_full;
      if (!injectionText) continue;

      const sceneNums = (char.scenes || []).join('|');
      if (!sceneNums) continue;

      const scenePattern = new RegExp(
        `(Scene\\s+(?:${sceneNums})\\s*:?[^\\n]*)`,
        'gi'
      );
      result = result.replace(scenePattern, (match) => {
        if (match.toLowerCase().includes(char.name.toLowerCase()) && !match.includes('[CHARACTER:')) {
          return match + ` [CHARACTER: ${injectionText}]`;
        }
        return match;
      });
    }
  }
  return result;
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

    // ── action: extract_characters ──────────────────────────────────────────
    if (action === 'extract_characters') {
      const { master_prompt, visual_prompt, force_reinit = false } = body;
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });

      // Check existing
      const existing = await base44.asServiceRole.entities.ProjectCharacter.filter({ project_id });

      // Always return existing records if not force_reinit
      if (existing.length > 0 && !force_reinit) {
        return Response.json({ success: true, characters: existing, extracted: false });
      }

      // Delete ALL existing records BEFORE running extraction (force_reinit = clean slate)
      if (force_reinit && existing.length > 0) {
        for (const c of existing) {
          await base44.asServiceRole.entities.ProjectCharacter.delete(c.id);
        }
        console.log(`[CharacterHub] Purged ${existing.length} old records before re-extraction`);
      }

      // Extract using AI
      const extracted = await extractCharactersWithAI(base44, master_prompt, visual_prompt);
      if (extracted.length === 0) {
        return Response.json({ success: true, characters: [], extracted: false, message: 'No characters detected in blueprint.' });
      }

      // Create records
      const created = [];
      for (const c of extracted) {
        // Calculate initial consistency score from DNA completeness
        const dnaKeys = ['gender','age_range','ethnicity','facial_structure','hairstyle','clothing_style','color_palette'];
        const dna = c.dna || {};
        const filledCount = dnaKeys.filter(k => dna[k]?.trim()).length;
        const initialScore = Math.round((filledCount / dnaKeys.length) * 40) + (c.description_full?.length > 50 ? 10 : 0);

        const record = await base44.asServiceRole.entities.ProjectCharacter.create({
          project_id,
          user_id: user.email,
          name: c.name,
          original_name: c.name,
          role: c.role,
          description_short: c.description_short,
          description_full: c.description_full,
          scenes: c.scenes,
          lock_type: 'none',
          consistency_status: 'unlocked',
          gems_used: 0,
          sort_order: c.sort_order,
          location_hints: c.aliases || [],
          dna: dna,
          consistency_score: initialScore,
        });
        created.push(record);
      }

      console.log(`[CharacterHub] Extracted ${created.length} characters for project ${project_id}`);
      return Response.json({ success: true, characters: created, extracted: true, count: created.length });
    }

    // ── action: rename_character ────────────────────────────────────────────
    if (action === 'rename_character') {
      const { character_id, new_name } = body;
      if (!character_id || !new_name) return Response.json({ error: 'Missing character_id or new_name' }, { status: 400 });

      const chars = await base44.asServiceRole.entities.ProjectCharacter.filter({ id: character_id });
      const char = chars?.[0];
      if (!char) return Response.json({ error: 'Character not found' }, { status: 404 });
      if (char.user_id !== user.email && !access.isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const old_name = char.name;

      // Update character record
      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        name: new_name.trim(),
      });

      // Update references in project visual/sound prompts
      const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
      const project = projects?.[0];
      if (project) {
        const updates = {};
        if (project.visual_prompt) updates.visual_prompt = replaceNameInText(project.visual_prompt, old_name, new_name.trim());
        if (project.sound_prompt) updates.sound_prompt = replaceNameInText(project.sound_prompt, old_name, new_name.trim());
        if (project.master_prompt) updates.master_prompt = replaceNameInText(project.master_prompt, old_name, new_name.trim());
        if (project.narration_guide) updates.narration_guide = replaceNameInText(project.narration_guide, old_name, new_name.trim());
        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Project.update(project_id, updates);
        }
      }

      console.log(`[CharacterHub] Renamed "${old_name}" → "${new_name}" in project ${project_id}`);
      return Response.json({ success: true, old_name, new_name: new_name.trim() });
    }

    // ── action: text_lock ───────────────────────────────────────────────────
    if (action === 'text_lock') {
      const { character_id, description_full } = body;
      if (!access.canTextLock) return Response.json({ error: 'Text-lock requires a paid plan.' }, { status: 403 });
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });

      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        description_full: description_full || undefined,
        lock_type: 'text',
        consistency_status: 'text_locked',
      });

      console.log(`[CharacterHub] Text-locked character ${character_id}`);
      return Response.json({ success: true, lock_type: 'text', consistency_status: 'text_locked' });
    }

    // ── action: unlock_character ────────────────────────────────────────────
    if (action === 'unlock_character') {
      const { character_id } = body;
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });
      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        lock_type: 'none',
        consistency_status: 'unlocked',
      });
      return Response.json({ success: true });
    }

    // ── action: upload_reference ────────────────────────────────────────────
    if (action === 'upload_reference') {
      const { character_id, image_url } = body;
      if (!access.canUploadReference) return Response.json({ error: 'Reference image upload requires Creator Pro or higher.' }, { status: 403 });
      if (!character_id || !image_url) return Response.json({ error: 'Missing character_id or image_url' }, { status: 400 });

      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        reference_image_url: image_url,
        lock_type: 'image',
        consistency_status: 'reference_uploaded',
      });

      return Response.json({ success: true, consistency_status: 'reference_uploaded' });
    }

    // ── action: image_lock ──────────────────────────────────────────────────
    // Future: will call face-embedding provider. For now: store reference + mark status.
    if (action === 'image_lock') {
      const { character_id } = body;
      if (!access.canImageLock) return Response.json({ error: 'Image-lock requires Studio Elite.' }, { status: 403 });
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });

      const chars = await base44.asServiceRole.entities.ProjectCharacter.filter({ id: character_id });
      const char = chars?.[0];
      if (!char) return Response.json({ error: 'Character not found' }, { status: 404 });

      if (!char.reference_image_url) {
        return Response.json({ error: 'Upload a reference image first before image-locking.' }, { status: 400 });
      }

      const gemCost = await getActionCost(base44, 'image_facelock');

      // Gem check
      if (!access.isAdmin) {
        const balance = user.gems_balance ?? 0;
        if (balance < gemCost) {
          return Response.json({
            error: `Not enough gems. Image-lock costs ${gemCost} gems. Balance: ${balance}.`,
            insufficient_gems: true,
            balance,
            cost: gemCost,
          }, { status: 402 });
        }
      }

      // No active provider yet — mark as "reference_uploaded" (future-ready)
      // When provider is configured, this is where embedding extraction would happen.
      console.log(`[CharacterHub] Image-lock attempt for char ${character_id} — provider not active, storing reference.`);

      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        lock_type: 'image',
        consistency_status: 'reference_uploaded',
        gems_used: 0, // No gems charged until provider is live
      });

      return Response.json({
        success: true,
        consistency_status: 'reference_uploaded',
        message: 'Reference stored. Full image-lock will activate when the image provider is configured.',
        provider_not_configured: true,
      });
    }

    // ── action: update_dna ─────────────────────────────────────────────────
    if (action === 'update_dna') {
      const { character_id, dna, consistency_score } = body;
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });
      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, {
        dna: dna || {},
        consistency_score: consistency_score ?? 0,
      });
      console.log(`[CharacterHub] DNA saved for char ${character_id}, score: ${consistency_score}`);
      return Response.json({ success: true });
    }

    // ── action: generate_dna ────────────────────────────────────────────────
    if (action === 'generate_dna') {
      const { character_id, description_full, description_short, name } = body;
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });

      const text = description_full || description_short || name || '';
      if (text.length < 5) return Response.json({ error: 'No description available to generate DNA.' }, { status: 400 });

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a character DNA extraction engine. Analyze this character description and extract structured visual identity fields for consistent image generation.

Character name: ${name}
Description: ${text}

Extract each field concisely (1 phrase max). Leave blank if not mentioned.

Return JSON with these exact fields:
gender, age_range, ethnicity, facial_structure, hairstyle, beard_makeup, clothing_style, color_palette, body_type, accessories, personality_vibe, emotional_tone, voice_tone, style_category

Also return a "consistency_prompt" field: a compact single-line prompt summarizing all visual traits for injection into image prompts. Format: "[name]: [key visual traits, clothing, hair, colors]"`,
        response_json_schema: {
          type: 'object',
          properties: {
            gender: { type: 'string' }, age_range: { type: 'string' }, ethnicity: { type: 'string' },
            facial_structure: { type: 'string' }, hairstyle: { type: 'string' }, beard_makeup: { type: 'string' },
            clothing_style: { type: 'string' }, color_palette: { type: 'string' }, body_type: { type: 'string' },
            accessories: { type: 'string' }, personality_vibe: { type: 'string' }, emotional_tone: { type: 'string' },
            voice_tone: { type: 'string' }, style_category: { type: 'string' }, consistency_prompt: { type: 'string' },
          },
        },
      });

      const dna = result || {};
      // Score: count filled fields
      const dnaKeys = ['gender','age_range','ethnicity','facial_structure','hairstyle','clothing_style','color_palette'];
      const filledCount = dnaKeys.filter(k => dna[k]?.trim()).length;
      const consistency_score = Math.min(20 + Math.round((filledCount / dnaKeys.length) * 50), 70);

      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, { dna, consistency_score });
      console.log(`[CharacterHub] DNA generated for "${name}", score: ${consistency_score}`);
      return Response.json({ success: true, dna, consistency_score });
    }

    // ── action: update_character ────────────────────────────────────────────
    if (action === 'update_character') {
      const { character_id, updates } = body;
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });
      const allowedFields = ['name', 'role', 'description_short', 'description_full', 'scenes', 'sort_order'];
      const safeUpdates = {};
      for (const key of allowedFields) {
        if (updates?.[key] !== undefined) safeUpdates[key] = updates[key];
      }
      await base44.asServiceRole.entities.ProjectCharacter.update(character_id, safeUpdates);
      return Response.json({ success: true });
    }

    // ── action: delete_character ────────────────────────────────────────────
    if (action === 'delete_character') {
      const { character_id } = body;
      if (!character_id) return Response.json({ error: 'Missing character_id' }, { status: 400 });
      await base44.asServiceRole.entities.ProjectCharacter.delete(character_id);
      return Response.json({ success: true });
    }

    // ── action: get_injected_prompts ────────────────────────────────────────
    // Returns visual_prompt with locked character descriptions injected
    if (action === 'get_injected_prompts') {
      const { visual_prompt } = body;
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });

      const characters = await base44.asServiceRole.entities.ProjectCharacter.filter({ project_id });
      const lockedChars = characters.filter(c => c.lock_type === 'text' || c.lock_type === 'image');
      const injected = injectCharacterDescriptions(visual_prompt, lockedChars);

      return Response.json({ success: true, visual_prompt: injected, locked_count: lockedChars.length });
    }

    // ── action: fix_existing ────────────────────────────────────────────────
    // Deduplicates + merges stale records in-place without re-running AI
    if (action === 'fix_existing') {
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const all = await base44.asServiceRole.entities.ProjectCharacter.filter({ project_id });
      if (all.length === 0) return Response.json({ success: true, fixed: 0 });

      // Validate + dedup the existing set
      const valid = all.filter(c => isValidCharacterName(c.name));
      const deduped = deduplicateCharacters(valid);

      // Build a map of canonical key → winning record id
      const keyToWinner = new Map();
      for (const c of deduped) {
        keyToWinner.set(canonicalKey(c.name), c);
      }

      // Figure out which DB records are duplicates (losers)
      const winnerIds = new Set();
      const grouped = new Map(); // canonical key → array of DB records

      for (const dbRec of all) {
        if (!isValidCharacterName(dbRec.name)) continue;
        const key = canonicalKey(dbRec.name);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(dbRec);
      }

      const toDelete = [];
      const toUpdate = [];

      for (const [key, group] of grouped.entries()) {
        if (group.length === 0) continue;
        const winner = deduped.find(d => canonicalKey(d.name) === key);
        if (!winner) continue;

        // Sort: prefer record whose name matches the winner's canonical display name
        group.sort((a, b) => {
          const aMatch = a.name === winner.name ? -1 : 1;
          const bMatch = b.name === winner.name ? -1 : 1;
          return aMatch - bMatch;
        });

        const keepRec = group[0];
        winnerIds.add(keepRec.id);

        // Update winner record with merged data
        toUpdate.push({
          id: keepRec.id,
          updates: {
            name: winner.name,
            role: winner.role,
            scenes: winner.scenes,
            aliases: winner.aliases,
            location_hints: winner.aliases,
            description_full: winner.description_full || keepRec.description_full,
            description_short: winner.description_short || keepRec.description_short,
          }
        });

        // Delete the rest (duplicates)
        for (let i = 1; i < group.length; i++) {
          toDelete.push(group[i].id);
        }
      }

      // Also delete any invalid records
      for (const dbRec of all) {
        if (!isValidCharacterName(dbRec.name) && !toDelete.includes(dbRec.id)) {
          toDelete.push(dbRec.id);
        }
      }

      for (const { id, updates } of toUpdate) {
        await base44.asServiceRole.entities.ProjectCharacter.update(id, updates);
      }
      for (const id of toDelete) {
        await base44.asServiceRole.entities.ProjectCharacter.delete(id);
      }

      const finalRecords = await base44.asServiceRole.entities.ProjectCharacter.filter({ project_id });
      console.log(`[CharacterHub] fix_existing: updated ${toUpdate.length}, deleted ${toDelete.length}, final count: ${finalRecords.length}`);
      return Response.json({ success: true, fixed: toDelete.length, characters: finalRecords });
    }

    // ── action: purge_invalid ───────────────────────────────────────────────
    // Deletes known-bad character records (non-living entities) for a project
    if (action === 'purge_invalid') {
      if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });
      const all = await base44.asServiceRole.entities.ProjectCharacter.filter({ project_id });
      const toDelete = all.filter(c => !isValidCharacterName(c.name));
      for (const c of toDelete) {
        await base44.asServiceRole.entities.ProjectCharacter.delete(c.id);
      }
      console.log(`[CharacterHub] Purged ${toDelete.length} invalid characters from project ${project_id}`);
      return Response.json({ success: true, purged: toDelete.length, purged_names: toDelete.map(c => c.name) });
    }

    // ── action: check_access ────────────────────────────────────────────────
    if (action === 'check_access') {
      const gemCost = await getActionCost(base44, 'image_facelock');
      return Response.json({ success: true, access, image_lock_gem_cost: gemCost });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[CharacterHub] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});