import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, Loader2, Clapperboard, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { projectsApi, scenesApi } from '@/lib/studio/api';
import { supabase } from '@/integrations/supabase/client';
import { SAMPLE_SCENES } from '@/lib/studio/sampleScenes';
import SceneEditorCard, { canApprove } from '@/components/storyboard/SceneEditorCard';

// Editable fields we persist for each scene
const EDITABLE_FIELDS = [
  'scene_title', 'story_text', 'characters', 'environment_description',
  'camera_direction', 'image_prompt', 'animation_prompt', 'transition_to_next',
  'audio_mode', 'dialogue_text', 'narration_text', 'rhyme_lyrics',
  'background_music_prompt', 'sfx_prompt', 'voice_style', 'audio_timing',
  'duration_seconds', 'visual_status', 'audio_status',
];

// Map legacy local `duration` to canonical `duration_seconds` before any DB write
function pickEditableSafe(scene) {
  const out = {};
  for (const k of EDITABLE_FIELDS) if (k in scene) out[k] = scene[k];
  if (out.duration_seconds == null && scene.duration != null) {
    out.duration_seconds = Number(scene.duration) || 6;
  }
  return out;
}

function pickEditable(scene) {
  const out = {};
  for (const k of EDITABLE_FIELDS) if (k in scene) out[k] = scene[k];
  return out;
}

function defaultAudioModeFor(projectType) {
  const t = (projectType || '').toLowerCase();
  if (/rhyme|nursery|kids[_ -]?song|musical|song/.test(t)) return 'rhyme_song';
  if (/documentary|education|explainer/.test(t)) return 'narration';
  return 'dialogue';
}

