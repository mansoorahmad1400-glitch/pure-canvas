import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown, ChevronUp, Mic, Music2, Waves, Sparkles,
  Loader2, AlertCircle, Upload, Package
} from 'lucide-react';
import AudioJobCard from './AudioJobCard';

const LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'ur',    label: 'Urdu' },
  { code: 'ur_ro', label: 'Roman Urdu' },
  { code: 'hi',    label: 'Hindi' },
  { code: 'ar',    label: 'Arabic' },
  { code: 'ps',    label: 'Pashto' },
  { code: 'ps_ro', label: 'Roman Pashto' },
  { code: 'fr',    label: 'French' },
  { code: 'nl',    label: 'Dutch' },
];

const VOICE_STYLES = [
  { key: 'narrator_cinematic', label: 'Cinematic Narrator' },
  { key: 'narrator_dramatic',  label: 'Dramatic' },
  { key: 'narrator_calm',      label: 'Calm & Soothing' },
  { key: 'narrator_epic',      label: 'Epic' },
  { key: 'narrator_child',     label: 'Child-friendly' },
  { key: 'narrator_news',      label: 'News Anchor' },
];

const ACTION_BUTTONS = [
  { type: 'narration',     label: 'Narration',    Icon: Mic,     costKey: 'audio_narration',     planKey: 'canNarration' },
  { type: 'sound_effects', label: 'Sound FX',     Icon: Waves,   costKey: 'audio_sfx',           planKey: 'canSfx' },
  { type: 'music',         label: 'Music',        Icon: Music2,  costKey: 'audio_music_prompt',  planKey: 'canMusic' },
  { type: 'full_package',  label: 'Full Package', Icon: Package, costKey: 'audio_full_package',  planKey: 'canFullPackage' },
];

