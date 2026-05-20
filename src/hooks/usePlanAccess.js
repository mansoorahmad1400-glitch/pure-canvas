import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Default economy config — mirrors backend DEFAULT_CONFIG
const DEFAULT_CONFIG = {
  plans: {
    free:    { max_scenes: 8,  monthly_gems: 2,    export_access: false, ai_model: 'gpt-4o-mini' },
    starter: { max_scenes: 12, monthly_gems: 200,  export_access: true,  ai_model: 'gpt-4o-mini' },
    premium: { max_scenes: 15, monthly_gems: 500,  export_access: true,  ai_model: 'gpt-4o-mini' },
    elite:   { max_scenes: 18, monthly_gems: 1100, export_access: true,  ai_model: 'gpt-4o' },
    admin:   { max_scenes: 18, monthly_gems: 9999, export_access: true,  ai_model: 'gpt-4o' },
  },
  feature_access: {
    free:    { image_gen: false, video_gen: false, exports: false, cinematic_mode: false, ultra_prompts: false, long_form: false, thumbnail_gen: false, youtube_package: true  },
    starter: { image_gen: false, video_gen: false, exports: true,  cinematic_mode: false, ultra_prompts: false, long_form: false, thumbnail_gen: true,  youtube_package: true  },
    premium: { image_gen: true,  video_gen: false, exports: true,  cinematic_mode: true,  ultra_prompts: false, long_form: false, thumbnail_gen: true,  youtube_package: true  },
    elite:   { image_gen: true,  video_gen: true,  exports: true,  cinematic_mode: true,  ultra_prompts: true,  long_form: true,  thumbnail_gen: true,  youtube_package: true  },
    admin:   { image_gen: true,  video_gen: true,  exports: true,  cinematic_mode: true,  ultra_prompts: true,  long_form: true,  thumbnail_gen: true,  youtube_package: true  },
  },
  gem_economy: {
    cost_per_generation: 1,
    cost_per_export: 1,
  },
  action_costs: {},
};

export function usePlanAccess() {
  const { user, isStarter, isPremium, isElite, isAdmin, gems, isLoading: userLoading } = useCurrentUser();

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['economy-config-public'],
    queryFn: async () => {
      // Use asServiceRole via a simple public read — fall back to default if fails
      try {
        const res = await base44.functions.invoke('economyConfig', {});
        return res.data?.config || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    enabled: !!user && (user.role === 'admin'), // only admins can fetch config; others use defaults
  });

  // Determine plan key
  const planKey = isAdmin ? 'admin' : isElite ? 'elite' : isPremium ? 'premium' : isStarter ? 'starter' : 'free';

  // Merge admin config with defaults
  const config = configData || DEFAULT_CONFIG;
  const planConfig  = config.plans?.[planKey]   || DEFAULT_CONFIG.plans[planKey]   || DEFAULT_CONFIG.plans.free;
  const features    = config.feature_access?.[planKey] || DEFAULT_CONFIG.feature_access[planKey] || DEFAULT_CONFIG.feature_access.free;
  const gemEconomy  = config.gem_economy        || DEFAULT_CONFIG.gem_economy;
  const actionCosts = config.action_costs       || {};

  // Scene limits
  const maxScenes = planConfig.max_scenes ?? DEFAULT_CONFIG.plans[planKey]?.max_scenes ?? 8;

  // Gem costs (from action pricing or economy defaults)
  const gemCosts = {
    generate_blueprint: actionCosts.generate_blueprint ?? gemEconomy.cost_per_generation ?? 1,
    export:             actionCosts.export             ?? gemEconomy.cost_per_export     ?? 1,
    image_gen:          actionCosts.image_gen          ?? 2,
    video_gen:          actionCosts.video_gen          ?? 5,
    audio_gen:          actionCosts.audio_gen          ?? 2,
  };

  // Access checks
  const canGenerate       = isAdmin || gems >= gemCosts.generate_blueprint;
  const canExport         = isAdmin || (features.exports && gems >= gemCosts.export);
  const canUseImageGen    = isAdmin || features.image_gen;
  const canUseVideoGen    = isAdmin || features.video_gen;
  const canUseCinematic   = isAdmin || features.cinematic_mode;
  const canUseUltraPrompt = isAdmin || features.ultra_prompts;
  const canUseLongForm    = isAdmin || features.long_form;
  const canUseThumbnail   = isAdmin || features.thumbnail_gen;
  const canUseYouTubePkg  = features.youtube_package !== false;

  // Plan display info
  const planLabel = isAdmin ? 'Admin' : isElite ? 'Studio Elite' : isPremium ? 'Creator Pro' : isStarter ? 'Starter' : 'Free';
  const gemLimit  = isAdmin ? null : planConfig.monthly_gems ?? (isStarter || isPremium || isElite ? 200 : 2);

  // Gate check — returns { allowed, reason, upgradeRequired, gemsRequired }
  const checkAccess = (actionKey) => {
    if (isAdmin) return { allowed: true };

    const cost = gemCosts[actionKey] ?? 0;
    const featureMap = {
      export:         features.exports,
      image_gen:      features.image_gen,
      video_gen:      features.video_gen,
      cinematic_mode: features.cinematic_mode,
      ultra_prompts:  features.ultra_prompts,
      long_form:      features.long_form,
      thumbnail_gen:  features.thumbnail_gen,
    };

    // Check feature access
    if (actionKey in featureMap && !featureMap[actionKey]) {
      return {
        allowed: false,
        upgradeRequired: true,
        reason: 'Upgrade your plan to unlock this feature.',
      };
    }

    // Check gem balance
    if (cost > 0 && gems < cost) {
      return {
        allowed: false,
        gemsRequired: cost,
        reason: `You need ${cost} gem${cost !== 1 ? 's' : ''} for this action. Current balance: ${gems}.`,
      };
    }

    return { allowed: true };
  };

  return {
    planKey,
    planLabel,
    planConfig,
    features,
    gemCosts,
    gemLimit,
    maxScenes,
    canGenerate,
    canExport,
    canUseImageGen,
    canUseVideoGen,
    canUseCinematic,
    canUseUltraPrompt,
    canUseLongForm,
    canUseThumbnail,
    canUseYouTubePkg,
    checkAccess,
    isLoading: userLoading || configLoading,
  };
}