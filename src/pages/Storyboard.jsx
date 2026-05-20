import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Film, Check, LayoutGrid, RefreshCw, Sparkles, Lock, ImageIcon } from 'lucide-react';
import StoryboardCard from '@/components/storyboard/StoryboardCard';
import { motion } from 'framer-motion';

// ─── Scene extractor from visual_prompt string ────────────────────────────────
function extractScenes(visualPrompt, defaultAspect = '16:9') {
  if (!visualPrompt) return [];
  const scenes = [];
  // Match "Scene N:" or "Scene N " blocks
  const scenePattern = /Scene\s+(\d+)\s*:?\s*([\s\S]*?)(?=Scene\s+\d+\s*:?|$)/gi;
  let match;
  while ((match = scenePattern.exec(visualPrompt)) !== null) {
    const sceneNum = parseInt(match[1]);
    const content = match[2].trim();
    if (content.length > 10) {
      scenes.push({
        scene_number: sceneNum,
        visual_prompt: content,
        aspect_ratio: defaultAspect,
      });
    }
  }
  // Fallback: if no pattern match, treat full prompt as single scene
  if (scenes.length === 0 && visualPrompt.trim().length > 20) {
    scenes.push({ scene_number: 1, visual_prompt: visualPrompt.trim(), aspect_ratio: defaultAspect });
  }
  return scenes.sort((a, b) => a.scene_number - b.scene_number);
}

// ─── Default aspect ratio from project type ───────────────────────────────────
function defaultAspectForType(projectType) {
  const shorts = ['rhyme', 'tiktok', 'reel', 'short'];
  const square = ['social'];
  if (shorts.some(t => (projectType || '').toLowerCase().includes(t))) return '9:16';
  if (square.some(t => (projectType || '').toLowerCase().includes(t))) return '1:1';
  return '16:9';
}

