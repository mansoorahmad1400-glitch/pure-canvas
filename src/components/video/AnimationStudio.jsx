import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Video, Film, Clock, Gem, CheckCircle2, AlertCircle, Loader2,
  Sparkles, RotateCcw, Play, Pause, Settings2, Link2, ArrowRight,
  ChevronDown, ChevronUp, Lock, Eye, Wand2, RefreshCw
} from 'lucide-react';
import SceneAnimationCard from './SceneAnimationCard';

const BATCH_LIMITS = { free: 0, starter: 0, premium: 5, elite: 20, admin: 99 };

export default function AnimationStudio({ project, user, isAdmin, onComplete }) {
  const [status, setStatus] = useState(null);
  const [storyScenes, setStoryScenes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [approvedImages, setApprovedImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedScenes, setSelectedScenes] = useState([]);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [statusRes, scenesRes, jobsRes, imgRes] = await Promise.all([
        base44.functions.invoke('videoPipeline', { action: 'get_status' }),
        base44.entities.StoryboardDirectorScene.filter({ project_id: project.id }),
        base44.functions.invoke('videoPipeline', { action: 'get_jobs', project_id: project.id }),
        base44.functions.invoke('videoPipeline', { action: 'get_approved_images', project_id: project.id }),
      ]);
      setStatus(statusRes.data);

      const approved = (scenesRes || []).filter(s => s.approved).sort((a, b) => a.scene_number - b.scene_number);
      const allScenes = (scenesRes || []).sort((a, b) => a.scene_number - b.scene_number);
      setStoryScenes(approved.length > 0 ? approved : allScenes);

      setJobs(jobsRes.data?.jobs || []);

      const imgMap = {};
      for (const img of (imgRes.data?.approved_images || [])) {
        imgMap[img.scene_number] = img;
      }
      setApprovedImages(imgMap);
    } catch (e) {
      toast.error(e.message || 'Failed to load Animation Studio');
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (params) => {
    setSubmitting(params.scene_number);
    try {
      const res = await base44.functions.invoke('videoPipeline', {
        action: 'submit_job',
        project_id: project.id,
        ...params,
      });
      if (res.data?.success) {
        toast.success(`Scene ${params.scene_number} queued — ${res.data.gems_deducted} 💎`);
        await load();
      } else {
        toast.error(res.data?.error || 'Failed to submit');
      }
    } catch (e) {
      const d = e?.response?.data;
      if (d?.plan_gate) toast.error('Video requires Creator Pro or higher.');
      else if (d?.insufficient_gems) toast.error(d.error || 'Not enough gems.');
      else if (d?.provider_not_configured) toast.error('Video provider not configured yet.');
      else toast.error(d?.error || e.message || 'Submission failed');
    }
    setSubmitting(null);
  };

  const handleCancel = async (jobId) => {
    try {
      const res = await base44.functions.invoke('videoPipeline', { action: 'cancel_job', job_id: jobId });
      if (res.data?.success) {
        toast.success(`Cancelled${res.data.refunded ? ` · ${res.data.refunded} 💎 refunded` : ''}`);
        await load();
      }
    } catch (e) {
      toast.error(e.message || 'Failed to cancel');
    }
  };

  const handleBatchSubmit = async () => {
    const planRole = (user?.role || 'free').toLowerCase();
    const limit = isAdmin ? 99 : (BATCH_LIMITS[planRole] ?? 0);
    const toProcess = selectedScenes.slice(0, limit);

    for (const sceneNum of toProcess) {
      const scene = storyScenes.find(s => s.scene_number === sceneNum);
      if (!scene) continue;
      const approvedImg = approvedImages[sceneNum];
      if (!approvedImg) continue;

      await handleSubmit({
        scene_number: sceneNum,
        anchor_image_url: approvedImg.image_url,
        motion_prompt: `Smooth cinematic motion for scene ${sceneNum}`,
        transition_directive: 'Natural dissolve',
        resolution: '480p',
        duration: 6,
      });
    }
    toast.success(`Batch submitted for ${toProcess.length} scenes`);
    setBatchMode(false);
    setSelectedScenes([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const providerConfigured = status?.provider_configured ?? false;
  const planAccess = status?.plan_access ?? false;
  const gemCosts = status?.gem_costs ?? {};
  const userBalance = status?.user_balance ?? 0;
  const activeProvider = status?.active_provider;

  const jobByScene = {};
  jobs.forEach(j => { jobByScene[j.scene_number] = j; });

  const approvedCount = storyScenes.filter(s => {
    const job = jobByScene[s.scene_number];
    return job?.status === 'completed' && job?.video_url;
  }).length;
  const totalScenes = storyScenes.length;
  const allApproved = totalScenes > 0 && approvedCount === totalScenes;

  const planRole = (user?.role || 'free').toLowerCase();
  const batchLimit = isAdmin ? 99 : (BATCH_LIMITS[planRole] ?? 0);
  const canBatch = batchLimit > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center">
              <Video className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-base font-bold text-foreground">Animation Studio</h2>
          </div>
          <p className="text-xs text-muted-foreground pl-10">
            {totalScenes} scene{totalScenes !== 1 ? 's' : ''} · {approvedCount} animated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{userBalance} 💎</span>
          {canBatch && totalScenes > 1 && (
            <Button
              size="sm" variant="outline"
              onClick={() => setBatchMode(true)}
              className="h-7 text-[11px] gap-1 border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
            >
              <Film className="w-3 h-3" /> Batch
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
          { label: 'Scenes', value: totalScenes, color: 'text-sky-400', icon: Film },
          { label: 'Animated', value: approvedCount, color: 'text-green-400', icon: CheckCircle2 },
          { label: 'Provider', value: activeProvider ? activeProvider.replace('_', ' ').toUpperCase() : 'None', color: providerConfigured ? 'text-emerald-400' : 'text-muted-foreground', icon: Settings2 },
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
          Video provider not configured yet. No gems will be deducted.
        </div>
      )}

      {/* Plan access notice */}
      {providerConfigured && !planAccess && !isAdmin && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          Video animation requires Creator Pro or Studio Elite plan.
        </div>
      )}

      {/* No scenes */}
      {totalScenes === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
            <Video className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No storyboard scenes yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Complete Storyboard Director and approve scenes first.
            </p>
          </div>
        </div>
      )}

      {/* Scene cards */}
      {totalScenes > 0 && (
        <div className="space-y-3">
          {storyScenes.map(scene => (
            <SceneAnimationCard
              key={scene.id || scene.scene_number}
              scene={scene}
              job={jobByScene[scene.scene_number] || null}
              approvedImage={approvedImages[scene.scene_number] || null}
              gemCosts={gemCosts}
              providerConfigured={providerConfigured}
              planAccess={planAccess || isAdmin}
              userBalance={userBalance}
              projectId={project?.id}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitting={submitting === scene.scene_number}
              isSelected={selectedScenes.includes(scene.scene_number)}
              onToggleSelect={(checked) => {
                if (checked) setSelectedScenes(prev => [...prev, scene.scene_number]);
                else setSelectedScenes(prev => prev.filter(n => n !== scene.scene_number));
              }}
              showSelect={batchMode}
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
          <p className="text-sm font-semibold text-foreground">All scenes animated!</p>
          <p className="text-xs text-muted-foreground">Ready to continue to Audio Studio.</p>
          <Button onClick={onComplete} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            Continue to Audio <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}