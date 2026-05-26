import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Save, Send, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  projectsApi,
  scenesApi,
  sceneImagesApi,
  sceneVideosApi,
  audioAssetsApi,
  exportsApi,
} from '@/lib/studio/api';

// ---------- inclusion logic ----------
function summarizeAudio(assets) {
  if (!assets || assets.length === 0) return 'silent';
  const types = new Set(assets.map((a) => a.asset_type).filter(Boolean));
  if (types.size === 0) return 'audio';
  return [...types].join(' + ');
}

function buildTimeline({ scenes, images, videos, audio }) {
  const approvedImagesBy = new Map();
  for (const i of images) {
    if (i.approval_status === 'approved' && i.image_url) {
      if (!approvedImagesBy.has(i.scene_id)) approvedImagesBy.set(i.scene_id, i);
    }
  }
  const approvedVideosBy = new Map();
  for (const v of videos) {
    if (v.approval_status === 'approved' && v.video_url) {
      if (!approvedVideosBy.has(v.scene_id)) approvedVideosBy.set(v.scene_id, v);
    }
  }
  const approvedAudioBy = new Map();
  for (const a of audio) {
    if (a.approval_status === 'approved' && a.scene_id) {
      const arr = approvedAudioBy.get(a.scene_id) ?? [];
      arr.push(a);
      approvedAudioBy.set(a.scene_id, arr);
    }
  }

  const included = [];
  const excluded = [];

  const sorted = [...scenes].sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0));
  for (const s of sorted) {
    if (!s || !s.id) {
      excluded.push({ scene_id: s?.id, scene_number: s?.scene_number, reason: 'deleted or invalid scene' });
      continue;
    }
    const img = approvedImagesBy.get(s.id);
    const vid = approvedVideosBy.get(s.id);
    const auds = approvedAudioBy.get(s.id) ?? [];
    const isSilent = (s.audio_mode === 'silent') && auds.length > 0;
    const hasAudio = auds.length > 0;

    if (!img) {
      excluded.push({ scene_id: s.id, scene_number: s.scene_number, reason: 'no approved image' });
      continue;
    }
    if (!vid) {
      excluded.push({ scene_id: s.id, scene_number: s.scene_number, reason: 'no approved video' });
      continue;
    }
    if (!hasAudio && !isSilent) {
      excluded.push({ scene_id: s.id, scene_number: s.scene_number, reason: 'no approved audio (or silent)' });
      continue;
    }
    included.push({
      scene_id: s.id,
      scene_number: s.scene_number,
      scene_title: s.scene_title || `Scene ${s.scene_number}`,
      duration_seconds: s.duration_seconds ?? 6,
      video_url: vid.video_url,
      audio_asset_ids: auds.map((a) => a.id),
      audio_url: auds.find((a) => a.audio_url)?.audio_url ?? null,
      audio_mode: s.audio_mode || (isSilent ? 'silent' : 'layered'),
      audio_summary: isSilent && !auds.some((a) => a.audio_url) ? 'silent' : summarizeAudio(auds),
    });
  }
  return { included, excluded };
}

// ---------- preview player ----------
function PreviewPlayer({ included }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [included.length]);
  if (included.length === 0) return null;
  const scene = included[idx];
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-foreground">
          Preview · Scene {scene.scene_number} / {included.length}
        </div>
        <Badge variant="outline" className="text-[10px]">Preview only — not a final MP4 render</Badge>
      </div>
      <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center mb-3">
        {scene.video_url ? (
          <video key={scene.scene_id} src={scene.video_url} controls className="w-full h-full" />
        ) : (
          <div className="text-muted-foreground text-sm">No video</div>
        )}
      </div>
      {scene.audio_url && (
        <audio src={scene.audio_url} controls className="w-full mb-3" />
      )}
      <div className="flex justify-between gap-2">
        <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
          Previous
        </Button>
        <div className="text-xs text-muted-foreground self-center">{scene.scene_title} · {scene.duration_seconds}s · {scene.audio_summary}</div>
        <Button variant="outline" size="sm" disabled={idx >= included.length - 1} onClick={() => setIdx((i) => Math.min(included.length - 1, i + 1))}>
          Next
        </Button>
      </div>
    </Card>
  );
}

