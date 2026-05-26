import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clapperboard, Users, ImageIcon, Video, Music, Package,
  Loader2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  projectsApi, scenesApi, charactersApi, sceneImagesApi,
  sceneVideosApi, audioAssetsApi, exportsApi,
} from '@/lib/studio/api';
import PhaseCard from '@/components/studio/PhaseCard';
import { useAuthReady } from '@/hooks/useAuthReady';
import QueryErrorState from '@/components/studio/QueryErrorState';

export const PHASES = [
  {
    id: 'storyboard', number: 1, label: 'Storyboard', shortLabel: 'Storyboard',
    description: 'Create and edit scene Visual + Audio plans.',
    icon: Clapperboard,
  },
  {
    id: 'characters', number: 2, label: 'Characters', shortLabel: 'Characters',
    description: 'Create and approve character references.',
    icon: Users,
  },
  {
    id: 'images', number: 3, label: 'Images', shortLabel: 'Images',
    description: 'Generate and approve scene images.',
    icon: ImageIcon,
  },
  {
    id: 'animate', number: 4, label: 'Animate', shortLabel: 'Animate',
    description: 'Generate and approve scene videos.',
    icon: Video,
  },
  {
    id: 'audio', number: 5, label: 'Audio', shortLabel: 'Audio',
    description: 'Generate and approve voice, music, SFX, or rhyme/song audio.',
    icon: Music,
  },
  {
    id: 'export', number: 6, label: 'Export', shortLabel: 'Export',
    description: 'Create final video from approved video + approved audio only.',
    icon: Package,
  },
];

function isSceneVisualReady(s) {
  return !!(s.story_text || s.visual_prompt || s.environment || s.characters_in_scene);
}
function isSceneAudioReady(s) {
  return !!(s.dialogue || s.narration || s.lyrics || s.music_prompt || s.sfx_prompt);
}

export function computePhaseStatus({ scenes, characters, images, videos, audio, exportRow }) {
  const storyboard = scenes.some((s) => isSceneVisualReady(s) && isSceneAudioReady(s));
  const charactersDone =
    characters.length > 0 && characters.every((c) => c.approval_status === 'approved');
  const imagesDone = images.some((i) => i.approval_status === 'approved');
  const animateDone = videos.some((v) => v.approval_status === 'approved');
  // Audio phase complete = at least one scene has both an approved video AND
  // an approved audio asset (or is approved as silent, which is stored as an
  // approved asset with provider='silent').
  const approvedVideoSceneIds = new Set(
    videos.filter((v) => v.approval_status === 'approved' && v.video_url).map((v) => v.scene_id)
  );
  const approvedAudioSceneIds = new Set(
    audio.filter((a) => a.approval_status === 'approved' && a.scene_id).map((a) => a.scene_id)
  );
  const audioDone = [...approvedVideoSceneIds].some((sid) => approvedAudioSceneIds.has(sid));
  const exportDone = !!(exportRow && (exportRow.status === 'completed' || exportRow.status === 'ready_for_render'));
  return {
    storyboard, characters: charactersDone, images: imagesDone,
    animate: animateDone, audio: audioDone, export: exportDone,
  };
}

export default function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();

  const projectQ = useQuery({
    queryKey: ['project', id, user?.id],
    queryFn: async () => {
      const { data, error } = await projectsApi.get(id);
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user && !!id,
  });
  const project = projectQ.data;
  const isLoading = projectQ.isLoading;

  const countsQ = useQuery({
    queryKey: ['project-phase-counts', id, user?.id],
    queryFn: async () => {
      const [s, c, im, vd, au, ex] = await Promise.all([
        scenesApi.listByProject(id),
        charactersApi.listByProject(id),
        sceneImagesApi.listByProject(id),
        sceneVideosApi.listByProject(id),
        audioAssetsApi.listByProject(id),
        exportsApi.latest(id),
      ]);
      return {
        scenes: s.data ?? [],
        characters: c.data ?? [],
        images: im.data ?? [],
        videos: vd.data ?? [],
        audio: au.data ?? [],
        exportRow: ex.data ?? null,
      };
    },
    enabled: isReady && !!user && !!id,
  });
  const counts = countsQ.data;

  const phaseStatus = useMemo(() => {
    if (!counts) return {};
    return computePhaseStatus(counts);
  }, [counts]);

  const completedIds = PHASES.filter((p) => phaseStatus[p.id]).map((p) => p.id);
  const progressPct = Math.round((completedIds.length / PHASES.length) * 100);
  const nextIncomplete = PHASES.find((p) => !phaseStatus[p.id]) ?? PHASES[PHASES.length - 1];
  const currentPhaseId = nextIncomplete.id;
  const currentPhase = PHASES.find((p) => p.id === currentPhaseId);

  if (!isReady || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projectQ.isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <QueryErrorState
          title="Couldn't load this project"
          error={projectQ.error}
          onRetry={() => projectQ.refetch()}
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <QueryErrorState
          title="Project not found"
          error={{ message: 'This project no longer exists or you do not have access to it.' }}
          onRetry={() => navigate('/projects')}
        />
      </div>
    );
  }

  const openPhase = (phaseId) => navigate(`/project/${id}/${phaseId}`);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to="/projects"><ArrowLeft className="w-4 h-4" /> Back to Projects</Link>
        </Button>
      </div>

      {/* Project header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
              {project.project_type?.replace(/_/g, ' ') || 'Project'}
            </p>
            <h1 className="text-2xl font-semibold text-foreground mt-1 truncate">{project.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Current phase: <span className="text-foreground/80 font-medium">{currentPhase.label}</span>
            </p>
          </div>
          <Button onClick={() => openPhase(currentPhaseId)} className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>
      </motion.div>

      {/* Phase cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Phases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PHASES.map((phase, idx) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              index={idx}
              isCompleted={!!phaseStatus[phase.id]}
              isCurrent={phase.id === currentPhaseId && !phaseStatus[phase.id]}
              isUnlocked={true}
              onClick={openPhase}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
