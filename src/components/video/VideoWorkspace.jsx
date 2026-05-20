import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, VideoIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoProviderBanner from './VideoProviderBanner';
import SceneAnimationCard from './SceneAnimationCard';

export default function VideoWorkspace({ project, user, isAdmin }) {
  const [status, setStatus] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [approvedImages, setApprovedImages] = useState({}); // keyed by scene_number
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [statusRes, scenesRes, jobsRes, imgRes] = await Promise.all([
        base44.functions.invoke('videoPipeline', { action: 'get_status' }),
        base44.entities.StoryboardScene.filter({ project_id: project.id }),
        base44.functions.invoke('videoPipeline', { action: 'get_jobs', project_id: project.id }),
        base44.functions.invoke('videoPipeline', { action: 'get_approved_images', project_id: project.id }),
      ]);
      setStatus(statusRes.data);
      setScenes((scenesRes || []).sort((a, b) => a.scene_number - b.scene_number));
      setJobs(jobsRes.data?.jobs || []);
      // Build lookup: scene_number → approved image record
      const imgMap = {};
      for (const img of (imgRes.data?.approved_images || [])) {
        imgMap[img.scene_number] = img;
      }
      setApprovedImages(imgMap);
    } catch (e) {
      toast.error(e.message || 'Failed to load video workspace');
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
        toast.success(`Scene ${params.scene_number} queued — ${res.data.gems_deducted} 💎 deducted`);
        // Refresh jobs and status (balance changed)
        await load();
      } else {
        // Handle Grok unavailability
        if (res.data?.grok_unavailable) {
          toast.error('Grok Video is not available for this API key yet. Please choose another provider.');
        } else {
          toast.error(res.data?.error || 'Failed to submit job');
        }
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Submission failed';
      if (e?.response?.data?.plan_gate) toast.error('Video requires Creator Pro or higher.');
      else if (e?.response?.data?.insufficient_gems) toast.error(msg);
      else if (e?.response?.data?.provider_not_configured) toast.error('No video provider configured yet.');
      else if (e?.response?.data?.grok_unavailable) toast.error('Grok Video is not available for this API key yet. Please choose another provider (Replicate, Runway, Kling, Pika, Luma).');
      else toast.error(msg);
    }
    setSubmitting(null);
  };

  const handleCancel = async (jobId) => {
    try {
      const res = await base44.functions.invoke('videoPipeline', { action: 'cancel_job', job_id: jobId });
      if (res.data?.success) {
        toast.success(`Job cancelled${res.data.refunded ? ` · ${res.data.refunded} 💎 refunded` : ''}`);
        await load();
      }
    } catch (e) {
      toast.error(e.message || 'Failed to cancel job');
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
  const planAccess = status?.plan_access ?? false;
  const gemCosts = status?.gem_costs ?? {};
  const userBalance = status?.user_balance ?? 0;

  // Map jobs by scene_number for quick lookup
  const jobByScene = {};
  jobs.forEach(j => { jobByScene[j.scene_number] = j; });

  // Only show scenes that have storyboard data
  const hasScenes = scenes.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Animation Pipeline</h3>
          {hasScenes && (
            <span className="text-xs text-muted-foreground">
              {scenes.filter(s => s.approved).length}/{scenes.length} frames approved
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

      {/* Provider / Plan Banner */}
      <VideoProviderBanner
        providerConfigured={providerConfigured}
        activeProvider={status?.active_provider}
        planAccess={planAccess}
        isAdmin={isAdmin}
        providerTests={status?.provider_tests}
      />

      {/* No storyboard scenes yet */}
      {!hasScenes && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
            <VideoIcon className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No storyboard scenes yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Generate storyboard frames in the Storyboard tab first. Once frames are approved, you can animate them here.
            </p>
          </div>
        </div>
      )}

      {/* Scene Animation Cards */}
      {hasScenes && (
        <div className="space-y-3">
          {scenes.map(scene => (
            <SceneAnimationCard
              key={scene.scene_number}
              scene={scene}
              job={jobByScene[scene.scene_number] || null}
              approvedImage={approvedImages[scene.scene_number] || null}
              gemCosts={gemCosts}
              providerConfigured={providerConfigured}
              planAccess={planAccess}
              userBalance={userBalance}
              projectId={project?.id}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitting={submitting === scene.scene_number}
            />
          ))}
        </div>
      )}
    </div>
  );
}