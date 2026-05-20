import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clapperboard, Sparkles, LayoutGrid, List, Loader2,
  RefreshCw, CheckCheck, Wand2, AlertCircle, Film
} from 'lucide-react';
import StoryboardDirectorSceneCard from './StoryboardDirectorScene';
import StoryboardTimelineView from './StoryboardTimelineView';
import StoryboardContinuityPanel from './StoryboardContinuityPanel';

export default function StoryboardDirectorWorkspace({ project, onApproveAndContinue }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [autoDirecting, setAutoDirecting] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'timeline'
  const [approvingAll, setApprovingAll] = useState(false);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('storyboardDirector', {
        action: 'get_scenes',
        project_id: project.id,
      });
      setScenes(res.data?.scenes || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load storyboard');
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  const handleInit = async () => {
    if (!project?.visual_prompt) {
      toast.error('No blueprint found. Generate your blueprint first.');
      return;
    }
    setInitializing(true);
    try {
      const res = await base44.functions.invoke('storyboardDirector', {
        action: 'init_director_storyboard',
        project_id: project.id,
      });
      if (res.data?.scenes) {
        setScenes(res.data.scenes);
        toast.success(`Storyboard initialized with ${res.data.scenes.length} scenes!`);
      }
    } catch (e) {
      toast.error(e.message || 'Initialization failed');
    }
    setInitializing(false);
  };

  const handleAutoDirector = async () => {
    if (scenes.length === 0) {
      toast.error('Initialize the storyboard first');
      return;
    }
    setAutoDirecting(true);
    try {
      const res = await base44.functions.invoke('storyboardDirector', {
        action: 'auto_director',
        project_id: project.id,
      });
      if (res.data?.scenes) {
        setScenes(res.data.scenes);
        toast.success('AI Cinematic Director applied! ✨');
      }
    } catch (e) {
      toast.error(e.message || 'Auto-director failed');
    }
    setAutoDirecting(false);
  };

  const handleApproveAll = async () => {
    setApprovingAll(true);
    try {
      await base44.functions.invoke('storyboardDirector', {
        action: 'approve_all',
        project_id: project.id,
      });
      setScenes(prev => prev.map(s => ({ ...s, approved: true })));
      toast.success('All scenes approved!');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
    setApprovingAll(false);
  };

  const handleUpdate = (sceneId, updates) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, ...updates } : s));
  };

  const handleDuplicate = async (sceneId) => {
    try {
      const res = await base44.functions.invoke('storyboardDirector', {
        action: 'duplicate_scene',
        project_id: project.id,
        scene_id: sceneId,
      });
      if (res.data?.scene) {
        setScenes(prev => [...prev, res.data.scene].sort((a, b) => a.sort_order - b.sort_order));
        toast.success('Scene duplicated');
      }
    } catch (e) {
      toast.error(e.message || 'Duplicate failed');
    }
  };

  const handleDelete = async (sceneId) => {
    setScenes(prev => prev.filter(s => s.id !== sceneId));
    try {
      await base44.functions.invoke('storyboardDirector', {
        action: 'delete_scene',
        project_id: project.id,
        scene_id: sceneId,
      });
      toast.success('Scene removed');
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const approvedCount = scenes.filter(s => s.approved).length;
  const totalDuration = scenes.reduce((s, c) => s + (c.scene_duration || 6), 0);
  const allApproved = scenes.length > 0 && approvedCount === scenes.length;

  // Progress tracker
  const steps = [
    { label: 'Initialized', done: scenes.length > 0 },
    { label: 'Directed', done: scenes.some(s => s.camera_direction !== 'wide_shot' || s.motion_prompt) },
    { label: 'Approved', done: allApproved },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading Storyboard Director…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Clapperboard className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Storyboard Director Studio</h2>
            <p className="text-xs text-muted-foreground">
              {scenes.length} scene{scenes.length !== 1 ? 's' : ''} · {totalDuration}s total · {approvedCount} approved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border/40 overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'card' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3 h-3" /> Cards
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'timeline' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-3 h-3" /> Timeline
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={load} className="h-7 w-7">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Cinematic Progress Tracker */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card/40 border border-border/30">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
              step.done ? 'bg-green-500/20 border-green-500/50' : 'bg-card border-border/40'
            }`}>
              {step.done
                ? <CheckCheck className="w-3 h-3 text-green-400" />
                : <span className="text-[10px] font-bold text-muted-foreground/50">{i + 1}</span>
              }
            </div>
            <span className={`text-[11px] font-medium flex-1 ${step.done ? 'text-green-400' : 'text-muted-foreground/60'}`}>
              {step.label}
            </span>
            {i < steps.length - 1 && <div className={`h-px flex-1 max-w-[40px] ${step.done ? 'bg-green-500/40' : 'bg-border/30'}`} />}
          </div>
        ))}
      </div>

      {/* Continuity Panel */}
      <StoryboardContinuityPanel projectId={project?.id} />

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleInit}
          disabled={initializing || autoDirecting}
          variant="outline"
          className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        >
          {initializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
          {scenes.length > 0 ? 'Reinitialize' : 'Build from Blueprint'}
        </Button>

        {scenes.length > 0 && (
          <>
            <Button
              onClick={handleAutoDirector}
              disabled={autoDirecting || initializing}
              className="h-8 text-xs gap-1.5 bg-purple-600/80 hover:bg-purple-600 text-white"
            >
              {autoDirecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {autoDirecting ? 'Directing…' : 'Auto Build Cinematic Storyboard'}
            </Button>

            <Button
              onClick={handleApproveAll}
              disabled={approvingAll || allApproved}
              variant="outline"
              className="h-8 text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              {approvingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Approve All
            </Button>
          </>
        )}
      </div>

      {/* Empty state */}
      {scenes.length === 0 && !initializing && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clapperboard className="w-7 h-7 text-amber-400/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No storyboard scenes yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {project?.visual_prompt
                ? 'Click "Build from Blueprint" to auto-generate all cinematic scenes from your approved story.'
                : 'You need an approved blueprint before building the storyboard.'}
            </p>
          </div>
          {project?.visual_prompt && (
            <Button
              onClick={handleInit}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Clapperboard className="w-4 h-4" /> Build Storyboard
            </Button>
          )}
          {!project?.visual_prompt && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Approve your Blueprint first in Phase 1
            </div>
          )}
        </div>
      )}

      {/* Scenes */}
      {scenes.length > 0 && (
        <AnimatePresence mode="wait">
          {viewMode === 'card' ? (
            <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {scenes.map((scene, i) => (
                <StoryboardDirectorSceneCard
                  key={scene.id}
                  scene={scene}
                  index={i}
                  onUpdate={handleUpdate}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <StoryboardTimelineView scenes={scenes} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Approve & Continue CTA */}
      {allApproved && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-green-500/30 bg-green-500/8 p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div>
            <h3 className="text-sm font-bold text-green-400 mb-0.5">Storyboard Director Complete!</h3>
            <p className="text-xs text-muted-foreground">All {scenes.length} scenes approved. Ready for Image Production.</p>
          </div>
          <Button
            onClick={onApproveAndContinue}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Approve Storyboard & Continue to Image Production
          </Button>
        </motion.div>
      )}
    </div>
  );
}