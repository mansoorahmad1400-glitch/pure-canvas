/**
 * Resolves the image style preset key from a project's type and audience.
 * Used by: SceneImagePanel (frontend default), imageGeneration (backend override).
 *
 * Returns one of the keys from PRESETS in StylePresetPicker:
 *   cinematic_realistic | pixar_style | anime | hyper_realistic
 *   fantasy | dark_thriller | pakistani_drama | disney_inspired
 *   neon_cyberpunk | historical_epic
 */

// Maps project_type + audience → style preset key
const TYPE_STYLE_MAP = {
  // Kids/family animated content
  rhyme:       { default: 'pixar_style',         kids: 'pixar_style',    family: 'pixar_style' },
  fairy_tale:  { default: 'disney_inspired',     kids: 'disney_inspired', family: 'disney_inspired' },
  educational: { default: 'pixar_style',         kids: 'pixar_style',    family: 'pixar_style' },
  // Fantasy / magical
  fantasy:     { default: 'fantasy',             kids: 'disney_inspired', adults: 'fantasy', teens: 'fantasy', universal: 'fantasy' },
  mythology:   { default: 'historical_epic',     universal: 'historical_epic', adults: 'historical_epic' },
  // Adventure / action
  adventure:   { default: 'cinematic_realistic', teens: 'cinematic_realistic', adults: 'cinematic_realistic', kids: 'pixar_style' },
  // Drama / story / emotional
  story:       { default: 'cinematic_realistic', adults: 'cinematic_realistic', family: 'cinematic_realistic', kids: 'pixar_style' },
  documentary: { default: 'cinematic_realistic', adults: 'cinematic_realistic' },
  // Mystery / thriller / suspense
  mystery:     { default: 'dark_thriller',       adults: 'dark_thriller', teens: 'dark_thriller' },
  // Misc
  folktale:    { default: 'disney_inspired',     kids: 'disney_inspired', family: 'disney_inspired', universal: 'historical_epic' },
};

const STYLE_LABELS = {
  cinematic_realistic: 'Cinematic Realistic',
  pixar_style:         'Pixar / 3D Animated',
  anime:               'Anime',
  hyper_realistic:     'Hyper Realistic',
  fantasy:             'Fantasy / Storybook',
  dark_thriller:       'Dark Thriller',
  pakistani_drama:     'South Asian Drama',
  disney_inspired:     'Disney / Storybook',
  neon_cyberpunk:      'Cyberpunk',
  historical_epic:     'Historical Epic',
  script_style:        'Script Style',
};

/**
 * Derive the best style key from project metadata.
 * @param {object} project - { project_type, audience, visual_style_key }
 * @returns {string} style preset key
 */
export function resolveScriptStyle(project) {
  // If we already stored a resolved key at save time, trust it
  if (project?.visual_style_key && project.visual_style_key !== 'script_style') {
    return project.visual_style_key;
  }

  const type = (project?.project_type || 'story').toLowerCase();
  const audience = (project?.audience || 'universal').toLowerCase();

  const typeMap = TYPE_STYLE_MAP[type];
  if (!typeMap) return 'cinematic_realistic';

  // Try audience-specific first, fall back to default
  return typeMap[audience] || typeMap.default || 'cinematic_realistic';
}

/**
 * Get a human-readable label for a style key.
 */
export function getStyleLabel(key) {
  return STYLE_LABELS[key] || key;
}

/**
 * Build the full style suffix string injected into image prompts.
 * Includes genre, audience, mood, and character style context.
 */
export function buildStyleContext(project, resolvedStyleKey) {
  const audience = project?.audience || 'universal';
  const type = project?.project_type || 'story';
  const tone = project?.tone || '';
  const mood = project?.mood || '';

  const AUDIENCE_DESC = {
    kids:      'designed for young children ages 3–8, colorful, safe, expressive',
    family:    'family-friendly, warm, emotionally engaging for all ages',
    teens:     'dynamic, energetic, relatable to teenagers',
    adults:    'mature themes, sophisticated visuals, detailed',
    universal: 'accessible to all ages, clear and engaging',
  };

  const TYPE_DESC = {
    rhyme:       'nursery rhyme, playful and bouncy visual rhythm',
    fairy_tale:  'fairy tale world, magical creatures and enchanted settings',
    educational: 'educational content, clear illustrative visuals',
    fantasy:     'epic fantasy world, magical atmosphere',
    mythology:   'ancient mythology, grand epic scale',
    adventure:   'action adventure, dynamic motion and energy',
    story:       'narrative story, character-driven emotional beats',
    documentary: 'documentary realism, authentic visual details',
    mystery:     'mystery thriller, suspenseful and atmospheric',
    folktale:    'traditional folktale, cultural art style',
  };

  const parts = [];
  if (AUDIENCE_DESC[audience]) parts.push(`Audience: ${AUDIENCE_DESC[audience]}`);
  if (TYPE_DESC[type]) parts.push(`Genre: ${TYPE_DESC[type]}`);
  if (tone) parts.push(`Tone: ${tone}`);
  if (mood) parts.push(`Mood: ${mood}`);
  parts.push('Visual consistency: all scenes must share the same art style, color palette, character design, and world aesthetic');

  return parts.join('. ');
}