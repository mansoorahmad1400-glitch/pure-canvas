import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, ImageIcon, RefreshCw, Film, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImageProviderBanner from './ImageProviderBanner';
import SceneImagePanel from './SceneImagePanel';
import CharacterReadinessChecklist from './CharacterReadinessChecklist';

export default function ImageWorkspace({ project, user, isAdmin }) {
  const [status, setStatus] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [images, setImages] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null); // scene_number
  const [initializing, setInitializing] = useState(false);

  const initializeScenes = async () => {
    if (!project?.id || !project?.visual_prompt) {
      toast.error('No visual prompts available in this project.');
      return;
    }
    setInitializing(true);
    try {
      // Extract scenes from visual_prompt using the same logic as Storyboard page
      const extractScenes = (visualPrompt, defaultAspect = '16:9') => {
        const scenes = [];
        const scenePattern = /Scene\s+(\d+)\s*:?\s*([\s\S]*?)(?=Scene\s+\d+\s*:?|$)/gi;
        let match;
        while ((match = scenePattern.exec(visualPrompt)) !== null) {
          const sceneNum = parseInt(match[1]);
          const content = match[2].trim();
          if (content.length > 10) {
            scenes.push({ scene_number: sceneNum, visual_prompt: content, aspect_ratio: defaultAspect });
          }
        }
        if (scenes.length === 0 && visualPrompt.trim().length > 20) {
          scenes.push({ scene_number: 1, visual_prompt: visualPrompt.trim(), aspect_ratio: defaultAspect });
        }
        return scenes.sort((a, b) => a.scene_number - b.scene_number);
      };

      const defaultAspectForType = (projectType) => {
        const shorts = ['rhyme', 'tiktok', 'reel', 'short'];
        const square = ['social'];
        if (shorts.some(t => (projectType || '').toLowerCase().includes(t))) return '9:16';
        if (square.some(t => (projectType || '').toLowerCase().includes(t))) return '1:1';
        return '16:9';
      };

      const scenes = extractScenes(project.visual_prompt, defaultAspectForType(project.project_type));
      if (scenes.length === 0) {
        toast.error('Could not extract scenes from visual prompt.');
        setInitializing(false);
        return;
      }

      const res = await base44.functions.invoke('storyboardImage', {
        action: 'init_storyboard',
        project_id: project.id,
        scenes,
      });
      if (res.data?.scenes) {
        toast.success(`Storyboard initialized with ${res.data.scene_count} scenes!`);
        await load();
      }
    } catch (e) {
      toast.error(e.message || 'Failed to initialize storyboard');
    }
    setInitializing(false);
  };

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [statusRes, scenesRaw, imagesRes, charsRaw] = await Promise.all([
        base44.functions.invoke('imageGeneration', { action: 'get_status' }),
        base44.entities.StoryboardScene.filter({ project_id: project.id }),
        base44.functions.invoke('imageGeneration', { action: 'get_images', project_id: project.id }),
        base44.entities.ProjectCharacter.filter({ project_id: project.id }),
      ]);
      setStatus(statusRes.data);
      setScenes((scenesRaw || []).sort((a, b) => a.scene_number - b.scene_number));
      setImages(imagesRes.data?.images || []);
      setCharacters(charsRaw || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load image workspace');
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async (params) => {
    // Manual upload — directly create the image record without going through AI
    if (params.manual_image_url) {
      const newImg = {
        id: `manual-${Date.now()}`,
        project_id: project.id,
        scene_number: params.scene_number,
        image_url: params.manual_image_url,
        thumbnail_url: params.manual_image_url,
        status: 'completed',
        style_preset: 'manual_upload',
        aspect_ratio: params.aspect_ratio || '16:9',
        quality: 'standard',
        gems_cost: 0,
        approved: false,
      };
      try {
        const res = await base44.functions.invoke('imageGeneration', {
          action: 'save_manual',
          project_id: project.id,
          scene_number: params.scene_number,
          image_url: params.manual_image_url,
          aspect_ratio: params.aspect_ratio || '16:9',
        });
        if (res.data?.image) {
          setImages(prev => [...prev, res.data.image]);
        } else {
          setImages(prev => [...prev, newImg]);
        }
      } catch {
        setImages(prev => [...prev, newImg]);
      }
      return;
    }

    setGenerating(params.scene_number);
    // Optimistic placeholder so the card shows "Generating…" state immediately
    const placeholderId = `pending-${Date.now()}`;
    setImages(prev => [...prev, {
      id: placeholderId,
      project_id: project.id,
      scene_number: params.scene_number,
      status: 'generating',
      style_preset: params.style_preset,
      aspect_ratio: params.aspect_ratio,
      quality: params.quality,
    }]);
    try {
      const res = await base44.functions.invoke('imageGeneration', {
        action: 'generate',
        project_id: project.id,
        ...params,
      });
      if (res.data?.success && res.data?.image) {
        setImages(prev => prev
          .filter(i => i.id !== placeholderId)
          .concat(res.data.image)
        );
        setStatus(prev => prev ? { ...prev, user_balance: (prev.user_balance ?? 0) - (res.data.gems_deducted ?? 0) } : prev);
        toast.success(`Scene ${params.scene_number} generated — ${res.data.gems_deducted ?? 0} 💎 deducted`);
      } else {
        setImages(prev => prev.filter(i => i.id !== placeholderId));
        toast.error(res.data?.error || 'Generation failed');
      }
    } catch (e) {
      setImages(prev => prev.filter(i => i.id !== placeholderId));
      const d = e?.response?.data;
      if (d?.provider_not_configured) toast.error('Image provider not connected yet.');
      else if (d?.plan_gate) toast.error(d.error || 'Plan upgrade required.');
      else if (d?.insufficient_gems) toast.error(d.error || 'Not enough gems.');
      else toast.error(d?.error || e.message || 'Generation failed');
    }
    setGenerating(null);
  };

  const handleApprove = async (imageId) => {
    try {
      await base44.functions.invoke('imageGeneration', { action: 'approve', image_id: imageId, project_id: project.id });
      toast.success('Image approved');
      await load();
    } catch (e) { toast.error(e.message || 'Failed to approve'); }
  };

  const handleUnapprove = async (imageId) => {
    try {
      await base44.functions.invoke('imageGeneration', { action: 'unapprove', image_id: imageId });
      await load();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const handleSendToVideo = async (imageId) => {
    try {
      await base44.functions.invoke('imageGeneration', { action: 'send_to_video', image_id: imageId });
      toast.success('Image sent to video pipeline as anchor frame');
      await load();
    } catch (e) { toast.error(e?.response?.data?.error || e.message || 'Failed'); }
  };

  const handleDelete = async (imageId) => {
    try {
      await base44.functions.invoke('imageGeneration', { action: 'delete_image', image_id: imageId });
      setImages(prev => prev.filter(i => i.id !== imageId));
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const handleReplace = async (imageId, newUrl) => {
    try {
      const res = await base44.functions.invoke('imageGeneration', {
        action: 'replace_image',
        image_id: imageId,
        image_url: newUrl,
      });
      setImages(prev => prev.map(i => i.id === imageId
        ? { ...i, image_url: newUrl, thumbnail_url: newUrl, style_preset: 'manual_upload', gems_cost: 0 }
        : i
      ));
    } catch (e) {
      toast.error(e.message || 'Replace failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const providerConfigured = status?.provider_configured ?? false;
  const access = status?.access ?? { canGenerate: false, canHD: false, canUpscale: false, canConsistency: false, maxPerScene: 1, isAdmin: false };
  const costs = status?.costs ?? {};
  const userBalance = status?.user_balance ?? 0;

  // Group images by scene_number
  const imagesByScene = {};
  images.forEach(img => {
    if (!imagesByScene[img.scene_number]) imagesByScene[img.scene_number] = [];
    imagesByScene[img.scene_number].push(img);
  });

  const hasScenes = scenes.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-base font-semibold text-foreground">Image Workspace</h3>
          {hasScenes && (
            <span className="text-xs text-muted-foreground">
              {scenes.length} scene{scenes.length !== 1 ? 's' : ''} · {images.filter(i => i.approved).length} approved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{userBalance} 💎</span>
          <Button variant="ghost" size="icon" onClick={load} className="h-7 w-7">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Character Readiness Checklist */}
      <CharacterReadinessChecklist projectId={project?.id} />

      {/* Provider / Plan Banner */}
      <ImageProviderBanner
        providerConfigured={providerConfigured}
        planAccess={access}
        isAdmin={isAdmin}
      />

      {/* No scenes yet */}
      {!hasScenes && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No storyboard scenes yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              {project?.visual_prompt
                ? 'Initialize storyboard scenes from your blueprint to start generating images.'
                : 'Generate a blueprint first to create storyboard scenes.'}
            </p>
            {project?.visual_prompt && (
              <Button
                onClick={initializeScenes}
                disabled={initializing}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {initializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {initializing ? 'Initializing...' : 'Initialize Storyboard Scenes'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Scene panels */}
      {hasScenes && (
        <div className="space-y-4">
          {scenes.map(scene => (
            <SceneImagePanel
            key={scene.scene_number}
            scene={scene}
            images={imagesByScene[scene.scene_number] || []}
            characters={characters}
            project={project}
            access={access}
            costs={costs}
            providerConfigured={providerConfigured}
            userBalance={userBalance}
            onGenerate={handleGenerate}
            onApprove={handleApprove}
            onUnapprove={handleUnapprove}
            onSendToVideo={handleSendToVideo}
            onDelete={handleDelete}
            onReplace={handleReplace}
            generating={generating === scene.scene_number}
            />
          ))}
        </div>
      )}
    </div>
  );
}