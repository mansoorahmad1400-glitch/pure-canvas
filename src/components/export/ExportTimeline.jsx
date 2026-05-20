import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Image, Mic, Music, Video, Clock, ChevronDown, ChevronUp } from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function SceneTimelineCard({ scene, sceneImages, sceneAudio, sceneVideo, estimatedStart }) {
  const [expanded, setExpanded] = useState(false);

  const approvedImage = sceneImages.find(i => i.approved) || sceneImages[0];
  const narration = sceneAudio.find(a => a.action_type === 'narration' && a.approved);
  const music = sceneAudio.find(a => a.action_type === 'music' && a.approved);
  const sfx = sceneAudio.find(a => a.action_type === 'sound_effects' && a.approved);
  const video = sceneVideo.find(v => v.status === 'completed');

  const sceneDuration = narration?.duration || video?.duration || 6;
  const isReady = scene.approved && approvedImage;

  return (
    <div className={`rounded-xl border ${isReady ? 'border-border/40' : 'border-border/20 opacity-70'} bg-card/30 overflow-hidden`}>
      <div className="flex items-stretch gap-0">
        {/* Thumbnail */}
        <div className="w-24 sm:w-32 shrink-0 bg-secondary/40 relative overflow-hidden">
          {approvedImage?.image_url ? (
            <img src={approvedImage.image_url} alt={`Scene ${scene.scene_number}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-5 h-5 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            S{scene.scene_number}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">Scene {scene.scene_number}</span>
                {isReady
                  ? <Badge className="text-[9px] bg-green-500/10 text-green-400 border-green-500/20">Ready</Badge>
                  : <Badge variant="outline" className="text-[9px] text-muted-foreground border-border/30">Pending</Badge>
                }
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {estimatedStart !== null ? `~${formatDuration(estimatedStart)}` : '—'} · {formatDuration(sceneDuration)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{scene.visual_prompt || scene.approved_prompt || 'No visual prompt'}</p>
            </div>
            <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Asset status row */}
          <div className="flex flex-wrap gap-3 mt-2">
            <AssetChip icon={Image} label="Image" ready={!!approvedImage} />
            <AssetChip icon={Mic} label="Narration" ready={!!narration} />
            <AssetChip icon={Music} label="Music" ready={!!music} />
            <AssetChip icon={Music} label="SFX" ready={!!sfx} />
            <AssetChip icon={Video} label="Animation" ready={!!video} />
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/30 px-4 py-3 grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Visual Prompt</p>
            <p className="text-foreground/80 leading-relaxed">{scene.visual_prompt || scene.approved_prompt || '—'}</p>
          </div>
          {narration && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Narration</p>
              <p className="text-foreground/80 leading-relaxed line-clamp-3">{narration.prompt_text || '—'}</p>
              {narration.audio_url && (
                <audio controls src={narration.audio_url} className="mt-1.5 h-7 w-full opacity-80" />
              )}
            </div>
          )}
          {video && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Animation Clip</p>
              <video src={video.video_url} controls className="w-full rounded-lg max-h-28" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssetChip({ icon: IconComp, label, ready }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] ${ready ? 'text-green-400' : 'text-muted-foreground/40'}`}>
      {ready ? <CheckCircle2 className="w-3 h-3" /> : <IconComp className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function ExportTimeline({ scenes, images, audioJobs, videoJobs }) {
  const totalDuration = scenes.reduce((sum, scene) => {
    const narration = audioJobs.find(j => j.scene_number === scene.scene_number && j.action_type === 'narration' && j.approved);
    const video = videoJobs.find(v => v.scene_number === scene.scene_number && v.status === 'completed');
    return sum + (narration?.duration || video?.duration || 6);
  }, 0);

  let elapsed = 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">Final Timeline</h3>
          <p className="text-xs text-muted-foreground">{scenes.length} scenes · Est. duration ~{Math.round(totalDuration)}s</p>
        </div>
        <Badge variant="outline" className="border-border/40 text-muted-foreground text-xs">
          <Clock className="w-3 h-3 mr-1" /> ~{Math.floor(totalDuration / 60)}m {Math.round(totalDuration % 60)}s total
        </Badge>
      </div>

      {scenes.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No scenes yet. Generate a storyboard to get started.
        </div>
      )}

      {scenes.map((scene, idx) => {
        const startTime = elapsed;
        const sceneImages = images.filter(i => i.scene_number === scene.scene_number);
        const sceneAudio = audioJobs.filter(j => j.scene_number === scene.scene_number);
        const sceneVideo = videoJobs.filter(v => v.scene_number === scene.scene_number);
        const narration = sceneAudio.find(a => a.action_type === 'narration' && a.approved);
        const video = sceneVideo.find(v => v.status === 'completed');
        elapsed += (narration?.duration || video?.duration || 6);
        return (
          <SceneTimelineCard
            key={scene.id}
            scene={scene}
            sceneImages={sceneImages}
            sceneAudio={sceneAudio}
            sceneVideo={sceneVideo}
            estimatedStart={startTime}
          />
        );
      })}
    </div>
  );
}