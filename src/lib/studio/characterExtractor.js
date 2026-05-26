// Local-only character extraction from approved storyboard scenes.
// No external API. Uses scene.characters[] first, then a simple Capitalized
// name heuristic across story / dialogue / narration text.

const STOPWORDS = new Set([
  'The','A','An','And','Or','But','If','Then','When','While','He','She','It',
  'They','We','You','I','My','His','Her','Their','Our','Your','This','That',
  'These','Those','Here','There','Now','Today','Tonight','Tomorrow','Yesterday',
  'Suddenly','Finally','However','Meanwhile','Inside','Outside','Above','Below',
  'Scene','Chapter','Mr','Mrs','Ms','Dr','Sir','Lady','King','Queen','Prince',
  'Princess','Lord','Master','Captain','Doctor','Professor','Day','Night',
  'Morning','Evening','Camera','Wide','Close','Shot','Angle','Cut','Fade',
]);

function extractFromText(text, counter) {
  if (!text) return;
  // Strip leading "Name:" speaker tags and capture them as characters
  const speakerRe = /^\s*([A-Z][a-zA-Z' -]{1,30}):/gm;
  let m;
  while ((m = speakerRe.exec(text)) !== null) {
    const name = m[1].trim();
    if (!STOPWORDS.has(name)) counter.set(name, (counter.get(name) ?? 0) + 3);
  }
  // Capitalized words / names (handles "Ali Baba", "Snow White")
  const nameRe = /\b([A-Z][a-z]{2,})(?:\s+([A-Z][a-z]{2,}))?\b/g;
  while ((m = nameRe.exec(text)) !== null) {
    const a = m[1];
    const b = m[2];
    if (b && !STOPWORDS.has(a) && !STOPWORDS.has(b)) {
      const full = `${a} ${b}`;
      counter.set(full, (counter.get(full) ?? 0) + 2);
    } else if (!STOPWORDS.has(a)) {
      counter.set(a, (counter.get(a) ?? 0) + 1);
    }
  }
}

export function defaultStyleFor(projectType) {
  const t = (projectType || '').toLowerCase();
  if (/cartoon|fairy|fantasy|kid|story|rhyme|nursery|musical|animat/.test(t)) {
    return 'Animated/cartoon style, warm cinematic lighting, family-friendly, consistent character design';
  }
  if (/document|education|realistic|explainer|news/.test(t)) {
    return 'Realistic documentary style, natural lighting, true-to-life detail';
  }
  return 'Cinematic style, consistent character design, balanced lighting';
}

/**
 * Extract candidate characters from approved scenes.
 * Approval = visual_status === 'approved' OR audio_status === 'approved'
 * (fallback: include all scenes if none are approved yet).
 */
export function extractCharacters({ scenes, projectType, existingNames = [] }) {
  const approved = scenes.filter(
    (s) => s.visual_status === 'approved' || s.audio_status === 'approved'
  );
  const pool = approved.length ? approved : scenes;

  const counter = new Map();
  const sceneByName = new Map();

  for (const s of pool) {
    const addScene = (name) => {
      if (!sceneByName.has(name)) sceneByName.set(name, new Set());
      sceneByName.get(name).add(s.scene_number);
    };

    if (Array.isArray(s.characters)) {
      for (const raw of s.characters) {
        const name = String(raw || '').trim();
        if (!name) continue;
        counter.set(name, (counter.get(name) ?? 0) + 5);
        addScene(name);
      }
    }
    const before = new Map(counter);
    extractFromText(s.story_text, counter);
    extractFromText(s.dialogue_text, counter);
    extractFromText(s.narration_text, counter);
    for (const name of counter.keys()) {
      if ((counter.get(name) ?? 0) > (before.get(name) ?? 0)) addScene(name);
    }
  }

  const existing = new Set(existingNames.map((n) => n.toLowerCase().trim()));
  const style = defaultStyleFor(projectType);

  const ranked = Array.from(counter.entries())
    .filter(([name, score]) => score >= 2 && !existing.has(name.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return ranked.map(([name, score], idx) => {
    const scenes = Array.from(sceneByName.get(name) ?? []).sort((a, b) => a - b);
    const role = idx === 0 ? 'protagonist' : idx <= 2 ? 'supporting' : 'minor';
    return {
      name,
      role,
      description: `Character appears in ${scenes.length || 1} scene${scenes.length === 1 ? '' : 's'}${scenes.length ? ` (${scenes.join(', ')})` : ''}. Edit this description to define their look, age, and personality.`,
      appearance: '',
      personality: '',
      voice_style: '',
      style_prompt: style,
      reference_image_url: null,
      approval_status: 'pending',
      _mentions: score,
    };
  });
}
