import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, ArrowLeft, Film, Users, Globe, ImageIcon,
  Video, Headphones, Package, Settings2, Sparkles,
  LayoutGrid, Clapperboard
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import PhaseProgressBar from '@/components/studio/PhaseProgressBar';
import PhaseCard from '@/components/studio/PhaseCard';
import PhaseWorkspace from '@/components/studio/PhaseWorkspace';
import SceneEditor from '@/components/blueprint/SceneEditor';
import CharacterHub from '@/components/characters/CharacterHub';
import WorldMemoryHub from '@/components/world/WorldMemoryHub';
import ImageWorkspace from '@/components/images/ImageWorkspace';
import ImageProductionStudio from '@/components/images/ImageProductionStudio';
import VideoWorkspace from '@/components/video/VideoWorkspace';
import AnimationStudio from '@/components/video/AnimationStudio';
import AudioWorkspace from '@/components/audio/AudioWorkspace';
import ExportWorkspace from '@/components/export/ExportWorkspace';
import CinematicWorkspaceNav from '@/components/layout/CinematicWorkspaceNav';
import StoryboardDirectorWorkspace from '@/components/storyboard/StoryboardDirectorWorkspace';

// ─── Phase definitions ────────────────────────────────────────────────────────
const PHASES = [
  {
    id: 'blueprint',
    number: 1,
    label: 'Blueprint Creation',
    shortLabel: 'Blueprint',
    description: 'Your story blueprint, scene structure, visual prompts, and narrative guide.',
    icon: Film,
    tab: 'story',
  },
  {
    id: 'characters',
    number: 2,
    label: 'Character Studio',
    shortLabel: 'Characters',
    description: 'Extract, name, and lock character visual identities for consistency.',
    icon: Users,
    tab: 'characters',
  },
  {
    id: 'world',
    number: 3,
    label: 'World & Locations',
    shortLabel: 'Locations',
    description: 'Define and lock recurring locations, environments, and cinematic settings.',
    icon: Globe,
    tab: 'world',
  },
  {
    id: 'storyboard',
    number: 4,
    label: 'Storyboard Director',
    shortLabel: 'Storyboard',
    description: 'Convert your blueprint into cinematic production-ready storyboard scenes with AI direction.',
    icon: Clapperboard,
    tab: 'storyboard',
  },
  {
    id: 'images',
    number: 5,
    label: 'Image Production',
    shortLabel: 'Images',
    description: 'Generate and approve scene images with character and world consistency.',
    icon: ImageIcon,
    tab: 'images',
  },
  {
    id: 'animate',
    number: 6,
    label: 'Animation Studio',
    shortLabel: 'Animate',
    description: 'Build motion prompts and animate approved scene frames into video clips.',
    icon: Video,
    tab: 'animate',
  },
  {
    id: 'audio',
    number: 7,
    label: 'Audio Studio',
    shortLabel: 'Audio',
    description: 'Generate narration, sound effects, and music for each scene.',
    icon: Headphones,
    tab: 'audio',
  },
  {
    id: 'export',
    number: 8,
    label: 'Final Export Studio',
    shortLabel: 'Export',
    description: 'Compile, render, and export your production to your chosen format.',
    icon: Package,
    tab: 'export',
  },
];

const STORAGE_KEY = (projectId) => `studio_progress_${projectId}`;

function loadProgress(projectId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(projectId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedPhases: [], currentPhase: 'blueprint', mode: 'guided' };
}

function saveProgress(projectId, data) {
  try {
    localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(data));
  } catch {}
}

