import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Provider definitions ─────────────────────────────────────────────────────
// Each entry: id, label, supported action types, enabled status, and available models.
// "enabled" = actually wired to a real API key. Disabled = placeholder only.

export const PROVIDERS = {
  openai: {
    id: 'openai', label: 'OpenAI', enabled: true,
    actions: ['text', 'image_prompt'],
    models: {
      'gpt-4o-mini': { label: 'GPT-4o Mini', quality: 'Standard AI',  cost_per_call: 0.002, max_tokens: 16000 },
      'gpt-4o':      { label: 'GPT-4o',      quality: 'Enhanced AI',  cost_per_call: 0.01,  max_tokens: 16000 },
      'o1-mini':     { label: 'o1 Mini',      quality: 'Premium AI',   cost_per_call: 0.015, max_tokens: 65536 },
      'o3-mini':     { label: 'o3 Mini',      quality: 'Cinematic AI', cost_per_call: 0.04,  max_tokens: 65536 },
    },
  },
  gemini: {
    id: 'gemini', label: 'Gemini (Google)', enabled: false,
    actions: ['text'],
    models: {
      'gemini-flash':    { label: 'Gemini Flash',    quality: 'Standard AI',  cost_per_call: 0.001, max_tokens: 8192 },
      'gemini-pro':      { label: 'Gemini Pro',      quality: 'Enhanced AI',  cost_per_call: 0.005, max_tokens: 32768 },
      'gemini-ultra':    { label: 'Gemini Ultra',    quality: 'Premium AI',   cost_per_call: 0.02,  max_tokens: 32768 },
    },
  },
  anthropic: {
    id: 'anthropic', label: 'Anthropic / Claude', enabled: false,
    actions: ['text'],
    models: {
      'claude-haiku':  { label: 'Claude Haiku',  quality: 'Standard AI',  cost_per_call: 0.002, max_tokens: 16000 },
      'claude-sonnet': { label: 'Claude Sonnet', quality: 'Enhanced AI',  cost_per_call: 0.012, max_tokens: 16000 },
      'claude-opus':   { label: 'Claude Opus',   quality: 'Premium AI',   cost_per_call: 0.05,  max_tokens: 16000 },
    },
  },
  grok: {
    id: 'grok', label: 'Grok / xAI', enabled: false,
    actions: ['text'],
    models: {
      'grok-2':    { label: 'Grok 2',    quality: 'Enhanced AI', cost_per_call: 0.01, max_tokens: 16000 },
      'grok-3':    { label: 'Grok 3',    quality: 'Premium AI',  cost_per_call: 0.03, max_tokens: 16000 },
    },
  },
  openrouter: {
    id: 'openrouter', label: 'OpenRouter', enabled: false,
    actions: ['text'],
    models: {
      'openrouter-default': { label: 'OpenRouter (Auto)', quality: 'Enhanced AI', cost_per_call: 0.005, max_tokens: 16000 },
    },
  },
  runway: {
    id: 'runway', label: 'Runway', enabled: false,
    actions: ['video'],
    models: {
      'runway-gen3': { label: 'Runway Gen-3', quality: 'Cinematic AI', cost_per_call: 0.5, max_tokens: null },
    },
  },
  pika: {
    id: 'pika', label: 'Pika', enabled: false,
    actions: ['video'],
    models: {
      'pika-2': { label: 'Pika 2', quality: 'Cinematic AI', cost_per_call: 0.4, max_tokens: null },
    },
  },
  kling: {
    id: 'kling', label: 'Kling', enabled: false,
    actions: ['video'],
    models: {
      'kling-v1': { label: 'Kling v1', quality: 'Cinematic AI', cost_per_call: 0.3, max_tokens: null },
    },
  },
  sora: {
    id: 'sora', label: 'Sora (OpenAI)', enabled: false,
    actions: ['video'],
    models: {
      'sora-1': { label: 'Sora 1', quality: 'Cinematic AI', cost_per_call: 1.0, max_tokens: null },
    },
  },
  elevenlabs: {
    id: 'elevenlabs', label: 'ElevenLabs', enabled: false,
    actions: ['audio'],
    models: {
      'eleven-v2': { label: 'ElevenLabs v2', quality: 'Premium AI', cost_per_call: 0.05, max_tokens: null },
    },
  },
  suno: {
    id: 'suno', label: 'Suno', enabled: false,
    actions: ['audio'],
    models: {
      'suno-v3': { label: 'Suno v3', quality: 'Premium AI', cost_per_call: 0.1, max_tokens: null },
    },
  },
};

// ─── Default routing table ────────────────────────────────────────────────────
// These are used when admin has not configured custom routing in EconomyConfig.

