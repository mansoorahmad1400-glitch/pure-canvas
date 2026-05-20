import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Download, Youtube, Share2, Film, List } from 'lucide-react';
import ExportTimeline from './ExportTimeline';
import ExportDownloadCenter from './ExportDownloadCenter';
import ExportYouTubeTab from './ExportYouTubeTab';
import ExportSocialTab from './ExportSocialTab';
import ExportQueuePanel from './ExportQueuePanel';

export default function ExportWorkspace({ project, user, isAdmin }) {
  const [status, setStatus] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [images, setImages] = useState([]);
  const [audioJobs, setAudioJobs] = useState([]);
  const [videoJobs, setVideoJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [statusRes, jobsRes, scenesData, imagesData, audioData, videoData] = await Promise.all([
        base44.functions.invoke('exportPipeline', { action: 'get_status', project_id: project.id }),
        base44.functions.invoke('exportPipeline', { action: 'get_jobs', project_id: project.id }),
        base44.entities.StoryboardScene.filter({ project_id: project.id }),
        base44.entities.GeneratedImage.filter({ project_id: project.id }),
        base44.entities.AudioJob.filter({ project_id: project.id }),
        base44.entities.VideoJob.filter({ project_id: project.id }),
      ]);
      setStatus(statusRes.data);
      setJobs(jobsRes.data?.jobs || []);
      setScenes([...scenesData].sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0)));
      setImages(imagesData);
      setAudioJobs(audioData);
      setVideoJobs(videoData);
    } catch (e) {
      toast.error('Failed to load export workspace');
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
        <span className="text-sm">Loading Export Hub...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Scenes', value: status?.summary?.approved_scenes ?? 0, total: status?.summary?.total_scenes ?? 0, color: 'text-blue-400' },
          { label: 'Images', value: status?.summary?.approved_images ?? 0, color: 'text-purple-400' },
          { label: 'Audio', value: status?.summary?.approved_audio ?? 0, color: 'text-green-400' },
          { label: 'Video Clips', value: status?.summary?.completed_videos ?? 0, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border/40 bg-card/30 px-4 py-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}{s.total ? `/${s.total}` : ''}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label} Ready</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="download" className="space-y-5">
        <TabsList className="bg-secondary/50 border border-border/30 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="download" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background">
            <Download className="w-3.5 h-3.5" /> Download Center
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background">
            <Film className="w-3.5 h-3.5" /> Final Timeline
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background">
            <Youtube className="w-3.5 h-3.5" /> YouTube Package
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background">
            <Share2 className="w-3.5 h-3.5" /> Social Media
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background">
            <List className="w-3.5 h-3.5" /> Export Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="download">
          <ExportDownloadCenter
            project={project}
            user={user}
            isAdmin={isAdmin}
            status={status}
            scenes={scenes}
            images={images}
            audioJobs={audioJobs}
            videoJobs={videoJobs}
            onRefresh={load}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <ExportTimeline
            scenes={scenes}
            images={images}
            audioJobs={audioJobs}
            videoJobs={videoJobs}
          />
        </TabsContent>

        <TabsContent value="youtube">
          <ExportYouTubeTab project={project} />
        </TabsContent>

        <TabsContent value="social">
          <ExportSocialTab project={project} />
        </TabsContent>

        <TabsContent value="queue">
          <ExportQueuePanel
            jobs={jobs}
            isAdmin={isAdmin}
            projectId={project.id}
            onRefresh={load}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}