const APPROVAL_KEY = (projectId) => `blueprint_approved_${projectId}`;

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ProductionStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isPaid, isAdmin } = useCurrentUser();

  // Load project
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => base44.entities.Project.list().then(ps => ps.find(p => p.id === id)),
    enabled: !!id,
  });

  // Blueprint approval state
  const [blueprintApproved, setBlueprintApproved] = useState(() => {
    try { return localStorage.getItem(APPROVAL_KEY(id)) === 'true'; } catch { return false; }
  });

  const handleBlueprintApprove = useCallback(async (scenes) => {
    try {
      localStorage.setItem(APPROVAL_KEY(id), 'true');
      setBlueprintApproved(true);
      // Auto-mark blueprint phase complete and advance to characters
      const saved = loadProgress(id);
      const updated = { ...saved, completedPhases: [...(saved.completedPhases || []).filter(p => p !== 'blueprint'), 'blueprint'], currentPhase: 'characters' };
      // currentPhase stays 'characters' — storyboard unlocks after world
      saveProgress(id, updated);
      setProgress(updated);
      // Kick off character + world extraction in background
      base44.functions.invoke('characterHub', { action: 'extract', project_id: id }).catch(() => {});
      base44.functions.invoke('worldMemory',   { action: 'extract', project_id: id }).catch(() => {});
      // Kick off storyboard init in background
      base44.functions.invoke('storyboardImage', {
        action: 'init_storyboard',
        project_id: id,
        scenes: scenes.map(s => ({ scene_number: s.scene_number, visual_prompt: s.visual_summary || s.script_text || s._raw || '', aspect_ratio: '16:9' })),
      }).catch(() => {});
      toast.success('Blueprint approved! Moving to Character Studio…');
      // Navigate to character phase
      setTimeout(() => setActivePhaseId('characters'), 600);
    } catch (e) {
      toast.error(e.message || 'Approval failed');
    }
  }, [id]);

  // Phase progress state — persisted to localStorage
  const [progress, setProgress] = useState(() => loadProgress(id));
  const { completedPhases, currentPhase, mode } = progress;

  const updateProgress = useCallback((updates) => {
    const next = { ...progress, ...updates };
    setProgress(next);
    saveProgress(id, next);
  }, [progress, id]);

  // Selected phase to show in workspace (null = overview grid)
  const [activePhaseId, setActivePhaseId] = useState(null);

  // Advanced mode tab (for pro users who switch to full toolbar)
  const [advancedTab, setAdvancedTab] = useState('story');

  useEffect(() => {
    if (id) {
      const saved = loadProgress(id);
      setProgress(saved);
      // Auto-open the current phase if user has already started
      if (saved.currentPhase && saved.currentPhase !== 'blueprint') {
        // Don't auto-open — let the user decide from the overview
      }
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Link to="/projects">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const hasBlueprint = !!(project.master_prompt || project.visual_prompt);

  // Determine which phases are unlocked
  const isUnlocked = (phaseId) => {
    const idx = PHASES.findIndex(p => p.id === phaseId);
    if (idx === 0) return hasBlueprint;
    // Phase 2 (characters) requires blueprint approval
    if (idx === 1) return blueprintApproved;
    // Subsequent phases: previous must be completed
    const prevId = PHASES[idx - 1].id;
    return completedPhases.includes(prevId) || currentPhase === prevId || isUnlocked(PHASES[idx - 1].id);
  };

  const handlePhaseClick = (phaseId) => {
    setActivePhaseId(phaseId);
    updateProgress({ currentPhase: phaseId });
  };

  const handleBack = () => {
    if (activePhaseId) {
      setActivePhaseId(null);
    } else {
      navigate('/projects');
    }
  };

  const handleComplete = (phaseId) => {
    const pid = phaseId || activePhaseId;
    if (!pid) return;
    const updated = completedPhases.includes(pid) ? completedPhases : [...completedPhases, pid];
    // Auto-advance to next phase
    const idx = PHASES.findIndex(p => p.id === pid);
    const nextPhase = PHASES[idx + 1];
    updateProgress({ completedPhases: updated, currentPhase: nextPhase?.id || pid });
    if (nextPhase) {
      toast.success(`Phase ${idx + 1} complete! Moving to ${nextPhase.label}`);
      setActivePhaseId(nextPhase.id);
    } else {
      toast.success('Production complete! 🎬');
      setActivePhaseId(null);
    }
  };

  const handleNext = () => {
    if (!activePhaseId) return;
    const idx = PHASES.findIndex(p => p.id === activePhaseId);
    const nextPhase = PHASES[idx + 1];
    if (nextPhase) {
      setActivePhaseId(nextPhase.id);
      updateProgress({ currentPhase: nextPhase.id });
    }
  };

  const activePhase = PHASES.find(p => p.id === activePhaseId);
  const activePhaseIdx = PHASES.findIndex(p => p.id === activePhaseId);
  const isLastPhase = activePhaseIdx === PHASES.length - 1;
  const nextPhase = activePhaseIdx >= 0 ? PHASES[activePhaseIdx + 1] : null;

  const totalCompleted = completedPhases.length;
  const progressPct = Math.round((totalCompleted / PHASES.length) * 100);

  // ── Mode: Advanced (full toolbar) ────────────────────────────────────────────
  if (mode === 'advanced') {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Projects
            </Link>
            <button
              onClick={() => updateProgress({ mode: 'guided' })}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/40 rounded-lg px-3 py-1.5 hover:border-border/70"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Guided Mode
            </button>
          </div>
          <div className="mb-6">
            <h1 className="font-playfair text-3xl font-bold truncate">{project.title}</h1>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
            <CinematicWorkspaceNav activeTab={advancedTab} onTabChange={setAdvancedTab} isAdmin={isAdmin} />
            <motion.div
              key={advancedTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="p-5"
            >
              {advancedTab === 'story' && (
                <SceneEditor
                  project={project}
                  user={user}
                  isAdmin={isAdmin}
                  onApprove={handleBlueprintApprove}
                  isApproved={blueprintApproved}
                />
              )}
              {advancedTab === 'visual' && (project.visual_prompt
                ? <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed max-h-[600px] overflow-y-auto">{project.visual_prompt}</pre>
                : <p className="text-muted-foreground text-sm py-8 text-center">No visual prompts available.</p>
              )}
              {advancedTab === 'characters' && (isPaid || isAdmin
                ? <CharacterHub project={project} />
                : <PaidGate />
              )}
              {advancedTab === 'world' && (isPaid || isAdmin
                ? <WorldMemoryHub project={project} />
                : <PaidGate />
              )}
              {advancedTab === 'storyboard' && (
                <StoryboardDirectorWorkspace
                  project={project}
                  onApproveAndContinue={() => setAdvancedTab('images')}
                />
              )}
              {advancedTab === 'images'  && (
                <ImageProductionStudio
                  project={project} user={user} isAdmin={isAdmin}
                  onComplete={() => setAdvancedTab('animate')}
                />
              )}
              {advancedTab === 'audio'   && <AudioWorkspace project={project} user={user} isAdmin={isAdmin} />}
              {advancedTab === 'animate' && (
                <AnimationStudio
                  project={project} user={user} isAdmin={isAdmin}
                  onComplete={() => setAdvancedTab('audio')}
                />
              )}
              {advancedTab === 'export'  && <ExportWorkspace project={project} user={user} isAdmin={isAdmin} />}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode: Guided (phase-based) ────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {activePhaseId ? 'All Phases' : 'Projects'}
          </button>

          <div className="flex items-center gap-2">
            {(isPaid || isAdmin) && (
              <button
                onClick={() => updateProgress({ mode: 'advanced' })}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/40 rounded-lg px-3 py-1.5 hover:border-border/70"
              >
                <Settings2 className="w-3.5 h-3.5" /> Advanced
              </button>
            )}
          </div>
        </div>

        {/* Project title + progress */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="font-playfair text-2xl sm:text-3xl font-bold truncate">{project.title}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {totalCompleted}/{PHASES.length} phases complete
                </span>
                <div className="flex-1 max-w-[140px] h-1 bg-border/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs text-primary font-medium">{progressPct}%</span>
              </div>
            </div>
            {totalCompleted === PHASES.length && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/25 shrink-0">
                <Sparkles className="w-3 h-3 mr-1" /> Production Complete
              </Badge>
            )}
          </div>

          {/* Phase progress bar */}
          <div className="rounded-2xl border border-border/30 bg-card/30 px-4 py-3">
            <PhaseProgressBar
              phases={PHASES}
              currentPhase={currentPhase}
              completedPhases={completedPhases}
              onPhaseClick={handlePhaseClick}
            />
          </div>
        </motion.div>

        {/* ── OVERVIEW GRID ── */}
        <AnimatePresence mode="wait">
          {!activePhaseId && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {PHASES.map((phase, idx) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  index={idx}
                  isCompleted={completedPhases.includes(phase.id)}
                  isCurrent={currentPhase === phase.id}
                  isUnlocked={isUnlocked(phase.id)}
                  onClick={handlePhaseClick}
                />
              ))}
            </motion.div>
          )}

          {/* ── PHASE WORKSPACE ── */}
          {activePhaseId && activePhase && (
            <motion.div
              key={activePhaseId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PhaseWorkspace
                phase={activePhase}
                isCompleted={completedPhases.includes(activePhaseId)}
                isLastPhase={isLastPhase}
                nextPhaseLabel={nextPhase ? `${nextPhase.label}` : null}
                onBack={() => setActivePhaseId(null)}
                onNext={handleNext}
                onComplete={() => handleComplete(activePhaseId)}
                hideFooterActions={activePhaseId === 'blueprint'}
              >
                {/* Phase 1 — Blueprint */}
                {activePhaseId === 'blueprint' && (
                  <SceneEditor
                    project={project}
                    user={user}
                    isAdmin={isAdmin}
                    onApprove={handleBlueprintApprove}
                    isApproved={blueprintApproved}
                  />
                )}

                {/* Phase 2 — Characters */}
                {activePhaseId === 'characters' && (
                  isPaid || isAdmin
                    ? <CharacterHub project={project} />
                    : <PaidGate />
                )}

                {/* Phase 3 — World */}
                {activePhaseId === 'world' && (
                  isPaid || isAdmin
                    ? <WorldMemoryHub project={project} />
                    : <PaidGate />
                )}

                {/* Phase 4 — Storyboard Director */}
                {activePhaseId === 'storyboard' && (
                  <StoryboardDirectorWorkspace
                    project={project}
                    onApproveAndContinue={() => handleComplete('storyboard')}
                  />
                )}

                {/* Phase 5 — Images */}
                {activePhaseId === 'images' && (
                  <ImageProductionStudio
                    project={project} user={user} isAdmin={isAdmin}
                    onComplete={() => handleComplete('images')}
                  />
                )}

                {/* Phase 6 — Animate */}
                {activePhaseId === 'animate' && (
                  <AnimationStudio
                    project={project} user={user} isAdmin={isAdmin}
                    onComplete={() => handleComplete('animate')}
                  />
                )}

                {/* Phase 7 — Audio */}
                {activePhaseId === 'audio' && (
                  <AudioWorkspace project={project} user={user} isAdmin={isAdmin} />
                )}

                {/* Phase 8 — Export */}
                {activePhaseId === 'export' && (
                  <ExportWorkspace project={project} user={user} isAdmin={isAdmin} />
                )}
              </PhaseWorkspace>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function PaidGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">Paid Feature</h3>
        <p className="text-sm text-muted-foreground max-w-xs">Upgrade your plan to unlock this production phase.</p>
      </div>
      <Link to="/upgrade">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Upgrade Now</Button>
      </Link>
    </div>
  );
}