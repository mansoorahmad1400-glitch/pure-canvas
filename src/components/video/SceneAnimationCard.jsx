import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Play, RotateCcw, CheckCircle2, AlertCircle, Clock, Loader2,
  Gem, ChevronDown, ChevronUp, ImageOff, Lock, Sparkles, Link2
} from 'lucide-react';

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'text-muted-foreground', bg: 'bg-secondary',        border: 'border-border/30' },
  queued:      { label: 'Queued',      color: 'text-blue-400',          bg: 'bg-blue-500/10',       border: 'border-blue-500/20' },
  rendering:   { label: 'Rendering…', color: 'text-amber-400',         bg: 'bg-amber-500/10',      border: 'border-amber-500/20' },
  completed:   { label: 'Complete',   color: 'text-green-400',          bg: 'bg-green-500/10',      border: 'border-green-500/20' },
  failed:      { label: 'Failed',     color: 'text-destructive',        bg: 'bg-destructive/10',    border: 'border-destructive/20' },
};

const GEM_COST_MAP = {
  '480p-6':  'video_480p_6s',
  '480p-10': 'video_480p_10s',
  '480p-15': 'video_480p_15s',
  '720p-6':  'video_720p_6s',
  '720p-10': 'video_720p_10s',
  '720p-15': 'video_720p_15s',
};

