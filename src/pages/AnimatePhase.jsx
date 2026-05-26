import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, RefreshCw, Loader2, Video as VideoIcon,
  Check, X, Link2, Sparkles, Trash2, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  projectsApi, scenesApi, sceneImagesApi, sceneVideosApi,
} from '@/lib/studio/api';
import { defaultStyleFor } from '@/lib/studio/characterExtractor';
import { useAuthReady } from '@/hooks/useAuthReady';
import QueryErrorState from '@/components/studio/QueryErrorState';
import AssetUploadButton from '@/components/studio/AssetUploadButton';

const MOCK_VIDEO_URL =
  'https://placehold.co/1280x720/0f172a/e2e8f0?text=Scene+Video+(Mock)';
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

function buildDefaultAnimationPrompt({ scene, project, image }) {
  const parts = [];
  if (scene.animation_prompt) parts.push(scene.animation_prompt);
  if (scene.story_text) parts.push(scene.story_text);
  if (scene.environment_description) parts.push(`Environment: ${scene.environment_description}`);
  if (scene.camera_direction) parts.push(`Camera: ${scene.camera_direction}`);
  if (scene.transition_to_next) parts.push(`Transition out: ${scene.transition_to_next}`);
  if (image?.prompt_used) parts.push(`Source frame: ${image.prompt_used}`);
  if (project?.style) parts.push(`Visual style: ${project.style}`);
  parts.push(defaultStyleFor(project?.project_type));
  parts.push(`Duration: ${scene.duration_seconds ?? 6}s. Smooth cinematic camera, gentle character motion.`);
  return parts.filter(Boolean).join('\n');
}

function statusBadge(record) {
  if (!record) {
    return <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Missing</span>;
  }
  if (record.approval_status === 'approved') {
    return <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Approved</span>;
  }
  return <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Draft</span>;
}

