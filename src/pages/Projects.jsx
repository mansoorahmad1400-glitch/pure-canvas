import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Sparkles, Film, Clock, CheckCircle2, AlertCircle,
  Loader2, FolderOpen, Trash2, ExternalLink, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/studio/api';
import { useAuthReady } from '@/hooks/useAuthReady';
import QueryErrorState from '@/components/studio/QueryErrorState';

const statusConfig = {
  draft:      { icon: Clock,        label: 'Draft',      cls: 'bg-muted text-muted-foreground' },
  in_progress:{ icon: Loader2,      label: 'In progress',cls: 'bg-primary/15 text-primary' },
  completed:  { icon: CheckCircle2, label: 'Completed',  cls: 'bg-green-500/15 text-green-400' },
  error:      { icon: AlertCircle,  label: 'Error',      cls: 'bg-destructive/15 text-destructive' },
};

const typeEmoji = {
  story: '📖', rhyme: '🎵', fairy_tale: '✨', kids_song: '🎶',
  documentary: '🎬', educational: '📚', fantasy: '🧙', custom: '🎞️',
};

function ProjectCard({ project, onDelete }) {
  const status = statusConfig[project.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group p-5 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
          {typeEmoji[project.project_type] || <Film className="w-5 h-5 text-primary" />}
        </div>
        <Badge className={`${status.cls} border-0 text-xs shrink-0`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
        <p className="text-xs text-muted-foreground capitalize mt-0.5">
          {project.project_type?.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          {project.created_at && format(new Date(project.created_at), 'MMM d, yyyy')}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Phase: <span className="text-foreground/80">{project.current_phase || 'storyboard'}</span></span>
          <span>{Math.round(project.progress || 0)}%</span>
        </div>
        <Progress value={Number(project.progress) || 0} className="h-1" />
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Link to={`/project/${project.id}`} className="flex-1">
          <Button size="sm" className="select-none w-full h-8 text-xs bg-primary/90 hover:bg-primary text-primary-foreground">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
          </Button>
        </Link>
        <Button
          size="sm" variant="outline"
          className="select-none h-8 w-8 p-0 border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/50"
          onClick={() => onDelete(project)} title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function Projects() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: projects = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['projects-v2', user?.id],
    queryFn: async () => {
      const { data, error } = await projectsApi.list();
      if (error) throw error;
      return data ?? [];
    },
    enabled: isReady && !!user,
  });

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    const snap = queryClient.getQueryData(['projects-v2']);
    queryClient.setQueryData(['projects-v2'], (old) => (old ?? []).filter((p) => p.id !== id));
    const { error } = await projectsApi.remove(id);
    if (error) {
      queryClient.setQueryData(['projects-v2'], snap);
      toast.error('Failed to delete project');
    } else {
      toast.success('Project deleted');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-playfair text-3xl font-bold">Your Projects</h1>
            <p className="mt-1 text-muted-foreground">
              {projects.length > 0
                ? `${projects.length} project${projects.length !== 1 ? 's' : ''} saved`
                : 'Start your first StudioOne AI project'}
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
            <Button
              onClick={() => navigate('/projects/new')}
              className="select-none bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Sparkles className="w-4 h-4 mr-2" /> New Project
            </Button>
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
            <p className="text-muted-foreground mb-6">
              No projects yet. Create your first StudioOne AI project.
            </p>
            <Button
              onClick={() => navigate('/projects/new')}
              className="select-none bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Sparkles className="w-4 h-4 mr-2" /> New Project
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onDelete={setPendingDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete &ldquo;{pendingDelete?.title}&rdquo; and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="select-none border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="select-none bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