export default function Storyboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isPremium, isElite, isStarter, gems, refetch: refetchUser } = useCurrentUser();
  const queryClient = useQueryClient();

  // Accept state from navigation (output + project metadata) or URL param
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project_id') || location.state?.project_id;
  const blueprintOutput = location.state?.output;
  const projectType = location.state?.project_type || 'story';
  const projectName = location.state?.project_name || 'Storyboard';

  const [globalAspect, setGlobalAspect] = useState(defaultAspectForType(projectType));
  const [localScenes, setLocalScenes] = useState([]); // local state mirrors DB records
  const [initialized, setInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState(null);
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [gemCost, setGemCost] = useState(3);
  const [regenGemCost, setRegenGemCost] = useState(4);
  const [providerLoaded, setProviderLoaded] = useState(false);

  // Access check
  const canGenerateImages = isAdmin || isPremium || isElite || isStarter;

  // ─── Load provider status ───────────────────────────────────────────────────
  useEffect(() => {
    base44.functions.invoke('storyboardImage', { action: 'check_provider' })
      .then(res => {
        setProviderEnabled(res.data?.provider_enabled || false);
        setGemCost(res.data?.default_gem_cost || 3);
        setRegenGemCost((res.data?.default_gem_cost || 3) + 1);
        setProviderLoaded(true);
      })
      .catch(() => setProviderLoaded(true));
  }, []);

  // ─── Load existing storyboard scenes from DB ────────────────────────────────
  const { data: dbScenes, isLoading: loadingDb } = useQuery({
    queryKey: ['storyboard-scenes', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return await base44.entities.StoryboardScene.filter({ project_id: projectId });
    },
    enabled: !!projectId,
  });

  // Sync db scenes to local state once loaded
  useEffect(() => {
    if (dbScenes && dbScenes.length > 0 && !initialized) {
      setLocalScenes(dbScenes.sort((a, b) => a.scene_number - b.scene_number));
      setInitialized(true);
    }
  }, [dbScenes, initialized]);

  // ─── Init storyboard from blueprint output ──────────────────────────────────
  const handleInitStoryboard = useCallback(async () => {
    if (!blueprintOutput?.visual_prompt) {
      toast.error('No visual prompts found in blueprint.');
      return;
    }
    if (!projectId) {
      toast.error('Save your project first to create a storyboard.');
      return;
    }
    setInitializing(true);
    try {
      const scenes = extractScenes(blueprintOutput.visual_prompt, globalAspect);
      if (scenes.length === 0) {
        toast.error('Could not extract scenes from visual prompt.');
        setInitializing(false);
        return;
      }
      const res = await base44.functions.invoke('storyboardImage', {
        action: 'init_storyboard',
        project_id: projectId,
        scenes,
      });
      if (res.data?.scenes) {
        setLocalScenes(res.data.scenes.sort((a, b) => a.scene_number - b.scene_number));
        setInitialized(true);
        queryClient.invalidateQueries({ queryKey: ['storyboard-scenes', projectId] });
        toast.success(`Storyboard initialized with ${res.data.scene_count} scenes!`);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to initialize storyboard.');
    }
    setInitializing(false);
  }, [blueprintOutput, projectId, globalAspect, queryClient]);

  // Auto-init if we have blueprint output but no DB scenes yet
  useEffect(() => {
    if (providerLoaded && !initialized && !loadingDb && blueprintOutput?.visual_prompt && projectId && dbScenes?.length === 0) {
      handleInitStoryboard();
    }
  }, [providerLoaded, initialized, loadingDb, blueprintOutput, projectId, dbScenes]);

  // ─── Aspect ratio handlers ──────────────────────────────────────────────────
  const handleGlobalAspect = async (ratio) => {
    setGlobalAspect(ratio);
    const updated = localScenes.map(s => ({ ...s, aspect_ratio: ratio }));
    setLocalScenes(updated);
    // Persist each scene
    for (const s of localScenes) {
      await base44.entities.StoryboardScene.update(s.id, { aspect_ratio: ratio }).catch(() => {});
    }
    toast.success(`All scenes set to ${ratio}`);
  };

  const handleAspectChange = async (sceneId, ratio) => {
    setLocalScenes(prev => prev.map(s => s.id === sceneId ? { ...s, aspect_ratio: ratio } : s));
    await base44.entities.StoryboardScene.update(sceneId, { aspect_ratio: ratio }).catch(() => {});
  };

  // ─── Prompt edit ─────────────────────────────────────────────────────────────
  const handlePromptEdit = async (sceneId, newPrompt) => {
    setLocalScenes(prev => prev.map(s => s.id === sceneId ? { ...s, visual_prompt: newPrompt } : s));
    await base44.entities.StoryboardScene.update(sceneId, { visual_prompt: newPrompt }).catch(() => {});
    toast.success('Prompt updated');
  };

  // ─── Generate / Regenerate ───────────────────────────────────────────────────
  const handleGenerate = async (scene, isRegen = false) => {
    if (!canGenerateImages) {
      toast.error('Image generation requires a paid plan. Upgrade to access storyboard images.');
      return;
    }
    if (!providerEnabled) {
      toast('Image generation provider is not configured yet.', { icon: 'ℹ️' });
      return;
    }
    setGeneratingSceneId(scene.id);
    setLocalScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: 'generating' } : s));
    try {
      const res = await base44.functions.invoke('storyboardImage', {
        action: 'generate_image',
        scene_id: scene.id,
        visual_prompt: scene.visual_prompt,
        aspect_ratio: scene.aspect_ratio || '16:9',
        is_regeneration: isRegen,
      });
      if (res.data?.error) {
        if (res.data.provider_not_configured) {
          toast('Image generation provider is not configured yet.', { icon: 'ℹ️' });
          setLocalScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: 'failed', error_message: res.data.error } : s));
        } else if (res.data.insufficient_gems) {
          toast.error(res.data.error);
          setLocalScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: 'failed', error_message: res.data.error } : s));
        } else {
          toast.error(res.data.error);
          setLocalScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: 'failed', error_message: res.data.error } : s));
        }
      } else if (res.data?.image_url) {
        setLocalScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: 'completed', image_url: res.data.image_url } : s));
        toast.success(`Scene ${scene.scene_number} generated!`);
        refetchUser();
      }
    } catch (e) {
      toast.error(e.message || 'Generation failed');
      setLocalScenes(prev => prev.map(s => s.id === scene.id ? { ...s, status: 'failed', error_message: e.message } : s));
    }
    setGeneratingSceneId(null);
  };

  // ─── Approve / Unapprove ─────────────────────────────────────────────────────
  const handleApprove = async (sceneId) => {
    await base44.functions.invoke('storyboardImage', { action: 'approve_frame', scene_id: sceneId });
    setLocalScenes(prev => prev.map(s => s.id === sceneId ? { ...s, approved: true, approved_at: new Date().toISOString() } : s));
    toast.success('Frame approved ✓');
  };

  const handleUnapprove = async (sceneId) => {
    await base44.functions.invoke('storyboardImage', { action: 'unapprove_frame', scene_id: sceneId });
    setLocalScenes(prev => prev.map(s => s.id === sceneId ? { ...s, approved: false, approved_at: null } : s));
  };

  // ─── Stats ───────────────────────────────────────────────────────────────────
  const approvedCount = localScenes.filter(s => s.approved).length;
  const completedCount = localScenes.filter(s => s.status === 'completed').length;
  const totalCount = localScenes.length;

  const isLoading = loadingDb || !providerLoaded;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/40 bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Film className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">{projectName}</h1>
                <p className="text-[10px] text-muted-foreground">Storyboard Workspace</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stats */}
            {totalCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded-md bg-secondary/60 border border-border/30">
                  {completedCount}/{totalCount} generated
                </span>
                <span className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400">
                  <Check className="w-2.5 h-2.5 inline mr-1" />{approvedCount} approved
                </span>
              </div>
            )}
            {/* Provider status */}
            <Badge className={`text-xs ${providerEnabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-secondary text-muted-foreground border-border/30'}`}>
              {providerEnabled ? '● Provider Active' : '○ Provider Not Configured'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Global controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap p-4 rounded-xl border border-border/40 bg-card/30">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Global Aspect Ratio</span>
            <div className="flex gap-1.5">
              {['16:9', '9:16', '1:1'].map(ratio => (
                <button
                  key={ratio}
                  onClick={() => handleGlobalAspect(ratio)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-all ${
                    globalAspect === ratio
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
          {!canGenerateImages && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Image generation requires a paid plan</span>
            </div>
          )}
          {!providerEnabled && providerLoaded && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image generation provider not configured yet — frames are in preview mode</span>
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading storyboard...</span>
          </div>
        )}

        {/* Empty / init state */}
        {!isLoading && localScenes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Film className="w-8 h-8 text-primary/60" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">No storyboard scenes yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {blueprintOutput?.visual_prompt
                  ? 'Initialize the storyboard to extract scene prompts from your blueprint.'
                  : 'Generate a blueprint first, then open the storyboard workspace from the output panel.'}
              </p>
            </div>
            {blueprintOutput?.visual_prompt && projectId && (
              <Button
                onClick={handleInitStoryboard}
                disabled={initializing}
                className="gap-2"
              >
                {initializing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {initializing ? 'Extracting Scenes...' : 'Initialize Storyboard'}
              </Button>
            )}
            {!projectId && blueprintOutput && (
              <p className="text-xs text-amber-400">Save your project first to enable storyboard.</p>
            )}
          </div>
        )}

        {/* Scenes grid */}
        {!isLoading && localScenes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localScenes.map((scene, i) => (
              <StoryboardCard
                key={scene.id}
                scene={scene}
                index={i}
                onGenerate={(s) => handleGenerate(s, false)}
                onRegenerate={(s) => handleGenerate(s, true)}
                onApprove={handleApprove}
                onUnapprove={handleUnapprove}
                onAspectChange={handleAspectChange}
                onPromptEdit={handlePromptEdit}
                canGenerate={canGenerateImages && gems > 0}
                gemCost={gemCost}
                providerEnabled={providerEnabled}
                isGeneratingThis={generatingSceneId === scene.id}
              />
            ))}
          </div>
        )}

        {/* Approval summary */}
        {localScenes.length > 0 && approvedCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-400">{approvedCount} of {totalCount} frames approved</p>
                <p className="text-xs text-muted-foreground">Approved frames will be used as visual anchors in future animation generation.</p>
              </div>
            </div>
            {approvedCount === totalCount && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                ✓ All frames approved
              </Badge>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}