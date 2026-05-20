import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play, Pause, CheckCircle2, Trash2, Send, RotateCcw,
  Mic, Music2, Waves, Upload
} from 'lucide-react';

const ACTION_ICONS = {
  narration:     Mic,
  sound_effects: Waves,
  music:         Music2,
  full_package:  Mic,
  uploaded:      Upload,
};

const ACTION_LABELS = {
  narration:     'Narration',
  sound_effects: 'Sound FX',
  music:         'Music',
  full_package:  'Full Package',
  uploaded:      'Uploaded',
};

const STATUS_STYLES = {
  pending:    'bg-secondary/60 text-muted-foreground border-border/30',
  generating: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  completed:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  approved:   'bg-green-500/10 text-green-400 border-green-500/20',
  failed:     'bg-destructive/10 text-destructive border-destructive/20',
};

export default function AudioJobCard({ job, onApprove, onUnapprove, onSendToExport, onDelete }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const Icon = ACTION_ICONS[job.action_type] || Mic;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleEnded = () => setPlaying(false);

  return (
    <div className={`rounded-xl border p-3 transition-all ${job.approved ? 'border-green-500/30 bg-green-500/5' : 'border-border/30 bg-card/40'}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <Icon className="w-3 h-3 text-amber-400" />
        </div>
        <span className="text-xs font-semibold text-foreground">{ACTION_LABELS[job.action_type]}</span>
        <Badge className={`text-[9px] border ml-auto ${STATUS_STYLES[job.status] || STATUS_STYLES.pending}`}>
          {job.status}
        </Badge>
        {job.approved && (
          <Badge className="text-[9px] bg-green-500/15 text-green-400 border-green-500/20">✓ Approved</Badge>
        )}
        {job.sent_to_export && (
          <Badge className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">→ Export</Badge>
        )}
      </div>

      {/* Prompt text */}
      {job.prompt_text && (
        <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{job.prompt_text}</p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mb-2">
        {job.provider && <span className="capitalize">{job.provider?.replace(/_/g, ' ')}</span>}
        {job.language && <span>· {job.language}</span>}
        {job.voice_style && <span>· {job.voice_style?.replace(/_/g, ' ')}</span>}
        {job.duration && <span>· {job.duration}s</span>}
        {job.gems_cost > 0 && <span className="ml-auto">{job.gems_cost}💎</span>}
      </div>

      {/* Error */}
      {job.status === 'failed' && job.error_message && (
        <p className="text-[10px] text-destructive/80 mb-2 bg-destructive/5 rounded-lg px-2 py-1.5">{job.error_message}</p>
      )}

      {/* Audio player */}
      {job.audio_url && (job.status === 'completed' || job.status === 'approved') && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-secondary/40">
          <button
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-amber-500/20 hover:bg-amber-500/30 flex items-center justify-center shrink-0 transition-colors"
          >
            {playing
              ? <Pause className="w-3 h-3 text-amber-400" />
              : <Play className="w-3 h-3 text-amber-400 translate-x-px" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="w-full h-1.5 rounded-full bg-border/40 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500/60 w-0 transition-all" style={{ width: playing ? '100%' : '0%', transition: playing ? 'width 3s linear' : 'none' }} />
            </div>
          </div>
          <audio ref={audioRef} src={job.audio_url} onEnded={handleEnded} className="hidden" />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 flex-wrap">
        {(job.status === 'completed') && !job.approved && (
          <Button
            size="sm"
            onClick={() => onApprove(job.id)}
            className="h-6 text-[10px] px-2 bg-green-500/80 hover:bg-green-500 text-white gap-1"
          >
            <CheckCircle2 className="w-2.5 h-2.5" /> Approve
          </Button>
        )}
        {job.approved && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUnapprove(job.id)}
            className="h-6 text-[10px] px-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
          >
            Approved ✓
          </Button>
        )}
        {job.approved && !job.sent_to_export && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSendToExport(job.id)}
            className="h-6 text-[10px] px-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            title="Send to export"
          >
            <Send className="w-2.5 h-2.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(job.id)}
          className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive ml-auto"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
}