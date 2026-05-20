import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Mic, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioProviderBanner from './AudioProviderBanner';
import SceneAudioPanel from './SceneAudioPanel';

export default function AudioWorkspace({ project, user, isAdmin }) {
  const [status, setStatus] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null); // { scene_number, action_type }

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [statusRes, scenesRaw, jobsRes] = await Promise.all([
        base44.functions.invoke('audioPipeline', { action: 'get_status' }),
        base44.entities.StoryboardScene.filter({ project_id: project.id }),
        base44.functions.invoke('audioPipeline', { action: 'get_jobs', project_id: project.id }),
      ]);
      setStatus(statusRes.data);
      setScenes((scenesRaw || []).sort((a, b) => a.scene_number - b.scene_number));
      setJobs(jobsRes.data?.jobs || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load audio workspace');
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async (params) => {
    setGenerating({ scene_number: params.scene_number, action_type: params.action_type });
    try {
      const res = await base44.functions.invoke('audioPipeline', {
        action: 'generate',
        project_id: project.id,
        ...params,
      });
      const d = res.data;
      if (d?.provider_not_implemented) {
        toast.info('Audio provider connected but not yet implemented — gems refunded.');
      } else if (d?.success) {
        toast.success(`Scene ${params.scene_number} audio generated — ${d.gems_deducted ?? 0} 💎 deducted`);
      } else {
        toast.error(d?.error || 'Generation failed');
      }
      await load();
    } catch (e) {
      const d = e?.response?.data;
      if (d?.provider_not_configured) toast.info('No audio provider configured yet — gems not deducted.');
      else if (d?.plan_gate) toast.error(d.error || 'Plan upgrade required.');
      else if (d?.insufficient_gems) toast.error(d.error || 'Not enough gems.');
      else toast.error(d?.error || e.message || 'Generation failed');
      await load();
    }
    setGenerating(null);
  };

  const handleUpload = async (scene_number, file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('audioPipeline', {
        action: 'attach_upload',
        project_id: project.id,
        scene_number,
        audio_url: file_url,
        prompt_text: `Uploaded: ${file.name}`,
      });
      toast.success('Audio uploaded and attached');
      await load();
    } catch (e) {
      toast.error(e.message || 'Upload failed');
    }
  };

  const handleApprove = async (jobId) => {
    try {
      await base44.functions.invoke('audioPipeline', { action: 'approve', job_id: jobId });
      toast.success('Audio approved');
      await load();
    } catch (e) { toast.error(e.message); }
  };

  const handleUnapprove = async (jobId) => {
    try {
      await base44.functions.invoke('audioPipeline', { action: 'unapprove', job_id: jobId });
      await load();
    } catch (e) { toast.error(e.message); }
  };

  const handleSendToExport = async (jobId) => {
    try {
      await base44.functions.invoke('audioPipeline', { action: 'send_to_export', job_id: jobId });
      toast.success('Audio sent to export queue');
      await load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (jobId) => {
    try {
      await base44.functions.invoke('audioPipeline', { action: 'delete_job', job_id: jobId });
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (e) { toast.error(e.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const voiceConfigured  = status?.voice_configured ?? false;
  const musicConfigured  = status?.music_configured ?? false;
  const sfxConfigured    = status?.sfx_configured   ?? false;
  const access           = status?.access ?? {};
  const costs            = status?.costs  ?? {};
  const userBalance      = status?.user_balance ?? 0;
  const projectLanguages = project?.languages || ['en'];
  const hasScenes        = scenes.length > 0;

  // Group jobs by scene
  const jobsByScene = {};
  jobs.forEach(j => {
    if (!jobsByScene[j.scene_number]) jobsByScene[j.scene_number] = [];
    jobsByScene[j.scene_number].push(j);
  });

  const approvedCount = jobs.filter(j => j.approved).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-semibold text-foreground">Audio Workspace</h3>
          {hasScenes && (
            <span className="text-xs text-muted-foreground">
              {scenes.length} scene{scenes.length !== 1 ? 's' : ''} · {approvedCount} approved
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

      {/* Provider / plan banner */}
      <AudioProviderBanner
        voiceConfigured={voiceConfigured}
        musicConfigured={musicConfigured}
        planAccess={access}
        isAdmin={isAdmin}
      />

      {/* No scenes */}
      {!hasScenes && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
            <Mic className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No storyboard scenes yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Initialize scenes from the Storyboard tab first, then return here to generate audio.
            </p>
          </div>
        </div>
      )}

      {/* Scene panels */}
      {hasScenes && (
        <div className="space-y-4">
          {scenes.map(scene => (
            <SceneAudioPanel
              key={scene.scene_number}
              scene={scene}
              jobs={jobsByScene[scene.scene_number] || []}
              access={access}
              costs={costs}
              voiceConfigured={voiceConfigured}
              musicConfigured={musicConfigured}
              sfxConfigured={sfxConfigured}
              userBalance={userBalance}
              projectLanguages={projectLanguages}
              onGenerate={handleGenerate}
              onApprove={handleApprove}
              onUnapprove={handleUnapprove}
              onSendToExport={handleSendToExport}
              onDelete={handleDelete}
              onUpload={handleUpload}
              generating={
                generating?.scene_number === scene.scene_number ? generating.action_type : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}