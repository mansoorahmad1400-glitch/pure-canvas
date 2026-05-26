import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, Loader2, Users, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { projectsApi, scenesApi, charactersApi } from '@/lib/studio/api';
import { supabase } from '@/integrations/supabase/client';
import { extractCharacters, defaultStyleFor } from '@/lib/studio/characterExtractor';
import CharacterEditorCard, { canApproveCharacter } from '@/components/characters/CharacterEditorCard';
import { useAuthReady } from '@/hooks/useAuthReady';
import QueryErrorState from '@/components/studio/QueryErrorState';

const EDITABLE_FIELDS = [
  'name', 'role', 'description', 'appearance', 'personality',
  'voice_style', 'style_prompt', 'reference_image_url', 'approval_status',
];

function pickEditable(c) {
  const out = {};
  for (const k of EDITABLE_FIELDS) if (k in c) out[k] = c[k];
  return out;
}

export default function CharactersPhase() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isReady } = useAuthReady();

  const projectQ = useQuery({
    queryKey: ['project', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await projectsApi.get(projectId);
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user && !!projectId,
  });

  const scenesQ = useQuery({
    queryKey: ['storyboard-scenes', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await scenesApi.listByProject(projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });

  const charactersQ = useQuery({
    queryKey: ['characters', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await charactersApi.listByProject(projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });

  const [characters, setCharacters] = useState([]);
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [justSavedIds, setJustSavedIds] = useState(() => new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const savedTimers = useRef({});

  useEffect(() => {
    if (charactersQ.data) setCharacters(charactersQ.data);
  }, [charactersQ.data]);

  // Warn on unsaved
  useEffect(() => {
    if (dirtyIds.size === 0) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirtyIds]);

  const project = projectQ.data;
  const approvedCount = useMemo(() => characters.filter((c) => c.approval_status === 'approved').length, [characters]);

  const markDirty = (id) => setDirtyIds((s) => { const n = new Set(s); n.add(id); return n; });
  const clearDirty = (ids) => setDirtyIds((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; });
  const flashSaved = (ids) => {
    setJustSavedIds((s) => { const n = new Set(s); ids.forEach((i) => n.add(i)); return n; });
    ids.forEach((id) => {
      clearTimeout(savedTimers.current[id]);
      savedTimers.current[id] = setTimeout(() => {
        setJustSavedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      }, 2000);
    });
  };

  const handleChange = (id, patch) => {
    setCharacters((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    markDirty(id);
  };

  const insertCharacter = async (payload) => {
    const { data, error } = await charactersApi.create(payload);
    if (error) throw error;
    setCharacters((list) => [...list, data]);
    return data;
  };

  const handleAdd = async () => {
    try {
      await insertCharacter({
        project_id: projectId,
        name: 'New Character',
        role: 'supporting',
        description: '',
        appearance: '',
        personality: '',
        voice_style: '',
        style_prompt: defaultStyleFor(project?.project_type),
        approval_status: 'pending',
      });
    } catch (e) {
      toast({ title: 'Failed to add character', description: e.message, variant: 'destructive' });
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      // Ensure we have the latest scenes
      let scenes = scenesQ.data;
      if (!scenes) {
        const refetched = await scenesQ.refetch();
        scenes = refetched.data ?? [];
      }
      const approvedScenes = scenes.filter(
        (s) => s.visual_status === 'approved' && s.audio_status === 'approved'
      );
      if (approvedScenes.length === 0) {
        toast({
          title: 'No approved scenes yet',
          description: 'Approve at least one Storyboard scene before extracting characters.',
          variant: 'destructive',
        });
        return;
      }
      const candidates = extractCharacters({
        scenes,
        projectType: project?.project_type,
        existingNames: characters.map((c) => c.name),
      });
      if (candidates.length === 0) {
        toast({
          title: 'Nothing new to extract',
          description: 'All detected characters are already in your list.',
        });
        return;
      }
      let added = 0;
      for (const c of candidates) {
        const { _mentions, ...payload } = c;
        try {
          await insertCharacter({ project_id: projectId, ...payload });
          added++;
        } catch (err) {
          console.error('Character insert failed', err);
        }
      }
      toast({
        title: `Extracted ${added} character${added === 1 ? '' : 's'}`,
        description: 'Review and approve them below.',
      });
    } catch (e) {
      console.error('Extraction error', e);
      toast({
        title: 'Extraction failed',
        description: e?.message || 'Unexpected error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this character?')) return;
    const prev = characters;
    setCharacters((list) => list.filter((c) => c.id !== id));
    const { error } = await charactersApi.remove(id);
    if (error) {
      setCharacters(prev);
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const persist = async (id, patch) => {
    const { data, error } = await charactersApi.update(id, patch);
    if (error) throw error;
    setCharacters((list) => list.map((c) => (c.id === id ? { ...c, ...data } : c)));
    clearDirty([id]);
    flashSaved([id]);
  };

  const handleApprove = async (id) => {
    const c = characters.find((x) => x.id === id);
    if (!c || !canApproveCharacter(c)) return;
    try {
      await persist(id, { ...pickEditable(c), approval_status: 'approved' });
    } catch (e) {
      toast({ title: 'Approve failed', description: e.message, variant: 'destructive' });
    }
  };
  const handleUnapprove = async (id) => {
    const c = characters.find((x) => x.id === id);
    if (!c) return;
    try {
      await persist(id, { ...pickEditable(c), approval_status: 'pending' });
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleUploadImage = async (id, file) => {
    const reader = new FileReader();
    reader.onload = () => {
      handleChange(id, { reference_image_url: reader.result });
      toast({
        title: 'Image attached locally',
        description: 'Save All to persist. Cloud upload will be added later.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAll = async () => {
    if (dirtyIds.size === 0) return;
    setSavingAll(true);
    const ids = Array.from(dirtyIds);
    const targets = characters.filter((c) => ids.includes(c.id));
    const results = await Promise.allSettled(
      targets.map((c) => charactersApi.update(c.id, pickEditable(c)))
    );
    const okIds = [];
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && !r.value.error) okIds.push(targets[i].id);
      else failed++;
    });
    clearDirty(okIds);
    flashSaved(okIds);
    setSavingAll(false);
    toast({
      title: failed ? `Saved ${okIds.length}, ${failed} failed` : `Saved ${okIds.length} character${okIds.length === 1 ? '' : 's'}`,
      variant: failed ? 'destructive' : 'default',
    });
  };

  const goBack = () => {
    if (dirtyIds.size > 0 && !confirm('You have unsaved changes. Leave anyway?')) return;
    navigate(`/project/${projectId}`);
  };

  if (projectQ.isLoading || charactersQ.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExtract} disabled={extracting} className="gap-1.5">
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Extract from Storyboard
          </Button>
          <Button variant="outline" size="sm" onClick={handleAdd} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Character
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={dirtyIds.size === 0 || savingAll}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All{dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ''}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Characters</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Create and approve character references before generating scene images.
        </p>
        {project && (
          <p className="text-xs text-muted-foreground">
            Project: <span className="text-foreground/80">{project.title}</span>
            {' · '}{approvedCount}/{characters.length} approved
          </p>
        )}
      </div>

      {characters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center space-y-4">
          <Users className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            No characters yet. Extract them from your storyboard or add one manually.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExtract} disabled={extracting} className="gap-1.5">
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Extract from Storyboard
            </Button>
            <Button onClick={handleAdd} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Character
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((c) => (
            <CharacterEditorCard
              key={c.id}
              character={c}
              isDirty={dirtyIds.has(c.id)}
              justSaved={justSavedIds.has(c.id)}
              onChange={handleChange}
              onApprove={handleApprove}
              onUnapprove={handleUnapprove}
              onDelete={handleDelete}
              onUploadImage={handleUploadImage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
