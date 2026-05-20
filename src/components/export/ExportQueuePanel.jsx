import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Download, Clock, CheckCircle2, XCircle, Loader2, Package } from 'lucide-react';

const STATUS_CONFIG = {
  queued:     { label: 'Queued',    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: Clock },
  preparing:  { label: 'Preparing', color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Loader2 },
  rendering:  { label: 'Rendering', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Loader2 },
  complete:   { label: 'Complete',  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: CheckCircle2 },
  failed:     { label: 'Failed',    color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: XCircle },
};

const TYPE_LABELS = {
  storyboard_pdf:   'Storyboard PDF',
  image_zip:        'Image Pack',
  audio_zip:        'Audio Package',
  prompt_pack:      'Prompt Pack',
  narration_script: 'Narration Script',
  subtitles_srt:    'Subtitles (SRT)',
  shorts_480p:      'Short 480p',
  shorts_720p:      'Short 720p',
  cinematic_1080p:  'Cinematic 1080p',
};

export default function ExportQueuePanel({ jobs, isAdmin, projectId, onRefresh }) {
  const [cancelling, setCancelling] = useState(null);

  const handleCancel = async (jobId) => {
    setCancelling(jobId);
    try {
      await base44.functions.invoke('exportPipeline', {
        action: 'cancel_job',
        project_id: projectId,
        job_id: jobId,
      });
      toast.success('Job cancelled and gems refunded');
      await onRefresh();
    } catch (e) {
      toast.error(e.message || 'Cancel failed');
    }
    setCancelling(null);
  };

  const sortedJobs = [...jobs].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Export Queue</h3>
          <p className="text-xs text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh} className="h-7 text-xs gap-1.5 border-border/40">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {sortedJobs.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <Package className="w-10 h-10 text-muted-foreground/20 mx-auto" />
          <p className="text-sm text-muted-foreground">No export jobs yet.</p>
          <p className="text-xs text-muted-foreground/60">Use the Download Center to export your project assets.</p>
        </div>
      )}

      <div className="space-y-2">
        {sortedJobs.map(job => {
          const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
          const StatusIcon = sc.icon;
          const isSpinning = job.status === 'preparing' || job.status === 'rendering' || job.status === 'queued';

          return (
            <div key={job.id} className={`rounded-xl border ${sc.border} bg-card/30 p-3`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center shrink-0`}>
                  <StatusIcon className={`w-4 h-4 ${sc.color} ${isSpinning ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{TYPE_LABELS[job.export_type] || job.export_type}</span>
                    <Badge className={`text-[9px] ${sc.bg} ${sc.color} ${sc.border}`}>{sc.label}</Badge>
                    {job.gems_cost > 0 && (
                      <span className="text-[10px] text-muted-foreground">{job.gems_cost}💎</span>
                    )}
                    {job.gems_refunded > 0 && (
                      <Badge variant="outline" className="text-[9px] border-green-500/20 text-green-400">+{job.gems_refunded}💎 refunded</Badge>
                    )}
                  </div>
                  {job.failed_reason && (
                    <p className="text-xs text-red-400 mt-1">{job.failed_reason}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {job.created_date ? new Date(job.created_date).toLocaleString() : ''}
                    {job.completed_at ? ` · Completed ${new Date(job.completed_at).toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {job.export_url && (
                    <a href={job.export_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-border/40">
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                    </a>
                  )}
                  {(job.status === 'failed' || job.status === 'queued' || job.status === 'preparing') && isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(job.id)}
                      disabled={cancelling === job.id}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                    >
                      {cancelling === job.id
                        ? <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}