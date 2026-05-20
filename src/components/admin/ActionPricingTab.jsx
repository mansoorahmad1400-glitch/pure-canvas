import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Image, Video, Music, Upload } from 'lucide-react';

// ─── Action Definitions ───────────────────────────────────────────────────────

export const ACTION_GROUPS = [
  {
    key: 'text',
    label: 'Text / Blueprint',
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    active: true,
    actions: [
      { key: 'generate_blueprint',        label: 'Generate full master blueprint',           default: 1 },
      { key: 'regenerate_blueprint',      label: 'Regenerate full master blueprint',         default: 1 },
      { key: 'regen_section_story',       label: 'Regenerate Section A: Story / Script',     default: 1 },
      { key: 'regen_section_visual',      label: 'Regenerate Section B: Visual Prompts',     default: 1 },
      { key: 'regen_section_sound',       label: 'Regenerate Section C: Sound / Music',      default: 1 },
      { key: 'regen_section_youtube',     label: 'Regenerate Section D: YouTube Package',    default: 1 },
      { key: 'regen_section_thumbnail',   label: 'Regenerate Section E: Thumbnail Direction',default: 1 },
      { key: 'improve_text',              label: 'Improve / Rewrite selected text',          default: 1 },
      { key: 'translate_output',          label: 'Translate output',                         default: 1 },
      { key: 'expand_output',             label: 'Expand output',                            default: 1 },
      { key: 'shorten_output',            label: 'Shorten output',                           default: 1 },
      { key: 'manual_edit',               label: 'Manual user edit',                         default: 0 },
    ],
  },
  {
    key: 'image',
    label: 'Image',
    icon: Image,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    active: false,
    actions: [
      { key: 'image_storyboard_standard',       label: 'Generate storyboard image (standard)',           default: 3 },
      { key: 'image_storyboard_standard_regen',  label: 'Regenerate storyboard image (standard)',         default: 4 },
      { key: 'image_storyboard_quality',         label: 'Generate storyboard image (quality)',            default: 5 },
      { key: 'image_storyboard_quality_regen',   label: 'Regenerate storyboard image (quality)',          default: 6 },
      { key: 'image_storyboard_pro',             label: 'Generate storyboard image (pro cinematic)',      default: 7 },
      { key: 'image_storyboard_pro_regen',       label: 'Regenerate storyboard image (pro cinematic)',    default: 8 },
      { key: 'image_text_edit',                  label: 'Text-guided image edit',                         default: 3 },
      { key: 'image_thumbnail',                  label: 'Generate thumbnail image',                       default: 5 },
      { key: 'image_character',                  label: 'Generate character concept image',               default: 5 },
      { key: 'image_facelock',                   label: 'Face-lock character image',                      default: 2 },
      { key: 'image_generate_standard',          label: 'Generate scene image (standard)',                 default: 5 },
      { key: 'image_generate_hd',                label: 'Generate scene image (HD)',                       default: 10 },
      { key: 'image_regenerate_standard',        label: 'Regenerate scene image (standard)',               default: 6 },
      { key: 'image_regenerate_hd',              label: 'Regenerate scene image (HD)',                     default: 12 },
      { key: 'image_upscale',                    label: 'Upscale scene image',                             default: 8 },
      { key: 'image_consistency_surcharge',      label: 'Character consistency surcharge (+cost)',          default: 5 },
    ],
  },
  {
    id: 'audio',
    label: 'Audio & Voice',
    icon: '🎙️',
    active: true,
    actions: [
      { key: 'audio_narration',    label: 'Generate narration voice',        default: 3 },
      { key: 'audio_regen',        label: 'Regenerate narration voice',       default: 4 },
      { key: 'audio_sfx',          label: 'Generate sound effects',           default: 4 },
      { key: 'audio_music_prompt', label: 'Generate music prompt / track',    default: 1 },
      { key: 'audio_full_package', label: 'Full scene audio package',         default: 5 },
      { key: 'audio_upload',       label: 'Attach uploaded audio',            default: 0 },
    ],
  },
  {
    key: 'video',
    label: 'Video / Animation',
    icon: Video,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    active: false,
    actions: [
      { key: 'video_480p_6s',        label: 'Animate scene 480p 6 seconds',          default: 20 },
      { key: 'video_480p_10s',       label: 'Animate scene 480p 10 seconds',         default: 35 },
      { key: 'video_720p_6s',        label: 'Animate scene 720p 6 seconds',          default: 30 },
      { key: 'video_720p_10s',       label: 'Animate scene 720p 10 seconds',         default: 50 },
      { key: 'video_480p_6s_regen',  label: 'Regenerate animation 480p 6 seconds',   default: 30 },
      { key: 'video_480p_10s_regen', label: 'Regenerate animation 480p 10 seconds',  default: 45 },
      { key: 'video_720p_6s_regen',  label: 'Regenerate animation 720p 6 seconds',   default: 55 },
      { key: 'video_720p_10s_regen', label: 'Regenerate animation 720p 10 seconds',  default: 60 },
      { key: 'video_motion_change',  label: 'Apply motion change',                   default: 20 },
      { key: 'video_transition',     label: 'Apply transition change',               default: 10 },
      { key: 'video_extend_scene',   label: 'Extend scene',                          default: 30 },
      { key: 'video_upscale',        label: 'Upscale video',                         default: 10 },
    ],
  },
  {
    key: 'audio',
    label: 'Audio',
    icon: Music,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    active: false,
    actions: [
      { key: 'audio_narration',       label: 'Generate narration voice',          default: 3 },
      { key: 'audio_narration_regen', label: 'Regenerate narration voice',        default: 4 },
      { key: 'audio_sfx',             label: 'Generate sound effect',             default: 4 },
      { key: 'audio_music_prompt',    label: 'Generate music prompt',             default: 1 },
      { key: 'audio_scene_package',   label: 'Generate full scene audio package', default: 5 },
    ],
  },
  {
    key: 'export',
    label: 'Export / Publish',
    icon: Upload,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    active: true,
    actions: [
      { key: 'export_storyboard_pdf',   label: 'Export Storyboard PDF',         default: 2 },
      { key: 'export_image_zip',        label: 'Export Image Pack (ZIP)',        default: 3 },
      { key: 'export_audio_zip',        label: 'Export Audio Package (ZIP)',     default: 2 },
      { key: 'export_prompt_pack',      label: 'Export Prompt Pack (TXT)',       default: 0 },
      { key: 'export_narration_script', label: 'Export Narration Script (TXT)',  default: 0 },
      { key: 'export_subtitles_srt',    label: 'Export Subtitles (SRT)',         default: 1 },
      { key: 'export_shorts_480p',      label: 'Render Short Video (480p MP4)', default: 20 },
      { key: 'export_shorts_720p',      label: 'Render Short Video (720p MP4)', default: 35 },
      { key: 'export_cinematic_1080p',  label: 'Render Cinematic (1080p MP4)',  default: 50 },
    ],
  },
];

