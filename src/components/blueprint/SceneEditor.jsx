import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Sparkles, CheckCircle2, AlertCircle,
  LayoutList, Save, RefreshCw, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import SceneEditorCard from './SceneEditorCard';

// ─── Scene parser: extract structured scenes from visual_prompt text ───────────
function parseScenes(visualPrompt, masterPrompt) {
  if (!visualPrompt) return [];
  const scenes = [];
  // Match "Scene N:" or "Scene N —" blocks
  const pattern = /Scene\s+(\d+)\s*[:\-–—]?\s*([\s\S]*?)(?=Scene\s+\d+\s*[:\-–—]|$)/gi;
  let match;
  while ((match = pattern.exec(visualPrompt)) !== null) {
    const sceneNum = parseInt(match[1]);
    const rawText = match[2].trim();
    if (!rawText || rawText.length < 10) continue;

    // Extract sub-fields from the raw text using common patterns
    const extract = (label, text) => {
      const patterns = [
        new RegExp(`${label}\\s*[:\\-–—]\\s*([^\\n]+)`, 'i'),
        new RegExp(`\\*\\*${label}\\*\\*\\s*[:\\-–—]?\\s*([^\\n]+)`, 'i'),
      ];
      for (const p of patterns) {
        const m = text.match(p);
        if (m) return m[1].trim();
      }
      return '';
    };

    // Title: first line or "Scene Title:" label
    let title = extract('Scene Title', rawText) || extract('Title', rawText);
    if (!title) {
      const firstLine = rawText.split('\n')[0].replace(/\*\*/g, '').trim();
      if (firstLine.length < 80) title = firstLine;
    }

    const scene = {
      scene_number: sceneNum,
      title: title || `Scene ${sceneNum}`,
      script_text: extract('Story', rawText) || extract('Action', rawText) || extract('Script', rawText) || rawText.slice(0, 600),
      visual_summary: extract('Environment', rawText) || extract('Visual', rawText) || extract('Setting', rawText) || '',
      characters_detected: extract('Characters', rawText) || extract('Character', rawText) || '',
      location_detected: extract('Location', rawText) || extract('Setting', rawText) || '',
      mood: extract('Mood', rawText) || extract('Tone', rawText) || extract('Atmosphere', rawText) || '',
      camera_direction: extract('Camera', rawText) || extract('Camera Angle', rawText) || extract('Camera Movement', rawText) || '',
      transition_to_next: extract('Transition', rawText) || '',
      duration: extract('Duration', rawText) || '',
      _raw: rawText,
    };
    scenes.push(scene);
  }

  // Sort by scene number
  scenes.sort((a, b) => a.scene_number - b.scene_number);
  return scenes;
}

// Re-number scenes after reorder/delete
function renumberScenes(scenes) {
  return scenes.map((s, i) => ({ ...s, scene_number: i + 1 }));
}

const SCENES_KEY = (projectId) => `scene_editor_${projectId}`;