export default function ExportPhase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [excludedOpen, setExcludedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);

  const dataQ = useQuery({
    queryKey: ['export-phase', id],
    queryFn: async () => {
      const [proj, scenes, images, videos, audio, existing] = await Promise.all([
        projectsApi.get(id),
        scenesApi.listByProject(id),
        sceneImagesApi.listByProject(id),
        sceneVideosApi.listByProject(id),
        audioAssetsApi.listByProject(id),
        exportsApi.latest(id),
      ]);
      if (proj.error) throw proj.error;
      return {
        project: proj.data,
        scenes: scenes.data ?? [],
        images: images.data ?? [],
        videos: videos.data ?? [],
        audio: audio.data ?? [],
        existing: existing.data ?? null,
      };
    },
  });

  const timeline = useMemo(() => {
    if (!dataQ.data) return { included: [], excluded: [] };
    return buildTimeline(dataQ.data);
  }, [dataQ.data]);

  const readiness = timeline.included.length > 0 ? 'ready' : 'not_ready';
  const statusFromExisting = dataQ.data?.existing?.status;

  const handleRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ['export-phase', id] });
    toast.success('Approved assets refreshed');
  };

  const buildManifest = (status) => ({
    project_id: id,
    generated_at: new Date().toISOString(),
    scenes: timeline.included,
    excluded: timeline.excluded,
    status,
    validation_notes:
      timeline.included.length === 0
        ? 'No approved scenes yet.'
        : `${timeline.included.length} scene(s) ready, ${timeline.excluded.length} excluded.`,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const status = readiness === 'ready' ? 'queued' : 'not_ready';
      const manifest = buildManifest(status);
      const res = await exportsApi.saveManifest({
        project_id: id,
        manifest,
        status,
        validation_notes: manifest.validation_notes,
        approved_scene_ids: timeline.included.map((s) => s.scene_id),
      });
      if (res.error) throw res.error;
      toast.success('Export manifest saved');
      await qc.invalidateQueries({ queryKey: ['export-phase', id] });
    } catch (e) {
      toast.error(e.message || 'Failed to save manifest');
    } finally {
      setSaving(false);
    }
  };

  const handleReady = async () => {
    if (readiness !== 'ready') {
      toast.message('No approved scenes yet', {
        description: 'Approve at least one scene with image, video, and audio (or silent).',
      });
      return;
    }
    setMarking(true);
    try {
      const manifest = buildManifest('ready_for_render');
      const saved = await exportsApi.saveManifest({
        project_id: id,
        manifest,
        status: 'ready_for_render',
        validation_notes: manifest.validation_notes,
        approved_scene_ids: timeline.included.map((s) => s.scene_id),
      });
      if (saved.error) throw saved.error;
      toast.success('Marked Ready for Render', {
        description: 'Backend MP4 renderer is not connected yet. Your approved timeline is saved.',
      });
      await qc.invalidateQueries({ queryKey: ['export-phase', id] });
    } catch (e) {
      toast.error(e.message || 'Failed to mark ready');
    } finally {
      setMarking(false);
    }
  };

  if (dataQ.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (dataQ.isError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-6 bg-card border-destructive/40">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="w-4 h-4" /> Failed to load Export phase
          </div>
          <p className="text-sm text-muted-foreground mb-3">{String(dataQ.error?.message || dataQ.error)}</p>
          <Button size="sm" onClick={() => dataQ.refetch()}>Retry</Button>
        </Card>
      </div>
    );
  }

  const { project, existing } = dataQ.data;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/project/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Final Export</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {project?.title}
          </p>
          <p className="text-sm text-muted-foreground/80 mt-0.5">
            Review approved scenes before creating the final video.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Approved Assets
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save Export Manifest'}
          </Button>
          <Button size="sm" onClick={handleReady} disabled={marking || readiness !== 'ready'}>
            <Send className="w-4 h-4 mr-1.5" /> {marking ? 'Marking…' : 'Ready for Render'}
          </Button>
        </div>
      </div>

      {/* Readiness banner */}
      <Card className={`p-4 border ${readiness === 'ready' ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {readiness === 'ready' ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <div className="text-sm font-medium text-foreground">
                {readiness === 'ready' ? 'Ready for Render' : 'Not ready yet'}
              </div>
              <div className="text-xs text-muted-foreground">
                {timeline.included.length} included · {timeline.excluded.length} excluded
                {statusFromExisting ? ` · saved status: ${statusFromExisting}` : ''}
              </div>
            </div>
          </div>
          {existing?.updated_at && (
            <div className="text-xs text-muted-foreground">
              Manifest last saved {new Date(existing.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      </Card>

      {/* Included timeline */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Approved Timeline</h2>
        {timeline.included.length === 0 ? (
          <Card className="p-6 bg-card border-border text-sm text-muted-foreground">
            No approved scenes yet. Approve at least one scene with image, video, and audio (or silent) to build the timeline.
          </Card>
        ) : (
          <div className="space-y-2">
            {timeline.included.map((s) => (
              <Card key={s.scene_id} className="p-3 bg-card border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-semibold text-foreground/80 shrink-0">
                  {s.scene_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{s.scene_title}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.duration_seconds}s · audio: {s.audio_summary}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Included</Badge>
                <Badge variant="secondary" className="text-[10px]">Ready</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview player */}
      {timeline.included.length > 0 && <PreviewPlayer included={timeline.included} />}

      {/* Excluded scenes */}
      {timeline.excluded.length > 0 && (
        <Card className="p-3 bg-card border-border">
          <button
            type="button"
            className="w-full flex items-center justify-between text-sm font-medium text-foreground"
            onClick={() => setExcludedOpen((o) => !o)}
          >
            <span>Excluded Scenes ({timeline.excluded.length})</span>
            {excludedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {excludedOpen && (
            <ul className="mt-3 space-y-1.5">
              {timeline.excluded.map((e, i) => (
                <li key={`${e.scene_id ?? 'x'}-${i}`} className="text-xs text-muted-foreground flex justify-between gap-3">
                  <span>Scene {e.scene_number ?? '—'}</span>
                  <span className="text-amber-500/90">{e.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Future renderer note */}
      <Card className="p-3 bg-muted/20 border-border text-xs text-muted-foreground flex gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Final MP4 rendering will later use a backend renderer to combine approved scene videos and approved audio into a real MP4 (H.264/AAC) file. Browser/canvas export is intentionally avoided.
        </span>
      </Card>
    </div>
  );
}