export default function SceneAnimationCard({
  scene,
  job,
  approvedImage,
  gemCosts,
  providerConfigured,
  planAccess,
  userBalance,
  projectId,
  onSubmit,
  onCancel,
  submitting,
  isSelected = false,
  onToggleSelect,
  showSelect = false,
}) {
  const [resolution, setResolution] = useState(job?.resolution || '480p');
  const [duration, setDuration] = useState(job?.duration || 6);
  const [motionPrompt, setMotionPrompt] = useState(job?.motion_prompt || '');
  const [transitionPrompt, setTransitionPrompt] = useState(job?.transition_directive || '');
  const [expanded, setExpanded] = useState(false);
  const [generatingMotion, setGeneratingMotion] = useState(false);
  const [approved, setApproved] = useState(job?.approved || false);

  // Use approved GeneratedImage first, fall back to StoryboardScene approved image
  const anchorImageUrl = approvedImage?.image_url || scene?.approved_image_url || null;
  const isApproved = !!anchorImageUrl;

  const costKey = GEM_COST_MAP[`${resolution}-${duration}`];
  const isRegen = !!job && job.status !== 'not_started';
  const regenKey = costKey ? costKey + '_regen' : null;
  const gemCost = isRegen ? (gemCosts?.[regenKey] ?? 45) : (gemCosts?.[costKey] ?? 20);
  const hasEnoughGems = userBalance >= gemCost;
  const canAnimate = isApproved && planAccess && providerConfigured && hasEnoughGems;

  const status = job?.status || 'not_started';
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;

  const handleGenerateMotion = async () => {
    const prompt = scene?.visual_prompt || scene?.approved_prompt || '';
    if (!prompt) { toast.error('No visual prompt available for this scene'); return; }
    setGeneratingMotion(true);
    try {
      const res = await base44.functions.invoke('videoPipeline', {
        action: 'generate_motion_prompt',
        scene_number: scene.scene_number,
        visual_prompt: prompt,
        project_id: projectId,
      });
      if (res.data?.motion_prompt) {
        setMotionPrompt(res.data.motion_prompt);
        if (res.data.transition_hint && !transitionPrompt) {
          setTransitionPrompt(res.data.transition_hint);
        }
        if (!expanded) setExpanded(true);
        toast.success('Motion prompt generated');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to generate motion prompt');
    }
    setGeneratingMotion(false);
  };

  const handleSubmit = () => {
    onSubmit({
      scene_number: scene.scene_number,
      anchor_image_url: anchorImageUrl,
      motion_prompt: motionPrompt,
      transition_directive: transitionPrompt,
      resolution,
      duration,
    });
  };

  const handleApprove = async () => {
    try {
      await base44.functions.invoke('videoPipeline', { action: 'approve_video', job_id: job.id });
      setApproved(true);
      toast.success('Video clip approved ✓');
    } catch (e) {
      toast.error(e.message || 'Failed to approve');
    }
  };

  const handleUnapprove = async () => {
    try {
      await base44.functions.invoke('videoPipeline', { action: 'unapprove_video', job_id: job.id });
      setApproved(false);
      toast.success('Approval removed');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      status === 'completed' ? 'border-green-500/25 bg-green-500/5' :
      status === 'failed'    ? 'border-destructive/20 bg-destructive/5' :
      status === 'rendering' ? 'border-amber-500/20 bg-amber-500/5' :
      'border-border/40 bg-card/40'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        {showSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => onToggleSelect?.(e.target.checked)}
            className="w-4 h-4 rounded border-border/40 text-primary focus:ring-primary/50"
            onClick={e => e.stopPropagation()}
          />
        )}
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">{scene.scene_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Scene {scene.scene_number}</p>
          {job?.video_url && (
            <p className="text-[10px] text-muted-foreground">{job.resolution} · {job.duration}s · {job.provider}</p>
          )}
        </div>
        <Badge className={`text-[10px] border ${sc.bg} ${sc.border} ${sc.color} shrink-0`}>
          {status === 'rendering' && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
          {status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
          {status === 'failed' && <AlertCircle className="w-2.5 h-2.5 mr-1" />}
          {sc.label}
        </Badge>
        <button onClick={() => setExpanded(e => !e)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
        {/* Anchor frame thumbnail */}
        <div className="relative w-full sm:w-[120px] aspect-video rounded-xl overflow-hidden border border-border/30 shrink-0 bg-secondary/40">
          {isApproved ? (
            <>
              <img src={anchorImageUrl} alt={`Scene ${scene.scene_number}`} className="w-full h-full object-cover" />
              {job?.status === 'completed' && job?.video_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Play className="w-6 h-6 text-white" fill="white" />
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/50">
              <ImageOff className="w-5 h-5" />
              <span className="text-[9px] text-center leading-tight px-1">
                {!scene?.image_url && !approvedImage ? 'No image yet' : 'Not approved'}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3 min-w-0">
          {/* Resolution + Duration + Cost */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resolution</p>
              <div className="flex gap-1">
                {['480p', '720p'].map(r => (
                  <button key={r} onClick={() => setResolution(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      resolution === r
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                    }`}
                  >{r}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
              <div className="flex gap-1">
                {[6, 10, 15].map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      duration === d
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                    }`}
                  >{d}s</button>
                ))}
              </div>
            </div>
            <div className="ml-auto self-end">
              <span className={`text-xs font-bold flex items-center gap-1 ${hasEnoughGems || !planAccess ? 'text-primary' : 'text-destructive'}`}>
                <Gem className="w-3 h-3" />
                {gemCost} gems {isRegen && <span className="text-[10px] font-normal text-muted-foreground">(regen)</span>}
              </span>
            </div>
          </div>

          {/* Expanded: motion prompt editor */}
          {expanded && (
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Motion Prompt</label>
                  <Button
                    size="sm" variant="ghost"
                    className="h-6 text-[10px] gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2"
                    onClick={handleGenerateMotion}
                    disabled={generatingMotion}
                  >
                    {generatingMotion ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                    {generatingMotion ? 'Generating…' : 'Auto-Generate'}
                  </Button>
                </div>
                <Textarea
                  value={motionPrompt}
                  onChange={e => setMotionPrompt(e.target.value)}
                  placeholder="Describe camera motion, character movement, atmosphere… or click Auto-Generate"
                  className="text-xs min-h-[72px] resize-none bg-background/60 border-border/40 focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Transition to Next Scene</label>
                <Textarea
                  value={transitionPrompt}
                  onChange={e => setTransitionPrompt(e.target.value)}
                  placeholder="Fade to black, cross-dissolve, whip pan right…"
                  className="text-xs min-h-[44px] resize-none bg-background/60 border-border/40 focus:border-primary/50"
                />
              </div>
              {/* Frame chaining fields — future use */}
              <div className="rounded-lg bg-secondary/20 border border-border/20 px-3 py-2 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                <p className="text-[10px] text-muted-foreground/50">
                  Frame chaining ready — last frame of this clip will auto-link to the next scene when a video provider is active.
                </p>
              </div>
            </div>
          )}

          {/* Gate messages */}
          {!isApproved && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80">
              <Lock className="w-3 h-3 shrink-0" />
              {!scene?.image_url && !approvedImage
                ? 'Generate a scene image first, then approve it to animate.'
                : 'Approve a scene image in the Images tab to unlock animation.'}
            </div>
          )}
          {isApproved && !planAccess && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80">
              <Lock className="w-3 h-3 shrink-0" />
              Creator Pro or higher required for video animation.
            </div>
          )}
          {isApproved && planAccess && !providerConfigured && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" />
              Video provider not configured yet — rendering not available. Gems will not be deducted.
            </div>
          )}
          {isApproved && planAccess && providerConfigured && !hasEnoughGems && (
            <div className="flex items-center gap-1.5 text-[11px] text-destructive/80">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Not enough gems. Need {gemCost}, have {userBalance}.
            </div>
          )}

          {/* Error */}
          {job?.error_message && status === 'failed' && (
            <div className="text-[11px] text-destructive/80 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {job.error_message}
              {job.gems_refunded > 0 && <span className="ml-1 text-green-400">({job.gems_refunded} gems refunded)</span>}
            </div>
          )}

          {/* Video player */}
          {job?.video_url && status === 'completed' && (
            <div className={`rounded-xl overflow-hidden border ${approved ? 'border-green-500/40 bg-green-500/5' : 'border-green-500/20 bg-black/20'}`}>
              <video src={job.video_url} controls className="w-full max-h-48" />
              {approved && (
                <div className="absolute top-2 right-2">
                  <Badge className="text-[9px] h-5 bg-green-500/90 text-white border-0">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Approved
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap items-center">
            {(status === 'not_started' || status === 'failed') && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!canAnimate || submitting}
                className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {status === 'failed' ? 'Retry' : 'Animate Scene'}
              </Button>
            )}
            {status === 'completed' && (
              <>
                <Button size="sm" variant="outline" onClick={handleSubmit} disabled={!canAnimate || submitting}
                  className="h-8 text-xs gap-1.5 border-border/40">
                  <RotateCcw className="w-3 h-3" /> Regenerate
                </Button>
                {approved ? (
                  <Button size="sm" variant="outline" onClick={handleUnapprove}
                    className="h-8 text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleApprove}
                    className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="w-3 h-3" /> Approve Clip
                  </Button>
                )}
              </>
            )}
            {(status === 'queued' || status === 'rendering') && (
              <Button size="sm" variant="outline" onClick={() => onCancel(job?.id)}
                className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                Cancel
              </Button>
            )}
            {!expanded && (
              <Button size="sm" variant="ghost" onClick={() => setExpanded(true)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1">
                {generatingMotion ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                {generatingMotion ? 'Building motion…' : 'Motion Prompts'}
              </Button>
            )}
            {!expanded && isApproved && !motionPrompt && (
              <Button size="sm" variant="ghost" onClick={handleGenerateMotion} disabled={generatingMotion}
                className="h-8 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1">
                <Sparkles className="w-3 h-3" />
                Auto Motion
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}