// Build a flat default map for easy lookup
export const DEFAULT_ACTION_COSTS = {};
ACTION_GROUPS.forEach(g => g.actions.forEach(a => { DEFAULT_ACTION_COSTS[a.key] = a.default; }));

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActionPricingTab({ costs, setCosts }) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('all');

  const setActionCost = (key, value) => {
    setCosts(prev => ({ ...prev, [key]: value }));
  };

  const filteredGroups = useMemo(() => {
    return ACTION_GROUPS
      .map(group => ({
        ...group,
        actions: group.actions.filter(a =>
          (activeGroup === 'all' || activeGroup === group.key) &&
          (!search || a.label.toLowerCase().includes(search.toLowerCase()))
        ),
      }))
      .filter(g => g.actions.length > 0);
  }, [search, activeGroup]);

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveGroup('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activeGroup === 'all'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-card/40 border-border/30 text-muted-foreground hover:border-border/60'
            }`}
          >
            All
          </button>
          {ACTION_GROUPS.map(g => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                activeGroup === g.key
                  ? `${g.bg} ${g.border} ${g.color}`
                  : 'bg-card/40 border-border/30 text-muted-foreground hover:border-border/60'
              }`}
            >
              <g.icon className="w-3 h-3" /> {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Groups */}
      {filteredGroups.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">No actions match your search.</div>
      )}

      {filteredGroups.map(group => (
        <div key={group.key} className={`rounded-xl border ${group.border} bg-card/30 overflow-hidden`}>
          {/* Group Header */}
          <div className={`flex items-center justify-between px-4 py-3 ${group.bg} border-b ${group.border}`}>
            <div className="flex items-center gap-2">
              <group.icon className={`w-4 h-4 ${group.color}`} />
              <span className={`text-sm font-bold ${group.color}`}>{group.label}</span>
            </div>
            {!group.active && (
              <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground">
                Future Ready
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="divide-y divide-border/20">
            {group.actions.map(action => {
              const currentCost = costs[action.key] ?? action.default;
              const isChanged = currentCost !== action.default;
              return (
                <div
                  key={action.key}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-card/40 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <span className={`text-sm ${group.active ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                      {action.label}
                    </span>
                    {isChanged && (
                      <span className="ml-2 text-[10px] text-amber-400/80">(default: {action.default}💎)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={currentCost}
                      onChange={e => setActionCost(action.key, Number(e.target.value))}
                      className="h-7 w-20 text-xs text-center bg-background/60 border-border/40 focus:border-primary/50"
                    />
                    <span className="text-xs text-muted-foreground w-4">💎</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}