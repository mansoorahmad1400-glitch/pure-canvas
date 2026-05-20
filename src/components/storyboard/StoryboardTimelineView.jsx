import { motion } from 'framer-motion';
import { Clock, Camera, Film, Check, Users, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CAMERA_SHORT = {
  wide_shot: 'WS', medium_shot: 'MS', close_up: 'CU', extreme_close_up: 'ECU',
  birds_eye: 'BE', low_angle: 'LA', dutch_angle: 'DA', tracking_shot: 'TRK',
  dolly_in: 'D↑', dolly_out: 'D↓', pan_left: 'PL', pan_right: 'PR',
  tilt_up: 'TU', tilt_down: 'TD', aerial: 'AER', over_shoulder: 'OS',
};

const PACING_BG = {
  slow: 'bg-blue-500/20 border-blue-500/30',
  medium: 'bg-green-500/20 border-green-500/30',
  fast: 'bg-orange-500/20 border-orange-500/30',
  dynamic: 'bg-purple-500/20 border-purple-500/30',
};

export default function StoryboardTimelineView({ scenes }) {
  const totalDuration = scenes.reduce((s, c) => s + (c.scene_duration || 6), 0);

  return (
    <div className="space-y-4">
      {/* Timeline ruler */}
      <div className="flex items-center gap-2 px-1">
        <Clock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
        <div className="flex-1 relative h-2 bg-border/30 rounded-full overflow-hidden">
          {scenes.map((scene, i) => {
            const pct = ((scene.scene_duration || 6) / totalDuration) * 100;
            const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
            return (
              <div
                key={scene.id}
                className={`absolute top-0 h-full ${colors[i % colors.length]} opacity-60`}
                style={{
                  left: `${scenes.slice(0, i).reduce((s, c) => s + (c.scene_duration || 6), 0) / totalDuration * 100}%`,
                  width: `${pct}%`,
                }}
              />
            );
          })}
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{totalDuration}s total</span>
      </div>

      {/* Timeline cards — horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {scenes.map((scene, i) => {
          const widthPct = ((scene.scene_duration || 6) / totalDuration) * 100;
          const minW = Math.max(160, widthPct * 8);
          return (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className={`shrink-0 rounded-xl border overflow-hidden ${
                scene.approved ? 'border-green-500/30 bg-green-500/5' : 'border-border/40 bg-card/50'
              }`}
              style={{ minWidth: `${minW}px`, width: `${minW}px` }}
            >
              {/* Scene number + duration bar */}
              <div className={`px-3 py-1.5 flex items-center justify-between ${PACING_BG[scene.pacing] || PACING_BG.medium} border-b border-border/20`}>
                <span className="text-[10px] font-bold text-foreground/80">S{scene.scene_number}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{scene.scene_duration}s</span>
                  {scene.approved && <Check className="w-3 h-3 text-green-400" />}
                </div>
              </div>

              {/* Content */}
              <div className="p-2.5 space-y-2">
                <p className="text-[10px] text-foreground/80 leading-snug line-clamp-3">
                  {scene.story_text?.slice(0, 120) || scene.visual_prompt?.slice(0, 120)}
                </p>

                {/* Cinematic info */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">
                    {CAMERA_SHORT[scene.camera_direction] || 'WS'}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">
                    {scene.transition_type?.replace('_', ' ') || 'cut'}
                  </span>
                </div>

                {/* Characters / location */}
                {scene.detected_characters?.length > 0 && (
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                    <Users className="w-2.5 h-2.5" />
                    <span className="truncate">{scene.detected_characters.slice(0, 2).join(', ')}</span>
                  </div>
                )}
                {scene.detected_location && (
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="truncate">{scene.detected_location.slice(0, 24)}</span>
                  </div>
                )}
              </div>

              {/* Transition connector */}
              <div className="px-2.5 pb-2 text-center">
                <span className="text-[9px] text-muted-foreground/40">→ {scene.transition_type?.replace('_', ' ')}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Scenes', value: scenes.length },
          { label: 'Total Duration', value: `${totalDuration}s` },
          { label: 'Approved', value: `${scenes.filter(s => s.approved).length}/${scenes.length}` },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-card/40 border border-border/30 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}