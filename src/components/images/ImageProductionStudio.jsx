import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ImageIcon, RefreshCw, Sparkles, Loader2, AlertCircle,
  Clapperboard, CheckCircle2, Gem, Users, MapPin, Palette,
  ArrowRight, ZapIcon, LayoutGrid
} from 'lucide-react';
import ImageProductionCard from './ImageProductionCard';
import BatchGenerationPanel from './BatchGenerationPanel';

const BATCH_LIMITS = {
  free:    0,
  starter: 3,
  premium: 8,
  elite:   99,
  admin:   99,
};

export default function ImageProductionStudio({ project, user, isAdmin, onComplete }) {
  const [status, setStatus]           = useState(null);
  const [storyScenes, setStoryScenes] = useState([]);   // approved StoryboardDirectorScenes
  const [images, setImages]           = useState([]);
  const [characters, setCharacters]   = useState([]);
  const [locations, setLocations]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(null); // scene_number being generated
  const [batchMode, setBatchMode]     = useState(false);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [statusRes, directorScenes, imagesRes, chars, locs] = await Promise.all([
        base44.functions.invoke('imageGeneration', { action: 'get_status' }),
        base44.entities.StoryboardDirectorScene.filter({ project_id: project.id }),
        base44.functions.invoke('imageGeneration', { action: 'get_images', project_id: project.id }),
        base44.entities.ProjectCharacter.filter({ project_id: project.id }),
        base44.entities.WorldLocation.filter({ project_id: project.id }),
      ]);

      setStatus(statusRes.data);

      // Use approved director scenes; fall back to all if none approved
      const approved = (directorScenes || [])
        .filter(s => s.approved)
        .sort((a, b) => a.scene_number - b.scene_number);
      const allScenes = (directorScenes || [])
        .sort((a, b) => a.scene_number - b.scene_number);

      setStoryScenes(approved.length > 0 ? approved : allScenes);
      setImages(imagesRes.data?.images || []);
      setCharacters(chars || []);
      setLocations(locs || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load Image Production Studio');
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async (params) => {
    if (params.manual_image_url) {
      try {
        const res = await base44.functions.invoke('imageGeneration', {
          action: 'save_manual',
          project_id: project.id,
          scene_number: params.scene_number,
          image_url: params.manual_image_url,
          aspect_ratio: params.aspect_ratio || '16:9',
        });
        if (res.data?.image) setImages(prev => [...prev, res.data.image]);
      } catch (e) {
        toast.error(e.message || 'Upload failed');
      }
      return;
    }

    setGenerating(params.scene_number);
    const placeholderId = `pending-${Date.now()}`;
    setImages(prev => [...prev, {
      id: placeholderId, project_id: project.id,
      scene_number: params.scene_number, status: 'generating',
      style_preset: params.style_preset, aspect_ratio: params.aspect_ratio,
    }]);
    try {
      const res = await base44.functions.invoke('imageGeneration', {
        action: 'generate', project_id: project.id, ...params,
      });
      if (res.data?.success && res.data?.image) {
        setImages(prev => prev.filter(i => i.id !== placeholderId).concat(res.data.image));
        setStatus(prev => prev ? {
          ...prev, user_balance: (prev.user_balance ?? 0) - (res.data.gems_deducted ?? 0)
        } : prev);
        toast.success(`Scene ${params.scene_number} generated — ${res.data.gems_deducted ?? 0} 💎`);
      } else {
        setImages(prev => prev.filter(i => i.id !== placeholderId));
        toast.error(res.data?.error || 'Generation failed');
      }
    } catch (e) {
      setImages(prev => prev.filter(i => i.id !== placeholderId));
      const d = e?.response?.data;
      if (d?.provider_not_configured) toast.error('Image provider not connected yet.');
      else if (d?.plan_gate)          toast.error(d.error || 'Plan upgrade required.');
      else if (d?.insufficient_gems)  toast.error(d.error || 'Not enough gems.');
      else toast.error(d?.error || e.message || 'Generation failed');
    }
    setGenerating(null);
  };

  const handleBatchGenerate = async (sceneNumbers, params) => {
    const planRole = (user?.role || 'free').toLowerCase();
    const limit = isAdmin ? 99 : (BATCH_LIMITS[planRole] ?? 0);
    const toGenerate = sceneNumbers.slice(0, limit);

    for (const sceneNum of toGenerate) {
      const scene = storyScenes.find(s => s.scene_number === sceneNum);
      if (!scene) continue;
      await handleGenerate({ ...params, scene_number: sceneNum, base_prompt: scene.visual_prompt || '' });
    }
    toast.success(`Batch generation complete for ${toGenerate.length} scenes`);
    setBatchMode(false);
  };

  const handleApprove = async (imageId) => {
    try {
      await base44.functions.invoke('imageGeneration', { action: 'approve', image_id: imageId, project_id: project.id });
      toast.success('Frame approved ✓');
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
      toast.success('Sent to Animation Studio');
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
      await base44.functions.invoke('imageGeneration', { action: 'replace_image', image_id: imageId, image_url: newUrl });
      setImages(prev => prev.map(i => i.id === imageId
        ? { ...i, image_url: newUrl, thumbnail_url: newUrl, style_preset: 'manual_upload' } : i));
    } catch (e) { toast.error(e.message || 'Replace failed'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const providerConfigured = status?.provider_configured ?? false;
  const access = status?.access ?? { canGenerate: false, canHD: false, canConsistency: false, maxPerScene: 1, isAdmin: false };
  const costs = status?.costs ?? {};
  const userBalance = status?.user_balance ?? 0;

  // group images by scene
  const imagesByScene = {};
  images.forEach(img => {
    if (!imagesByScene[img.scene_number]) imagesByScene[img.scene_number] = [];
    imagesByScene[img.scene_number].push(img);
  });

  const approvedCount = images.filter(i => i.approved).length;
  const totalScenes   = storyScenes.length;
  const generatedScenes = storyScenes.filter(s => (imagesByScene[s.scene_number] || []).some(i => i.status === 'completed')).length;
  const approvedScenes  = storyScenes.filter(s => (imagesByScene[s.scene_number] || []).some(i => i.approved)).length;

  const planRole = (user?.role || 'free').toLowerCase();
  const batchLimit = isAdmin ? 99 : (BATCH_LIMITS[planRole] ?? 0);
  const canBatch = batchLimit > 0;

  const allApproved = totalScenes > 0 && approvedScenes === totalScenes;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-base font-bold text-foreground">Image Production Studio</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-10">
            {totalScenes} scene{totalScenes !== 1 ? 's' : ''} from Storyboard Director
            {' · '}{generatedScenes} generated · {approvedScenes} approved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{userBalance} 💎</span>
          {canBatch && (
            <Button
              size="sm" variant="outline"
              onClick={() => setBatchMode(true)}
              className="h-7 text-[11px] gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <ZapIcon className="w-3 h-3" /> Batch Generate
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={load} className="h-7 w-7">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Scenes',    value: totalScenes,     color: 'text-purple-400',   icon: Clapperboard },
          { label: 'Generated', value: generatedScenes, color: 'text-sky-400',      icon: ImageIcon },
          { label: 'Approved',  value: approvedScenes,  color: 'text-green-400',    icon: CheckCircle2 },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border/30 bg-card/40 px-3 py-2.5 text-center">
            <stat.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${stat.color}`} />
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Provider notice */}
      {!providerConfigured && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Image provider not configured yet. No gems will be deducted.
        </div>
      )}

      {/* Plan access notice */}
      {providerConfigured && !access.canGenerate && !access.isAdmin && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Image generation requires a paid plan. Upgrade to Starter or higher.
        </div>
      )}

      {/* No scenes */}
      {totalScenes === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No storyboard scenes found</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Complete the Storyboard Director phase first and approve your scenes.
            </p>
          </div>
        </div>
      )}

      {/* Batch panel */}
      <AnimatePresence>
        {batchMode && (
          <BatchGenerationPanel
            scenes={storyScenes}
            batchLimit={batchLimit}
            costs={costs}
            access={access}
            userBalance={userBalance}
            project={project}
            providerConfigured={providerConfigured}
            onBatchGenerate={handleBatchGenerate}
            onClose={() => setBatchMode(false)}
          />
        )}
      </AnimatePresence>

      {/* Scene cards */}
      {totalScenes > 0 && (
        <div className="space-y-4">
          {storyScenes.map(scene => (
            <ImageProductionCard
              key={scene.id || scene.scene_number}
              scene={scene}
              images={imagesByScene[scene.scene_number] || []}
              characters={characters}
              locations={locations}
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

      {/* Completion CTA */}
      {allApproved && onComplete && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-6 rounded-2xl border border-green-500/25 bg-green-500/5"
        >
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <p className="text-sm font-semibold text-foreground">All scenes approved!</p>
          <p className="text-xs text-muted-foreground">Ready to continue to Animation Studio.</p>
          <Button onClick={onComplete} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            Continue to Animation <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}