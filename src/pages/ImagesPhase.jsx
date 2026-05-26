import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, RefreshCw, Save, Loader2, ImageIcon, Check, X,
  Link2, Sparkles, Trash2, Pencil, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  projectsApi, scenesApi, charactersApi, sceneImagesApi,
} from '@/lib/studio/api';
import { defaultStyleFor } from '@/lib/studio/characterExtractor';
import { useAuthReady } from '@/hooks/useAuthReady';
import QueryErrorState from '@/components/studio/QueryErrorState';
import AssetUploadButton from '@/components/studio/AssetUploadButton';

// ---------- helpers ----------
function buildDefaultPrompt({ scene, project, characters }) {
  const parts = [];
  if (scene.scene_title) parts.push(scene.scene_title);
  if (scene.image_prompt) parts.push(scene.image_prompt);
  else if (scene.story_text) parts.push(scene.story_text);
  if (scene.environment_description) parts.push(`Environment: ${scene.environment_description}`);
  if (scene.camera_direction) parts.push(`Camera: ${scene.camera_direction}`);

  const sceneChars = Array.isArray(scene.characters) ? scene.characters : [];
  if (sceneChars.length) {
    const refs = sceneChars
      .map((name) => {
        const c = characters.find(
          (x) => x.approval_status === 'approved' &&
            (x.name || '').toLowerCase() === String(name).toLowerCase()
        );
        if (!c) return name;
        const bits = [c.name];
        if (c.appearance) bits.push(`(${c.appearance})`);
        if (c.style_prompt) bits.push(`[${c.style_prompt}]`);
        return bits.join(' ');
      })
      .join(', ');
    parts.push(`Characters: ${refs}`);
  }

  if (project?.style) parts.push(`Visual style: ${project.style}`);
  parts.push(defaultStyleFor(project?.project_type));
  return parts.filter(Boolean).join('\n');
}

const MOCK_PLACEHOLDER =
  'https://placehold.co/1280x720/1f2937/e5e7eb?text=Scene+Preview';

function statusBadge(record) {
  if (!record) {
    return (
      <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        Missing
      </span>
    );
  }
  if (record.approval_status === 'approved') {
    return (
      <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
        Approved
      </span>
    );
  }
  return (
    <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
      Draft
    </span>
  );
}