function loadSavedScenes(projectId) {
  try {
    const raw = localStorage.getItem(SCENES_KEY(projectId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveScenesToStorage(projectId, scenes) {
  try {
    localStorage.setItem(SCENES_KEY(projectId), JSON.stringify(scenes));
  } catch {}
}

export default function SceneEditor({ project, user, isAdmin, onApprove, isApproved }) {
  const [scenes, setScenes] = useState(null); // null = not yet parsed
  const [saving, setSaving] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  const userBalance = user?.gems_balance ?? 0;
  const projectContext = `${project?.project_type || ''} — ${project?.title || ''} — ${project?.idea_description || ''}`;

  // Parse scenes from project on load
  useEffect(() => {
    if (!project?.id) return;
    const saved = loadSavedScenes(project.id);
    if (saved && saved.length > 0) {
      setScenes(saved);
    } else if (project.visual_prompt) {
      const parsed = parseScenes(project.visual_prompt, project.master_prompt);
      setScenes(parsed);
    }
  }, [project?.id, project?.visual_prompt]);

  const persistScenes = useCallback((updated) => {
    if (!project?.id) return;
    saveScenesToStorage(project.id, updated);
  }, [project?.id]);

  const handleUpdate = (index, updatedScene) => {
    const updated = scenes.map((s, i) => i === index ? updatedScene : s);
    setScenes(updated);
    persistScenes(updated);
  };

  const handleDelete = (index) => {
    if (scenes.length <= 1) { toast.error("Can't delete the last scene."); return; }
    const updated = renumberScenes(scenes.filter((_, i) => i !== index));
    setScenes(updated);
    persistScenes(updated);
    toast.success('Scene deleted');
  };

  const handleDuplicate = (index) => {
    const copy = { ...scenes[index], title: `${scenes[index].title} (Copy)` };
    const updated = renumberScenes([
      ...scenes.slice(0, index + 1),
      copy,
      ...scenes.slice(index + 1),
    ]);
    setScenes(updated);
    persistScenes(updated);
    toast.success('Scene duplicated');
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...scenes];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const renumbered = renumberScenes(updated);
    setScenes(renumbered);
    persistScenes(renumbered);
  };

  const handleMoveDown = (index) => {
    if (index === scenes.length - 1) return;
    const updated = [...scenes];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const renumbered = renumberScenes(updated);
    setScenes(renumbered);
    persistScenes(renumbered);
  };

  const handleAddScene = () => {
    const newScene = {
      scene_number: scenes.length + 1,
      title: `Scene ${scenes.length + 1}`,
      script_text: '',
      visual_summary: '',
      characters_detected: '',
      location_detected: '',
      mood: '',
      camera_direction: '',
      transition_to_next: '',
      duration: '6',
      _raw: '',
    };
    const updated = [...scenes, newScene];
    setScenes(updated);
    persistScenes(updated);
    toast.success('New scene added');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    // Reconstruct visual_prompt from scenes
    const reconstructed = scenes.map(s => {
      const lines = [
        `Scene ${s.scene_number}: ${s.title}`,
        s.script_text ? `Action: ${s.script_text}` : '',
        s.visual_summary ? `Environment: ${s.visual_summary}` : '',
        s.characters_detected ? `Characters: ${s.characters_detected}` : '',
        s.location_detected ? `Location: ${s.location_detected}` : '',
        s.mood ? `Mood: ${s.mood}` : '',
        s.camera_direction ? `Camera: ${s.camera_direction}` : '',
        s.transition_to_next ? `Transition: ${s.transition_to_next}` : '',
        s.duration ? `Duration: ${s.duration}s` : '',
      ].filter(Boolean);
      return lines.join('\n');
    }).join('\n\n---\n\n');

    try {
      await base44.entities.Project.update(project.id, {
        visual_prompt: reconstructed,
        scene_count: scenes.length,
      });
      persistScenes(scenes);
      toast.success(`All ${scenes.length} scenes saved`);
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleReparse = () => {
    if (!project.visual_prompt) return;
    const parsed = parseScenes(project.visual_prompt, project.master_prompt);
    setScenes(parsed);
    saveScenesToStorage(project.id, parsed); // clear saved edits
    toast.success('Scenes re-parsed from blueprint');
  };

  if (!project?.visual_prompt && !project?.master_prompt) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No blueprint found. Generate a blueprint first.</p>
      </div>
    );
  }

  if (!scenes) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-primary/70" />
          <span className="text-sm font-semibold text-foreground">{scenes.length} Scene{scenes.length !== 1 ? 's' : ''}</span>
          <span className="text-xs text-muted-foreground">· click a field to edit · 0 💎 for manual edits</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAllExpanded(e => !e)}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:border-border/70 transition-colors"
          >
            {allExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
          <button
            onClick={handleReparse}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:border-border/70 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-parse
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveAll}
            disabled={saving}
            className="text-xs h-8 border-border/50 gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All
          </Button>
        </div>
      </div>

      {/* Balance indicator */}
      {!isAdmin && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
          <span>AI edits use gems · Balance: <span className="text-primary font-medium">{userBalance} 💎</span></span>
        </div>
      )}

      {/* Scene cards */}
      <AnimatePresence initial={false}>
        {scenes.map((scene, index) => (
          <SceneEditorCard
            key={`scene-${scene.scene_number}-${index}`}
            scene={scene}
            index={index}
            totalScenes={scenes.length}
            projectContext={projectContext}
            onUpdate={(updated) => handleUpdate(index, updated)}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            userBalance={userBalance}
            isAdmin={isAdmin}
            forceExpanded={allExpanded}
          />
        ))}
      </AnimatePresence>

      {/* Add scene */}
      <button
        onClick={handleAddScene}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/40 text-xs text-muted-foreground hover:text-foreground hover:border-border/70 hover:bg-secondary/20 transition-all"
      >
        <Plus className="w-3.5 h-3.5" /> Add Scene
      </button>

      {/* Approve CTA */}
      <div className={`rounded-2xl border p-5 text-center space-y-3 transition-all ${
        isApproved ? 'border-green-500/30 bg-green-500/5' : 'border-primary/25 bg-primary/3'
      }`}>
        {isApproved ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <p className="text-sm font-semibold text-green-400">Blueprint Approved</p>
            <p className="text-xs text-muted-foreground">Scene structure is locked. Proceed to Character Studio.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Ready to lock in your scenes?
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Review all {scenes.length} scenes above, make any edits, then approve to extract characters and locations.
            </p>
            <Button
              onClick={() => onApprove(scenes)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Blueprint &amp; Continue to Character Studio
            </Button>
          </>
        )}
      </div>
    </div>
  );
}