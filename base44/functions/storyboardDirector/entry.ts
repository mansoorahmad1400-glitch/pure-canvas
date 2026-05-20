import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Parse scenes from a visual_prompt block
function parseScenes(visualPrompt, masterPrompt) {
  const scenes = [];
  const scenePattern = /Scene\s+(\d+)\s*:?\s*([\s\S]*?)(?=Scene\s+\d+\s*:?|$)/gi;
  let match;
  while ((match = scenePattern.exec(visualPrompt || '')) !== null) {
    const sceneNum = parseInt(match[1]);
    const content = match[2].trim();
    if (content.length > 10) {
      scenes.push({ scene_number: sceneNum, content });
    }
  }
  // Fallback: single scene
  if (scenes.length === 0 && (visualPrompt || '').trim().length > 20) {
    scenes.push({ scene_number: 1, content: (visualPrompt || '').trim() });
  }
  return scenes;
}

// Extract characters from text
function extractCharacters(text) {
  if (!text) return [];
  const found = new Set();
  // Look for capitalised proper names
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  const blocked = new Set(['Scene','The','A','An','In','On','At','With','From','Into','Over','Under','Through','Around','Behind','Before','After','Between','Among']);
  let m;
  while ((m = namePattern.exec(text)) !== null) {
    const w = m[1].trim();
    if (!blocked.has(w) && w.length > 2) found.add(w);
  }
  return [...found].slice(0, 4);
}

// Extract location from text
function extractLocation(text) {
  if (!text) return '';
  const locPatterns = [
    /(?:in|at|inside|outside|within|near|on|through)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:forest|castle|village|city|town|kingdom|cave|mountain|ocean|river|palace|temple|market|arena|chamber|hall|garden|desert|jungle|ruins|chamber)/i,
  ];
  for (const p of locPatterns) {
    const m = text.match(p);
    if (m) return m[1] || m[0];
  }
  return '';
}

// Camera / transition assignments by genre
const GENRE_CINEMATICS = {
  action:    { cameras: ['tracking_shot','dolly_in','low_angle','wide_shot'], transitions: ['smash_cut','cut','flash'], pacing: 'fast' },
  adventure: { cameras: ['wide_shot','aerial','tracking_shot','low_angle'],  transitions: ['cut','match_cut','dissolve'], pacing: 'dynamic' },
  drama:     { cameras: ['medium_shot','close_up','over_shoulder','dutch_angle'], transitions: ['dissolve','cross_dissolve','fade'], pacing: 'slow' },
  comedy:    { cameras: ['medium_shot','wide_shot','close_up'],              transitions: ['cut','wipe','iris'],        pacing: 'fast' },
  fantasy:   { cameras: ['aerial','wide_shot','dolly_in','birds_eye'],       transitions: ['dissolve','iris','fade'],   pacing: 'medium' },
  thriller:  { cameras: ['close_up','dutch_angle','extreme_close_up','low_angle'], transitions: ['smash_cut','cut','flash'], pacing: 'dynamic' },
  horror:    { cameras: ['dutch_angle','extreme_close_up','low_angle','close_up'], transitions: ['cut','smash_cut','flash'], pacing: 'slow' },
  romance:   { cameras: ['medium_shot','close_up','over_shoulder'],          transitions: ['dissolve','cross_dissolve','fade'], pacing: 'slow' },
  kids:      { cameras: ['wide_shot','medium_shot','birds_eye'],             transitions: ['wipe','iris','dissolve'],   pacing: 'medium' },
  default:   { cameras: ['wide_shot','medium_shot','close_up'],              transitions: ['cut','dissolve','fade'],    pacing: 'medium' },
};

function pickForGenre(genre, idx, arr) {
  const key = (genre || 'default').toLowerCase();
  const cfg = GENRE_CINEMATICS[key] || GENRE_CINEMATICS.default;
  return {
    camera: cfg.cameras[idx % cfg.cameras.length],
    transition: cfg.transitions[idx % cfg.transitions.length],
    pacing: cfg.pacing,
  };
}