// ---------- per-scene card ----------
function SceneImageCard({
  scene, record, project, characters, projectId,
  onSaveRecord, onApprove, onUnapprove, onDelete,
}) {
  const [prompt, setPrompt] = useState(
    record?.prompt_used || buildDefaultPrompt({ scene, project, characters })
  );
  const [imageUrl, setImageUrl] = useState(record?.image_url || '');
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (record) {
      setPrompt(record.prompt_used || prompt);
      setImageUrl(record.image_url || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, record?.prompt_used, record?.image_url]);

  const sceneChars = Array.isArray(scene.characters) ? scene.characters : [];
  const approvedRefs = sceneChars.filter((n) =>
    characters.some(
      (c) => c.approval_status === 'approved' &&
        (c.name || '').toLowerCase() === String(n).toLowerCase()
    )
  );

  const savePrompt = async () => {
    setBusy('prompt');
    try {
      await onSaveRecord({
        scene_id: scene.id,
        prompt_used: prompt,
        image_url: imageUrl || null,
        provider: record?.provider || 'manual',
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
        prompt_used: prompt,
        image_url: url,
        provider: 'manual',
      });
      setImageUrl(url);
      setUrlInput('');
      setShowUrl(false);
    } finally { setBusy(null); }
  };

  const addMock = async () => {
    setBusy('mock');
    try {
      await onSaveRecord({
        scene_id: scene.id,
        prompt_used: prompt,
        image_url: MOCK_PLACEHOLDER,
        provider: 'mock',
      });
      setImageUrl(MOCK_PLACEHOLDER);
    } finally { setBusy(null); }
  };

  const approve = async () => {
    if (!record || !record.image_url || !record.prompt_used) return;
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
    if (!confirm('Delete this image record?')) return;
    setBusy('delete');
    try { await onDelete(record.id); } finally { setBusy(null); }
  };

  const canApprove = !!(record?.image_url && record?.prompt_used) && record.approval_status !== 'approved';
  const isApproved = record?.approval_status === 'approved';

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
      {/* Header */}
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
            {scene.duration_seconds ?? 6}s · {sceneChars.length} character{sceneChars.length === 1 ? '' : 's'}
            {approvedRefs.length > 0 && ` · ${approvedRefs.length} approved ref${approvedRefs.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 p-4">
        {/* Image preview */}
        <div>
          <div className="aspect-video rounded-xl bg-secondary/40 border border-border/40 flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={scene.scene_title || `Scene ${scene.scene_number}`}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground/70">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs">No image yet</span>
              </div>
            )}
          </div>

          {sceneChars.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {sceneChars.map((n) => {
                const isApprovedRef = approvedRefs.includes(n);
                return (
                  <span
                    key={n}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isApprovedRef
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {n}{isApprovedRef ? ' ✓' : ''}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Prompt + actions */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Image Prompt
            </label>
            {!editing ? (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            ) : (
              <Button
                size="sm" className="h-7 gap-1 text-xs"
                disabled={busy === 'prompt'}
                onClick={savePrompt}
              >
                {busy === 'prompt' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </Button>
            )}
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            readOnly={!editing}
            rows={6}
            className="text-xs font-mono resize-none"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {!showUrl ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                onClick={() => setShowUrl(true)}>
                <Link2 className="w-3.5 h-3.5" /> Add Image URL
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Input
                  placeholder="https://..."
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

            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
              disabled={busy === 'mock'} onClick={addMock}>
              {busy === 'mock' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Use Mock Placeholder
            </Button>

            {!isApproved && (
              <Button
                size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-600/90 text-white"
                disabled={!canApprove || busy === 'approve'}
                onClick={approve}
                title={!canApprove ? 'Add prompt and image first' : 'Approve image'}
              >
                {busy === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Approve
              </Button>
            )}
            {isApproved && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                disabled={busy === 'unapprove'} onClick={unapprove}>
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

// ---------- page ----------
export default function ImagesPhase() {
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

  const charsQ = useQuery({
    queryKey: ['characters', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await charactersApi.listByProject(projectId);
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

  const [savingAll, setSavingAll] = useState(false);

  const project = projectQ.data;
  const characters = charsQ.data ?? [];
  const allScenes = scenesQ.data ?? [];
  const images = imagesQ.data ?? [];

  const approvedScenes = useMemo(
    () =>
      allScenes.filter(
        (s) => s.visual_status === 'approved' && s.audio_status === 'approved'
      ),
    [allScenes]
  );

  const recordByScene = useMemo(() => {
    const m = new Map();
    images.forEach((img) => { if (!m.has(img.scene_id)) m.set(img.scene_id, img); });
    return m;
  }, [images]);

  const approvedCount = images.filter((i) => i.approval_status === 'approved').length;

  const refresh = () => {
    scenesQ.refetch();
    imagesQ.refetch();
    charsQ.refetch();
  };

  const upsertRecord = async ({ scene_id, prompt_used, image_url, provider }) => {
    const existing = recordByScene.get(scene_id);
    try {
      if (existing) {
        const { error } = await sceneImagesApi.update(existing.id, {
          prompt_used, image_url, provider: provider || existing.provider || 'manual',
        });
        if (error) throw error;
      } else {
        const { error } = await sceneImagesApi.create({
          project_id: projectId,
          scene_id,
          prompt_used,
          image_url,
          provider: provider || 'manual',
          approval_status: 'pending',
        });
        if (error) throw error;
      }
      await imagesQ.refetch();
    } catch (e) {
      toast({ title: 'Save failed', description: e?.message || 'Try again', variant: 'destructive' });
      throw e;
    }
  };

  const approve = async (id) => {
    try {
      const { error } = await sceneImagesApi.approve(id);
      if (error) throw error;
      await imagesQ.refetch();
      toast({ title: 'Image approved' });
    } catch (e) {
      toast({ title: 'Approve failed', description: e?.message, variant: 'destructive' });
    }
  };

  const unapprove = async (id) => {
    try {
      const { error } = await sceneImagesApi.unapprove(id);
      if (error) throw error;
      await imagesQ.refetch();
    } catch (e) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
  };

  const removeRec = async (id) => {
    try {
      const { error } = await sceneImagesApi.remove(id);
      if (error) throw error;
      await imagesQ.refetch();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };

  const handleSaveAll = async () => {
    // Persist default prompt for any approved scene that has no record yet.
    const missing = approvedScenes.filter((s) => !recordByScene.get(s.id));
    if (missing.length === 0) {
      toast({ title: 'Nothing to save', description: 'Each approved scene already has an image record.' });
      return;
    }
    setSavingAll(true);
    let ok = 0, fail = 0;
    try {
      for (const s of missing) {
        try {
          const { error } = await sceneImagesApi.create({
            project_id: projectId,
            scene_id: s.id,
            prompt_used: buildDefaultPrompt({ scene: s, project, characters }),
            image_url: null,
            provider: 'manual',
            approval_status: 'pending',
          });
          if (error) throw error;
          ok++;
        } catch { fail++; }
      }
      await imagesQ.refetch();
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
    (imagesQ.isLoading && !imagesQ.data);

  if (showInitialLoader) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projectQ.isError || scenesQ.isError || imagesQ.isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <QueryErrorState
          title="Couldn't load images"
          error={projectQ.error || scenesQ.error || imagesQ.error}
          onRetry={refresh}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="ghost" size="sm"
          onClick={() => navigate(`/project/${projectId}`)}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Refresh Scenes
          </Button>
          <Button
            size="sm" onClick={handleSaveAll}
            disabled={savingAll || approvedScenes.length === 0}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Images</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Create or approve scene images before animation.
        </p>
        {project && (
          <p className="text-xs text-muted-foreground">
            Project: <span className="text-foreground/80">{project.title}</span>
            {' · '}{approvedCount}/{approvedScenes.length} approved
          </p>
        )}
      </div>

      {/* Empty state */}
      {approvedScenes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            No approved storyboard scenes yet. Approve scenes in Storyboard before creating images.
          </p>
          <Button
            onClick={() => navigate(`/project/${projectId}/storyboard`)}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Storyboard
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedScenes.map((s) => (
            <SceneImageCard
              key={s.id}
              scene={s}
              record={recordByScene.get(s.id) || null}
              project={project}
              characters={characters}
              onSaveRecord={upsertRecord}
              onApprove={approve}
              onUnapprove={unapprove}
              onDelete={removeRec}
            />
          ))}
        </div>
      )}
    </div>
  );
}