export default function StoryboardPhase() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const projectQ = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => (await projectsApi.get(projectId)).data,
    enabled: !!projectId,
  });

  const scenesQ = useQuery({
    queryKey: ['storyboard-scenes', projectId],
    queryFn: async () => (await scenesApi.listByProject(projectId)).data ?? [],
    enabled: !!projectId,
  });

  // Local editable copy
  const [scenes, setScenes] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [justSavedIds, setJustSavedIds] = useState(() => new Set());
  const savedTimers = useRef({});

  useEffect(() => {
    if (scenesQ.data) setScenes(scenesQ.data);
  }, [scenesQ.data]);

  const project = projectQ.data;
  const projectType = project?.project_type;

  const markDirty = (id) =>
    setDirtyIds((prev) => {
      const next = new Set(prev); next.add(id); return next;
    });

  const updateLocal = (id, patch) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    markDirty(id);
  };

  const flashSaved = (ids) => {
    setJustSavedIds((prev) => {
      const next = new Set(prev); ids.forEach((i) => next.add(i)); return next;
    });
    ids.forEach((id) => {
      clearTimeout(savedTimers.current[id]);
      savedTimers.current[id] = setTimeout(() => {
        setJustSavedIds((prev) => {
          const next = new Set(prev); next.delete(id); return next;
        });
      }, 2000);
    });
  };

  const addScene = async () => {
    const nextNumber = scenes.length
      ? Math.max(...scenes.map((s) => s.scene_number)) + 1
      : 1;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      project_id: projectId,
      user_id: user.id,
      scene_number: nextNumber,
      scene_title: '',
      duration_seconds: 6,
      audio_mode: defaultAudioModeFor(projectType),
      visual_status: 'draft',
      audio_status: 'draft',
      characters: [],
      transition_to_next: 'cut',
    };
    const { data, error } = await supabase
      .from('storyboard_scenes')
      .insert(payload).select().single();
    if (error) { toast({ title: 'Could not add scene', description: error.message, variant: 'destructive' }); return; }
    setScenes((prev) => [...prev, data]);
  };

  const deleteScene = async (id) => {
    if (!confirm('Delete this scene?')) return;
    const target = scenes.find((s) => s.id === id);
    if (!target) return;
    const { error } = await scenesApi.remove(id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    // Renumber subsequent scenes
    const remaining = scenes.filter((s) => s.id !== id);
    const renumbered = remaining
      .sort((a, b) => a.scene_number - b.scene_number)
      .map((s, i) => ({ ...s, scene_number: i + 1 }));
    setScenes(renumbered);
    // Persist renumbered scene_numbers for scenes that moved
    await Promise.all(
      renumbered
        .filter((s, i) => s.scene_number !== scenesQ.data?.find((o) => o.id === s.id)?.scene_number)
        .map((s) => scenesApi.update(s.id, { scene_number: s.scene_number }))
    );
  };

  const duplicateScene = async (id) => {
    const src = scenes.find((s) => s.id === id);
    if (!src) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Shift scenes after src up by 1
    const after = scenes.filter((s) => s.scene_number > src.scene_number);
    await Promise.all(
      after.map((s) => scenesApi.update(s.id, { scene_number: s.scene_number + 1 }))
    );
    const cloneBody = pickEditableSafe(src);
    const { data, error } = await supabase
      .from('storyboard_scenes')
      .insert({
        ...cloneBody,
        project_id: projectId,
        user_id: user.id,
        scene_number: src.scene_number + 1,
        scene_title: src.scene_title ? `${src.scene_title} (copy)` : '',
        visual_status: 'draft',
        audio_status: 'draft',
      })
      .select().single();
    if (error) { toast({ title: 'Duplicate failed', description: error.message, variant: 'destructive' }); return; }
    setScenes((prev) => {
      const shifted = prev.map((s) =>
        s.scene_number > src.scene_number ? { ...s, scene_number: s.scene_number + 1 } : s
      );
      return [...shifted, data].sort((a, b) => a.scene_number - b.scene_number);
    });
  };

  const moveScene = async (id, delta) => {
    const sorted = [...scenes].sort((a, b) => a.scene_number - b.scene_number);
    const idx = sorted.findIndex((s) => s.id === id);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    const aNum = a.scene_number, bNum = b.scene_number;
    setScenes((prev) =>
      prev.map((s) => {
        if (s.id === a.id) return { ...s, scene_number: bNum };
        if (s.id === b.id) return { ...s, scene_number: aNum };
        return s;
      })
    );
    await Promise.all([
      scenesApi.update(a.id, { scene_number: bNum }),
      scenesApi.update(b.id, { scene_number: aNum }),
    ]);
  };

  const toggleApprove = async (id) => {
    const s = scenes.find((x) => x.id === id);
    if (!s) return;
    const isApproved = s.visual_status === 'approved' && s.audio_status === 'approved';
    if (!isApproved) {
      const check = canApprove(s);
      if (!check.ok) {
        toast({
          title: 'Cannot approve scene yet',
          description: !check.visualOk
            ? 'Add a story or image prompt in the Visual section first.'
            : 'Add dialogue, narration, lyrics, music or SFX in the Audio section first.',
          variant: 'destructive',
        });
        return;
      }
    }
    const patch = isApproved
      ? { visual_status: 'ready', audio_status: 'ready' }
      : { visual_status: 'approved', audio_status: 'approved' };
    // optimistic
    const prevSnapshot = { visual_status: s.visual_status, audio_status: s.audio_status };
    setScenes((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      const { error } = await scenesApi.update(id, patch);
      if (error) throw error;
      setDirtyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      flashSaved([id]);
      toast({
        title: isApproved
          ? `Scene ${s.scene_number} unapproved`
          : `Scene ${s.scene_number} approved`,
      });
    } catch (err) {
      // rollback
      setScenes((prev) => prev.map((x) => (x.id === id ? { ...x, ...prevSnapshot } : x)));
      toast({
        title: 'Could not update approval',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const saveAll = async () => {
    if (dirtyIds.size === 0) {
      toast({ title: 'No unsaved changes' });
      return;
    }
    setSavingAll(true);
    const ids = Array.from(dirtyIds);
    try {
      const results = await Promise.all(
        ids.map((id) => {
          const s = scenes.find((x) => x.id === id);
          if (!s) return Promise.resolve({ id, ok: true });
          return scenesApi.update(id, pickEditableSafe(s))
            .then((r) => ({ id, ok: !r.error, err: r.error }));
        })
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        toast({
          title: `Saved ${results.length - failed.length}/${results.length}`,
          description: failed[0]?.err?.message || 'Some scenes failed to save',
          variant: 'destructive',
        });
      } else {
        toast({ title: `Saved ${results.length} scene${results.length === 1 ? '' : 's'}` });
      }
      const okIds = results.filter((r) => r.ok).map((r) => r.id);
      flashSaved(okIds);
      setDirtyIds((prev) => {
        const next = new Set(prev);
        okIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Network error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAll(false);
    }
  };

  // Warn on unload with unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (dirtyIds.size === 0) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyIds]);

  const sortedScenes = useMemo(
    () => [...scenes].sort((a, b) => a.scene_number - b.scene_number),
    [scenes]
  );

  const loading = projectQ.isLoading || scenesQ.isLoading;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Button
          variant="ghost" size="sm"
          onClick={() => navigate(`/project/${projectId}`)}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm" variant="outline"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              const startNum = scenes.length
                ? Math.max(...scenes.map((s) => s.scene_number)) + 1
                : 1;
              const rows = SAMPLE_SCENES.map((s, i) => ({
                ...s,
                project_id: projectId,
                user_id: user.id,
                scene_number: startNum + i,
              }));
              const { data, error } = await supabase
                .from('storyboard_scenes').insert(rows).select();
              if (error) {
                toast({ title: 'Could not add samples', description: error.message, variant: 'destructive' });
              } else {
                setScenes((prev) => [...prev, ...(data ?? [])]);
                toast({ title: `Added ${data?.length ?? 0} sample scenes` });
              }
            }}
            className="gap-1.5"
          >
            <Wand2 className="w-4 h-4" /> Add Sample Scenes
          </Button>
          <Button size="sm" variant="outline" onClick={addScene} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Scene
          </Button>
          <Button
            size="sm"
            onClick={saveAll}
            disabled={savingAll || dirtyIds.size === 0}
            title={dirtyIds.size === 0 ? 'No unsaved changes' : `Save ${dirtyIds.size} change${dirtyIds.size === 1 ? '' : 's'}`}
            className="gap-1.5"
          >
            {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingAll ? 'Saving…' : 'Save All'} {dirtyIds.size > 0 && `(${dirtyIds.size})`}
          </Button>
        </div>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">
          {project?.title || 'Project'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <Clapperboard className="w-6 h-6 text-primary" /> Storyboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan each scene before generating characters, images, animation, and audio.
        </p>
      </div>

      {/* Scenes */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : sortedScenes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-10 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No scenes yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            No scenes yet. Add your first scene to begin your storyboard.
          </p>
          <Button size="sm" onClick={addScene} className="gap-1.5 mt-2">
            <Plus className="w-4 h-4" /> Add your first scene
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedScenes.map((scene, i) => (
            <SceneEditorCard
              key={scene.id}
              scene={scene}
              index={i}
              total={sortedScenes.length}
              dirty={dirtyIds.has(scene.id)}
              justSaved={justSavedIds.has(scene.id)}
              onChange={(patch) => updateLocal(scene.id, patch)}
              onMove={(delta) => moveScene(scene.id, delta)}
              onDuplicate={() => duplicateScene(scene.id)}
              onDelete={() => deleteScene(scene.id)}
              onToggleApprove={() => toggleApprove(scene.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