// Build cinematic motion prompt
function buildMotionPrompt(sceneText, camera, pacing, genre) {
  const pacingMap = { slow: 'slow, deliberate movement', fast: 'rapid, energetic movement', dynamic: 'dynamic shifting movement', medium: 'fluid steady movement' };
  return `${camera.replace(/_/g, ' ')} — ${pacingMap[pacing] || 'steady movement'} — cinematic ${genre || 'dramatic'} style. ${sceneText.slice(0, 120)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, project_id } = body;

    if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });

    // ── get_scenes ──────────────────────────────────────────────────────────────
    if (action === 'get_scenes') {
      const scenes = await base44.entities.StoryboardDirectorScene.filter({ project_id });
      return Response.json({ scenes: scenes.sort((a, b) => a.sort_order - b.sort_order) });
    }

    // ── init_director_storyboard ────────────────────────────────────────────────
    if (action === 'init_director_storyboard') {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
      const project = projects?.[0];
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

      const rawScenes = parseScenes(project.visual_prompt, project.master_prompt);
      if (rawScenes.length === 0) return Response.json({ error: 'No scenes found in blueprint' }, { status: 400 });

      const genre = project.genre || project.project_type || 'default';

      // Delete existing
      const existing = await base44.asServiceRole.entities.StoryboardDirectorScene.filter({ project_id });
      for (const s of existing) {
        await base44.asServiceRole.entities.StoryboardDirectorScene.delete(s.id);
      }

      const created = [];
      for (let i = 0; i < rawScenes.length; i++) {
        const raw = rawScenes[i];
        const { camera, transition, pacing } = pickForGenre(genre, i, rawScenes);
        const record = await base44.asServiceRole.entities.StoryboardDirectorScene.create({
          project_id,
          user_id: user.email,
          scene_number: raw.scene_number,
          story_text: raw.content,
          visual_prompt: raw.content,
          motion_prompt: buildMotionPrompt(raw.content, camera, pacing, genre),
          camera_direction: camera,
          transition_type: transition,
          scene_duration: 6,
          pacing,
          detected_characters: extractCharacters(raw.content),
          detected_location: extractLocation(raw.content),
          approved: false,
          sort_order: i,
        });
        created.push(record);
      }

      console.log(`[StoryboardDirector] Initialized ${created.length} scenes for project ${project_id}`);
      return Response.json({ success: true, scenes: created });
    }

    // ── auto_director ───────────────────────────────────────────────────────────
    if (action === 'auto_director') {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
      const project = projects?.[0];
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

      const scenes = await base44.asServiceRole.entities.StoryboardDirectorScene.filter({ project_id });
      if (scenes.length === 0) return Response.json({ error: 'No scenes to direct' }, { status: 400 });

      const genre = project.genre || project.project_type || 'default';
      const sorted = scenes.sort((a, b) => a.sort_order - b.sort_order);

      // Use LLM to generate cinematic directions
      const prompt = `You are a cinematic director AI. Given ${sorted.length} story scenes for a "${genre}" project titled "${project.title}", assign cinematic directions.

Project tone: ${project.tone || 'dramatic'}
Project mood: ${project.mood || 'engaging'}

Scenes:
${sorted.map((s, i) => `Scene ${i + 1}: ${(s.story_text || s.visual_prompt || '').slice(0, 200)}`).join('\n')}

For each scene, provide: camera_direction, transition_type, scene_duration (seconds 4-12), pacing (slow/medium/fast/dynamic), motion_prompt (1 sentence describing movement), mood.

Respond with a JSON array of exactly ${sorted.length} objects.`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            directions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  camera_direction: { type: 'string' },
                  transition_type: { type: 'string' },
                  scene_duration: { type: 'number' },
                  pacing: { type: 'string' },
                  motion_prompt: { type: 'string' },
                  mood: { type: 'string' },
                }
              }
            }
          }
        }
      });

      const directions = result?.directions || [];
      const validCameras = ['wide_shot','medium_shot','close_up','extreme_close_up','birds_eye','low_angle','dutch_angle','tracking_shot','dolly_in','dolly_out','pan_left','pan_right','tilt_up','tilt_down','aerial','over_shoulder'];
      const validTransitions = ['cut','fade','dissolve','wipe','iris','match_cut','smash_cut','cross_dissolve','flash','zoom_transition'];
      const validPacing = ['slow','medium','fast','dynamic'];

      const updated = [];
      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        const d = directions[i] || {};
        const fallback = pickForGenre(genre, i, sorted);
        const updateData = {
          camera_direction: validCameras.includes(d.camera_direction) ? d.camera_direction : fallback.camera,
          transition_type: validTransitions.includes(d.transition_type) ? d.transition_type : fallback.transition,
          scene_duration: (d.scene_duration >= 4 && d.scene_duration <= 12) ? d.scene_duration : 6,
          pacing: validPacing.includes(d.pacing) ? d.pacing : fallback.pacing,
          motion_prompt: d.motion_prompt || s.motion_prompt,
          mood: d.mood || s.mood,
        };
        await base44.asServiceRole.entities.StoryboardDirectorScene.update(s.id, updateData);
        updated.push({ ...s, ...updateData });
      }

      console.log(`[StoryboardDirector] Auto-directed ${updated.length} scenes`);
      return Response.json({ success: true, scenes: updated });
    }

    // ── update_scene ────────────────────────────────────────────────────────────
    if (action === 'update_scene') {
      const { scene_id, updates } = body;
      if (!scene_id) return Response.json({ error: 'Missing scene_id' }, { status: 400 });
      await base44.entities.StoryboardDirectorScene.update(scene_id, updates);
      return Response.json({ success: true });
    }

    // ── delete_scene ────────────────────────────────────────────────────────────
    if (action === 'delete_scene') {
      const { scene_id } = body;
      if (!scene_id) return Response.json({ error: 'Missing scene_id' }, { status: 400 });
      await base44.entities.StoryboardDirectorScene.delete(scene_id);
      return Response.json({ success: true });
    }

    // ── duplicate_scene ─────────────────────────────────────────────────────────
    if (action === 'duplicate_scene') {
      const { scene_id } = body;
      if (!scene_id) return Response.json({ error: 'Missing scene_id' }, { status: 400 });
      const scenes = await base44.entities.StoryboardDirectorScene.filter({ id: scene_id });
      const orig = scenes?.[0];
      if (!orig) return Response.json({ error: 'Scene not found' }, { status: 404 });
      const { id: _id, created_date: _c, updated_date: _u, ...rest } = orig;
      const allScenes = await base44.entities.StoryboardDirectorScene.filter({ project_id });
      const newScene = await base44.entities.StoryboardDirectorScene.create({
        ...rest,
        scene_number: Math.max(...allScenes.map(s => s.scene_number)) + 1,
        sort_order: (orig.sort_order || 0) + 0.5,
        approved: false,
      });
      return Response.json({ success: true, scene: newScene });
    }

    // ── approve_all ─────────────────────────────────────────────────────────────
    if (action === 'approve_all') {
      const scenes = await base44.entities.StoryboardDirectorScene.filter({ project_id });
      for (const s of scenes) {
        await base44.entities.StoryboardDirectorScene.update(s.id, { approved: true });
      }
      return Response.json({ success: true, count: scenes.length });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[StoryboardDirector] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});