function VideoPreview({ url, posterUrl, provider }) {
  if (!url) {
    return (
      <div className="aspect-video rounded-xl bg-secondary/40 border border-border/40 flex flex-col items-center justify-center text-muted-foreground/70">
        <VideoIcon className="w-8 h-8 mb-1" />
        <span className="text-xs">No video yet</span>
      </div>
    );
  }
  const isPlayable = VIDEO_EXT_RE.test(url);
  if (isPlayable) {
    return (
      <video
        src={url}
        poster={posterUrl || undefined}
        controls
        className="w-full aspect-video rounded-xl bg-black object-cover border border-border/40"
      />
    );
  }
  // Mock placeholder or non-playable URL — show poster with label
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden border border-border/40 bg-secondary/40">
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" className="w-full h-full object-cover opacity-80" />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center bg-background/40">
        <div className="text-center">
          <VideoIcon className="w-7 h-7 mx-auto text-foreground/70" />
          <p className="text-xs mt-1 text-foreground/80">
            {provider === 'mock' ? 'Mock video placeholder' : 'Video link'}
          </p>
          {provider !== 'mock' && (
            <a href={url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline break-all px-2">
              {url}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SceneVideoCard({
  scene, image, record, project, projectId,
  onSaveRecord, onApprove, onUnapprove, onDelete,
}) {
  const [prompt, setPrompt] = useState(
    record?.prompt_used || buildDefaultAnimationPrompt({ scene, project, image })
  );
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (record?.prompt_used) setPrompt(record.prompt_used);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, record?.prompt_used]);

  const savePrompt = async () => {
    setBusy('prompt');
    try {
      await onSaveRecord({
        scene_id: scene.id,
        image_id: image.id,
        prompt_used: prompt,
        video_url: record?.video_url ?? null,
        provider: record?.provider || 'manual',
        duration_seconds: scene.duration_seconds ?? 6,
      });
      setEditing(false);
    } finally { setBusy(null); }
  };

  const addUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setBusy('url');
    try {
      await onSaveRecord({
        scene_id: scene.id,
        image_id: image.id,
        prompt_used: prompt,
        video_url: url,
        provider: 'manual',
        duration_seconds: scene.duration_seconds ?? 6,
      });
      setUrlInput('');
      setShowUrl(false);
    } finally { setBusy(null); }
  };

  const addMock = async () => {
    setBusy('mock');
    try {
      await onSaveRecord({
        scene_id: scene.id,
        image_id: image.id,
        prompt_used: prompt,
        video_url: MOCK_VIDEO_URL,
        provider: 'mock',
        duration_seconds: scene.duration_seconds ?? 6,
      });
    } finally { setBusy(null); }
  };

  const approve = async () => {
    if (!record?.video_url || !record?.prompt_used) return;
    setBusy('approve');
    try { await onApprove(record.id); } finally { setBusy(null); }
  };
  const unapprove = async () => {
    if (!record) return;
    setBusy('unapprove');
    try { await onUnapprove(record.id); } finally { setBusy(null); }
  };
  const remove = async () => {
    if (!record) return;
    if (!confirm('Delete this video record?')) return;
    setBusy('delete');
    try { await onDelete(record.id); } finally { setBusy(null); }
  };

  const isApproved = record?.approval_status === 'approved';
  const canApprove = !!(record?.video_url && record?.prompt_used) && !isApproved;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border/40">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              #{scene.scene_number}
            </span>
            <h3 className="text-sm font-semibold text-foreground truncate">
              {scene.scene_title || `Scene ${scene.scene_number}`}
            </h3>
            {statusBadge(record)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {scene.duration_seconds ?? 6}s
            {scene.camera_direction ? ` · ${scene.camera_direction}` : ''}
            {scene.transition_to_next ? ` · → ${scene.transition_to_next}` : ''}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 p-4">
        {/* Left: image + video preview */}
        <div className="space-y-2">
          <div className="aspect-video rounded-xl bg-secondary/40 border border-border/40 overflow-hidden">
            {image?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/70 text-xs">
                No image
              </div>
            )}
          </div>
          <VideoPreview
            url={record?.video_url}
            posterUrl={image?.image_url}
            provider={record?.provider}
          />
        </div>

        {/* Right: prompt + actions */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Animation Prompt
            </label>
            {!editing ? (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            ) : (
              <Button size="sm" className="h-7 gap-1 text-xs" disabled={busy === 'prompt'} onClick={savePrompt}>
                {busy === 'prompt' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </Button>
            )}
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            readOnly={!editing}
            rows={8}
            className="text-xs font-mono resize-none"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {!showUrl ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowUrl(true)}>
                <Link2 className="w-3.5 h-3.5" /> Add Video URL
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Input
                  placeholder="https://...mp4"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="h-8 text-xs"
                  autoFocus
                />
                <Button size="sm" className="h-8 gap-1 text-xs" disabled={busy === 'url' || !urlInput.trim()} onClick={addUrl}>
                  {busy === 'url' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowUrl(false); setUrlInput(''); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy === 'mock'} onClick={addMock}>
              {busy === 'mock' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Use Mock Video Placeholder
            </Button>

            {!isApproved && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-600/90 text-white"
                disabled={!canApprove || busy === 'approve'}
                onClick={approve}
                title={!canApprove ? 'Add a video URL or mock placeholder first' : 'Approve video'}
              >
                {busy === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approve Video
              </Button>
            )}
            {isApproved && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy === 'unapprove'} onClick={unapprove}>
                {busy === 'unapprove' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Unapprove
              </Button>
            )}
            {record && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                disabled={busy === 'delete'} onClick={remove}>
                {busy === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnimatePhase() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isReady } = useAuthReady();

  const projectQ = useQuery({
    queryKey: ['project', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await projectsApi.get(projectId);
      if (error) throw error; return data;
    },
    enabled: isReady && !!user && !!projectId,
  });
  const scenesQ = useQuery({
    queryKey: ['storyboard-scenes', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await scenesApi.listByProject(projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });
  const imagesQ = useQuery({
    queryKey: ['scene-images', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await sceneImagesApi.listByProject(projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });
  const videosQ = useQuery({
    queryKey: ['scene-videos', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await sceneVideosApi.listByProject(projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });

  const [savingAll, setSavingAll] = useState(false);

  const project = projectQ.data;
  const allScenes = scenesQ.data ?? [];
  const images = imagesQ.data ?? [];
  const videos = videosQ.data ?? [];

  const approvedImageByScene = useMemo(() => {
    const m = new Map();
    images
      .filter((i) => i.approval_status === 'approved' && i.image_url)
      .forEach((i) => { if (!m.has(i.scene_id)) m.set(i.scene_id, i); });
    return m;
  }, [images]);

  const eligibleScenes = useMemo(
    () =>
      allScenes
        .filter((s) => approvedImageByScene.has(s.id))
        .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0)),
    [allScenes, approvedImageByScene]
  );

  const videoByScene = useMemo(() => {
    const m = new Map();
    videos.forEach((v) => { if (!m.has(v.scene_id)) m.set(v.scene_id, v); });
    return m;
  }, [videos]);

  const approvedVideoCount = videos.filter((v) => v.approval_status === 'approved').length;

  const refresh = () => {
    scenesQ.refetch();
    imagesQ.refetch();
    videosQ.refetch();
  };

  const upsertRecord = async (payload) => {
    const existing = videoByScene.get(payload.scene_id);
    try {
      if (existing) {
        const { error } = await sceneVideosApi.update(existing.id, payload);
        if (error) throw error;
      } else {
        const { error } = await sceneVideosApi.create({
          project_id: projectId,
          approval_status: 'pending',
          ...payload,
        });
        if (error) throw error;
      }
      await videosQ.refetch();
    } catch (e) {
      toast({ title: 'Save failed', description: e?.message || 'Try again', variant: 'destructive' });
      throw e;
    }
  };

  const approve = async (id) => {
    try {
      const { error } = await sceneVideosApi.approve(id);
      if (error) throw error;
      await videosQ.refetch();
      toast({ title: 'Video approved' });
    } catch (e) {
      toast({ title: 'Approve failed', description: e?.message, variant: 'destructive' });
    }
  };
  const unapprove = async (id) => {
    try {
      const { error } = await sceneVideosApi.unapprove(id);
      if (error) throw error;
      await videosQ.refetch();
    } catch (e) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
  };
  const removeRec = async (id) => {
    try {
      const { error } = await sceneVideosApi.remove(id);
      if (error) throw error;
      await videosQ.refetch();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };

  const handleSaveAll = async () => {
    const missing = eligibleScenes.filter((s) => !videoByScene.get(s.id));
    if (missing.length === 0) {
      toast({ title: 'Nothing to save', description: 'Each approved scene already has a video record.' });
      return;
    }
    setSavingAll(true);
    let ok = 0, fail = 0;
    try {
      for (const s of missing) {
        try {
          const image = approvedImageByScene.get(s.id);
          const { error } = await sceneVideosApi.create({
            project_id: projectId,
            scene_id: s.id,
            image_id: image?.id ?? null,
            prompt_used: buildDefaultAnimationPrompt({ scene: s, project, image }),
            video_url: null,
            provider: 'manual',
            duration_seconds: s.duration_seconds ?? 6,
            approval_status: 'pending',
          });
          if (error) throw error;
          ok++;
        } catch { fail++; }
      }
      await videosQ.refetch();
      toast({
        title: fail ? `Saved ${ok}, ${fail} failed` : `Initialized ${ok} draft${ok === 1 ? '' : 's'}`,
        variant: fail ? 'destructive' : 'default',
      });
    } finally {
      setSavingAll(false);
    }
  };

  const showInitialLoader =
    !isReady ||
    (projectQ.isLoading && !projectQ.data) ||
    (scenesQ.isLoading && !scenesQ.data) ||
    (imagesQ.isLoading && !imagesQ.data) ||
    (videosQ.isLoading && !videosQ.data);

  if (showInitialLoader) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const anyError = projectQ.error || scenesQ.error || imagesQ.error || videosQ.error;
  if (anyError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <QueryErrorState
          title="Could not load Animate"
          message={anyError.message || 'Something went wrong.'}
          onRetry={refresh}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate(`/project/${projectId}`)}
            className="gap-1.5 text-muted-foreground hover:text-foreground mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Phase 4</p>
          <h1 className="text-xl font-semibold text-foreground truncate">
            {project?.title || 'Project'} · Animate
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create or approve scene videos from approved images. No external APIs are called.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={refresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          {eligibleScenes.length > 0 && (
            <Button size="sm" className="h-8 gap-1.5" disabled={savingAll} onClick={handleSaveAll}>
              {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save All
            </Button>
          )}
        </div>
      </div>

      {eligibleScenes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-10 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <VideoIcon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No approved images yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Approve images before animating scenes.
          </p>
          <Button size="sm" onClick={() => navigate(`/project/${projectId}/images`)} className="gap-1.5">
            Back to Images <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {eligibleScenes.length} scene{eligibleScenes.length === 1 ? '' : 's'} with approved images ·{' '}
              <span className={approvedVideoCount > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {approvedVideoCount > 0
                  ? `${approvedVideoCount} approved video${approvedVideoCount === 1 ? '' : 's'} ready for Audio`
                  : '0 approved videos — approve at least one to continue'}
              </span>
            </p>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              disabled={approvedVideoCount === 0}
              onClick={() => navigate(`/project/${projectId}/audio`)}
              title={approvedVideoCount === 0 ? 'Approve at least one video first' : 'Continue to Audio'}
            >
              Continue to Audio <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            {eligibleScenes.map((scene) => (
              <SceneVideoCard
                key={scene.id}
                scene={scene}
                image={approvedImageByScene.get(scene.id)}
                record={videoByScene.get(scene.id)}
                project={project}
                onSaveRecord={upsertRecord}
                onApprove={approve}
                onUnapprove={unapprove}
                onDelete={removeRec}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