const DEFAULT_ROUTING = {
  // Plan → model routing for blueprint/text generation
  plan_models: {
    free_first:  { provider: 'openai', model: 'gpt-4o',      quality_label: 'Premium Trial' },
    free_second: { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI'   },
    starter:     { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI'   },
    premium:     { provider: 'openai', model: 'gpt-4o',      quality_label: 'Enhanced AI'   },
    elite:       { provider: 'openai', model: 'gpt-4o',      quality_label: 'Premium AI'    },
    admin:       { provider: 'openai', model: 'gpt-4o',      quality_label: 'Admin Override' },
  },
  // Fallback model if primary fails
  fallback:      { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI' },
  // Cost protection: if a model's estimated cost exceeds this threshold,
  // route to fallback instead (unless admin overrides)
  cost_threshold_usd: 0.05,
  // Allow admins to bypass cost threshold
  admin_cost_override: true,
};

// ─── Helper: load routing config from DB ─────────────────────────────────────

async function loadRoutingConfig(base44) {
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    if (records && records.length > 0 && records[0].model_routing) {
      return { ...DEFAULT_ROUTING, ...records[0].model_routing };
    }
  } catch (e) {
    console.warn('[ModelRouter] Could not load routing config, using defaults:', e.message);
  }
  return DEFAULT_ROUTING;
}

// ─── Core routing function ────────────────────────────────────────────────────
// Returns: { provider, model, quality_label, max_tokens, estimated_cost, is_fallback, is_free_trial }

async function resolveModel({ base44, role, action, gemsUsedThisMonth, gemsUsedLifetime }) {
  const routing = await loadRoutingConfig(base44);

  let route;
  let is_free_trial = false;

  if (role === 'admin') {
    route = routing.plan_models?.admin || DEFAULT_ROUTING.plan_models.admin;
  } else if (role === 'free' || role === 'user') {
    // Free user special rule: first generation gets premium trial
    const isFirstGen = (gemsUsedLifetime ?? 0) === 0;
    if (isFirstGen) {
      route = routing.plan_models?.free_first || DEFAULT_ROUTING.plan_models.free_first;
      is_free_trial = true;
    } else {
      route = routing.plan_models?.free_second || DEFAULT_ROUTING.plan_models.free_second;
    }
  } else if (role === 'starter') {
    route = routing.plan_models?.starter || DEFAULT_ROUTING.plan_models.starter;
  } else if (role === 'premium') {
    route = routing.plan_models?.premium || DEFAULT_ROUTING.plan_models.premium;
  } else if (role === 'elite') {
    route = routing.plan_models?.elite || DEFAULT_ROUTING.plan_models.elite;
  } else {
    route = routing.plan_models?.starter || DEFAULT_ROUTING.plan_models.starter;
  }

  const providerDef = PROVIDERS[route.provider];
  const modelDef = providerDef?.models?.[route.model];

  // Cost protection check
  const costThreshold = routing.cost_threshold_usd ?? DEFAULT_ROUTING.cost_threshold_usd;
  const estimatedCost = modelDef?.cost_per_call ?? 0;
  const isAdminOverride = routing.admin_cost_override && role === 'admin';

  if (!isAdminOverride && estimatedCost > costThreshold) {
    console.warn(`[ModelRouter] Cost protection: ${route.model} costs $${estimatedCost} > threshold $${costThreshold}. Using fallback.`);
    const fallback = routing.fallback || DEFAULT_ROUTING.fallback;
    const fbProvider = PROVIDERS[fallback.provider];
    const fbModel = fbProvider?.models?.[fallback.model];
    return {
      provider: fallback.provider,
      model: fallback.model,
      quality_label: fallback.quality_label || 'Standard AI',
      max_tokens: fbModel?.max_tokens ?? 16000,
      estimated_cost: fbModel?.cost_per_call ?? 0,
      is_fallback: true,
      is_free_trial: false,
      cost_protection_triggered: true,
    };
  }

  // Check provider is enabled
  if (!providerDef?.enabled) {
    console.warn(`[ModelRouter] Provider ${route.provider} is disabled. Using fallback.`);
    const fallback = routing.fallback || DEFAULT_ROUTING.fallback;
    const fbProvider = PROVIDERS[fallback.provider];
    const fbModel = fbProvider?.models?.[fallback.model];
    return {
      provider: fallback.provider,
      model: fallback.model,
      quality_label: fallback.quality_label || 'Standard AI',
      max_tokens: fbModel?.max_tokens ?? 16000,
      estimated_cost: fbModel?.cost_per_call ?? 0,
      is_fallback: true,
      is_free_trial: false,
    };
  }

  return {
    provider: route.provider,
    model: route.model,
    quality_label: is_free_trial ? 'Premium Trial' : (route.quality_label || modelDef?.quality || 'Standard AI'),
    max_tokens: modelDef?.max_tokens ?? 16000,
    estimated_cost: estimatedCost,
    is_fallback: false,
    is_free_trial,
  };
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────
// This endpoint is called by other backend functions (not frontend directly).
// It returns the resolved routing config for a given plan/action.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action: reqAction = 'get_route' } = body;

    // ── get_route: resolve model for this user's plan ────────────────────────
    if (reqAction === 'get_route') {
      const { action = 'text', gems_used_lifetime } = body;

      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      const userRecord = allUsers.find(u => u.email === user.email);
      const gemsUsedLifetime = gems_used_lifetime ?? userRecord?.gems_used_lifetime ?? 0;

      const route = await resolveModel({
        base44,
        role: user.role || 'free',
        action,
        gemsUsedLifetime,
      });

      return Response.json({ route, user_role: user.role });
    }

    // ── get_config: admin only — return full routing config and provider list ─
    if (reqAction === 'get_config') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const routing = await loadRoutingConfig(base44);
      return Response.json({ routing, providers: PROVIDERS });
    }

    // ── save_config: admin only ───────────────────────────────────────────────
    if (reqAction === 'save_config') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { model_routing } = body;
      const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });

      if (records && records.length > 0) {
        await base44.asServiceRole.entities.EconomyConfig.update(records[0].id, { model_routing });
      } else {
        await base44.asServiceRole.entities.EconomyConfig.create({ config_key: 'main', model_routing });
      }

      console.log('[ModelRouter] Config saved by admin:', user.email);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[ModelRouter] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});