export default function SceneAudioPanel({
  scene,
  jobs,
  access,
  costs,
  voiceConfigured,
  musicConfigured,
  sfxConfigured,
  userBalance,
  projectLanguages,
  onGenerate,
  onApprove,
  onUnapprove,
  onSendToExport,
  onDelete,
  onUpload,
  generating,
}) {
  const [expanded, setExpanded] = useState(false);
  const [language, setLanguage] = useState(projectLanguages?.[0] || 'en');
  const [voiceStyle, setVoiceStyle] = useState('narrator_cinematic');
  const [promptOverride, setPromptOverride] = useState('');
  const fileRef = useRef(null);

  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'approved');
  const approvedJobs  = jobs.filter(j => j.approved);
  const hasJobs       = completedJobs.length > 0;

  const providerMap = {
    narration:     voiceConfigured,
    sound_effects: sfxConfigured,
    music:         musicConfigured,
    full_package:  voiceConfigured,
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(scene.scene_number, file);
    e.target.value = '';
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      approvedJobs.length > 0 ? 'border-green-500/25 bg-green-500/5' : 'border-border/40 bg-card/40'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-amber-400">{scene.scene_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Scene {scene.scene_number}</p>
          {scene.narration_text ? (
            <p className="text-[10px] text-muted-foreground truncate">{scene.narration_text.slice(0, 80)}…</p>
          ) : scene.visual_prompt ? (
            <p className="text-[10px] text-muted-foreground truncate italic">{scene.visual_prompt.slice(0, 80)}…</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {completedJobs.length > 0 && (
            <Badge className="text-[10px] bg-secondary text-muted-foreground border border-border/30">
              <Mic className="w-2.5 h-2.5 mr-1" />{completedJobs.length}
            </Badge>
          )}
          {approvedJobs.length > 0 && (
            <Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/20">✓ {approvedJobs.length} approved</Badge>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Scene metadata */}
      {(expanded || !hasJobs) && (scene.music_direction || scene.sound_effects || scene.dialogue_text) && (
        <div className="px-4 pt-3 grid gap-1.5 text-[10px] text-muted-foreground">
          {scene.dialogue_text && (
            <div className="p-2 rounded-lg bg-secondary/30 border border-border/20">
              <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 block mb-0.5">Dialogue</span>
              <p className="line-clamp-3">{scene.dialogue_text}</p>
            </div>
          )}
          {scene.music_direction && (
            <div className="p-2 rounded-lg bg-secondary/30 border border-border/20">
              <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 block mb-0.5">Music Direction</span>
              <p className="line-clamp-2">{scene.music_direction}</p>
            </div>
          )}
          {scene.sound_effects && (
            <div className="p-2 rounded-lg bg-secondary/30 border border-border/20">
              <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 block mb-0.5">Sound Effects</span>
              <p className="line-clamp-2">{scene.sound_effects}</p>
            </div>
          )}
        </div>
      )}

      {/* Existing jobs */}
      {completedJobs.length > 0 && (
        <div className="px-4 pt-3 space-y-2">
          {completedJobs.map(job => (
            <AudioJobCard
              key={job.id}
              job={job}
              onApprove={onApprove}
              onUnapprove={onUnapprove}
              onSendToExport={onSendToExport}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      {(expanded || !hasJobs) && (
        <div className="p-4 space-y-3">
          {/* Language + Voice style */}
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Language</p>
              <div className="flex flex-wrap gap-1">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    disabled={generating}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all ${
                      language === l.code
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                    } disabled:opacity-40`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Voice Style</p>
              <div className="flex flex-wrap gap-1">
                {VOICE_STYLES.map(v => (
                  <button
                    key={v.key}
                    onClick={() => setVoiceStyle(v.key)}
                    disabled={generating}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all ${
                      voiceStyle === v.key
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                    } disabled:opacity-40`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt override */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Prompt Override <span className="normal-case font-normal">(optional)</span>
            </p>
            <Textarea
              value={promptOverride}
              onChange={e => setPromptOverride(e.target.value)}
              placeholder={scene?.narration_text?.slice(0, 100) || 'Custom audio prompt…'}
              className="text-xs min-h-[48px] resize-none bg-background/60 border-border/40 focus:border-amber-500/50"
              disabled={generating}
            />
          </div>

          {/* Action buttons */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Generate</p>
            <div className="flex flex-wrap gap-1.5">
              {ACTION_BUTTONS.map(({ type, label, Icon, costKey, planKey }) => {
                const providerOk = providerMap[type];
                const planOk = access[planKey] || access.isAdmin;
                const cost = costs?.[costKey] ?? 3;
                const hasGems = access.isAdmin || userBalance >= cost;
                const disabled = generating || !planOk || !hasGems;
                const noProvider = !providerOk;

                return (
                  <button
                    key={type}
                    onClick={() => !disabled && !noProvider && onGenerate({
                      scene_number: scene.scene_number,
                      action_type: type,
                      language,
                      voice_style: voiceStyle,
                      prompt_override: promptOverride.trim() || undefined,
                    })}
                    disabled={disabled || noProvider}
                    title={
                      !planOk ? `Requires plan upgrade` :
                      noProvider ? `No ${type === 'music' ? 'music' : type === 'sound_effects' ? 'SFX' : 'voice'} provider configured` :
                      !hasGems ? `Need ${cost} gems` : ''
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${
                      generating
                        ? 'opacity-50 cursor-wait'
                        : disabled || noProvider
                          ? 'opacity-40 cursor-not-allowed border-border/20 text-muted-foreground'
                          : 'border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer'
                    }`}
                  >
                    {generating && type === generating
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Icon className="w-3 h-3" />}
                    {label}
                    <span className="text-[9px] opacity-70">{cost}💎</span>
                    {noProvider && <span className="text-[9px]">🔌</span>}
                    {!planOk && !noProvider && <span className="text-[9px]">🔒</span>}
                  </button>
                );
              })}

              {/* Upload button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border border-border/30 text-muted-foreground bg-secondary/30 hover:border-border/60 hover:text-foreground transition-all disabled:opacity-40"
              >
                <Upload className="w-3 h-3" /> Upload
                <span className="text-[9px] opacity-70">0💎</span>
              </button>
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {/* Status messages */}
          {!voiceConfigured && !musicConfigured && !sfxConfigured && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> No audio provider configured — gems will not be deducted.
            </p>
          )}
        </div>
      )}

      {/* Collapsed footer */}
      {!expanded && hasJobs && (
        <div className="px-4 pb-3 pt-2">
          <Button size="sm" variant="ghost" onClick={() => setExpanded(true)} className="h-7 text-xs text-muted-foreground gap-1">
            <Sparkles className="w-3 h-3" /> Generate more
          </Button>
        </div>
      )}
    </div>
  );
}