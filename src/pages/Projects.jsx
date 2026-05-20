import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sparkles, Film, Clock, CheckCircle2, AlertCircle,
  Loader2, FolderOpen, Copy, Trash2, ExternalLink, Gem, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusConfig = {
  draft:      { icon: Clock,         label: 'Draft',      cls: 'bg-muted text-muted-foreground' },
  generating: { icon: Loader2,       label: 'Generating', cls: 'bg-primary/15 text-primary' },
  completed:  { icon: CheckCircle2,  label: 'Completed',  cls: 'bg-green-500/15 text-green-400' },
  error:      { icon: AlertCircle,   label: 'Error',      cls: 'bg-destructive/15 text-destructive' },
};

const typeEmoji = {
  story: '📖', rhyme: '🎵', fairy_tale: '✨', adventure: '⚔️',
  documentary: '🎬', mystery: '🔍', mythology: '🏛️', educational: '📚',
  fantasy: '🧙', folktale: '🌿',
};

function ProjectCard({ project, index, onDelete, onDuplicate }) {
  const [duplicating, setDuplicating] = useState(false);
  const navigate = useNavigate();
  const status = statusConfig[project.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`#delete-${project.id}`, { replace: false });
  };

  const handleDuplicate = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(true);
    await onDuplicate(project);
    setDuplicating(false);
  };

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      className="group p-5 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg group-hover:bg-primary/20 transition-colors shrink-0">
          {typeEmoji[project.project_type] || <Film className="w-5 h-5 text-primary" />}
        </div>
        <Badge className={`${status.cls} border-0 text-xs shrink-0`}>
          <StatusIcon className={`w-3 h-3 mr-1 ${project.status === 'generating' ? 'animate-spin' : ''}`} />
          {status.label}
        </Badge>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
        <p className="text-xs text-muted-foreground capitalize mt-0.5">
          {project.project_type?.replace(/_/g, ' ')}
          {project.audience ? ` · ${project.audience}` : ''}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          {project.created_date && format(new Date(project.created_date), 'MMM d, yyyy')}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Gem className="w-3 h-3 text-primary/70" />
        <span>1 gem used</span>
        {project.scene_count > 0 && (
          <span className="ml-auto text-muted-foreground/60">{project.scene_count} scenes</span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Link to={`/project/${project.id}`} className="flex-1">
          <Button size="sm" className="select-none w-full h-8 text-xs bg-primary/90 hover:bg-primary text-primary-foreground">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
          </Button>
        </Link>
        <Button
          size="sm" variant="outline"
          className="select-none h-8 w-8 p-0 border-border/50 text-muted-foreground hover:text-foreground"
          onClick={handleDuplicate} disabled={duplicating} title="Duplicate"
        >
          {duplicating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
        <Button
          size="sm" variant="outline"
          className="select-none h-8 w-8 p-0 border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/50"
          onClick={handleDeleteClick} title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// Pull-to-refresh hook
function usePullToRefresh(onRefresh) {
  const touchStartY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const threshold = 70;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current === 0) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPulling(true);
      setPullDistance(Math.min(delta, threshold * 1.5));
    }
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold) {
      await onRefresh();
    }
    touchStartY.current = 0;
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh]);

  return { onTouchStart, onTouchMove, onTouchEnd, pulling, pullDistance, threshold };
}

function ProjectsInner() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me(), staleTime: 30000 });

  const { data: projects = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['projects', user?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Parse hash to detect which project's delete dialog is open
  const hash = location.hash; // e.g. "#delete-abc123"
  const pendingDeleteId = hash.startsWith('#delete-') ? hash.replace('#delete-', '') : null;

  const closeDeleteDialog = () => navigate(location.pathname, { replace: true });

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    // Optimistic: remove from cache immediately
    const snapshot = queryClient.getQueryData(['projects', user?.email]);
    queryClient.setQueryData(['projects', user?.email], (old) =>
      old ? old.filter((p) => p.id !== pendingDeleteId) : []
    );
    closeDeleteDialog();
    try {
      await base44.entities.Project.delete(pendingDeleteId);
      toast.success('Project deleted.');
    } catch {
      // Rollback on error
      queryClient.setQueryData(['projects', user?.email], snapshot);
      toast.error('Failed to delete. Please try again.');
    }
  };

  const handleDuplicate = async (project) => {
    const { id, created_date, updated_date, created_by, ...data } = project;
    // Optimistic: add a temp copy
    const tempId = `temp-${Date.now()}`;
    const tempProject = { ...data, id: tempId, title: `${project.title} (Copy)`, status: 'completed', created_date: new Date().toISOString() };
    queryClient.setQueryData(['projects', user?.email], (old) => old ? [tempProject, ...old] : [tempProject]);
    try {
      const created = await base44.entities.Project.create({ ...data, title: `${project.title} (Copy)`, status: 'completed' });
      // Replace temp with real
      queryClient.setQueryData(['projects', user?.email], (old) =>
        old ? old.map((p) => p.id === tempId ? created : p) : [created]
      );
      toast.success('Project duplicated!');
    } catch {
      queryClient.setQueryData(['projects', user?.email], (old) => old ? old.filter((p) => p.id !== tempId) : []);
      toast.error('Failed to duplicate.');
    }
  };

  const { onTouchStart, onTouchMove, onTouchEnd, pulling, pullDistance, threshold } = usePullToRefresh(refetch);

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pulling && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: Math.min(pullDistance, threshold) }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <RefreshCw
              className={`w-5 h-5 text-primary transition-transform ${pullDistance >= threshold ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${(pullDistance / threshold) * 360}deg)` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold">Your Projects</h1>
            <p className="mt-1 text-muted-foreground">
              {projects.length > 0 ? `${projects.length} project${projects.length !== 1 ? 's' : ''} saved` : 'All your production blueprints'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="icon"
              className="select-none border-border/50 text-muted-foreground"
              onClick={() => refetch()} disabled={isFetching}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Link to="/studio">
              <Button className="select-none bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Sparkles className="w-4 h-4 mr-2" /> New Project
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">Generate your first production blueprint in the Studio</p>
            <Link to="/studio">
              <Button className="select-none bg-primary hover:bg-primary/90 text-primary-foreground">
                <Sparkles className="w-4 h-4 mr-2" /> Open Studio
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {projects.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  onDelete={() => {}} // delete handled via hash modal
                  onDuplicate={handleDuplicate}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog — URL-hash driven so Android back closes it */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="select-none border-border/50" onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="select-none bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Projects() {
  return <ProjectsInner />;
}