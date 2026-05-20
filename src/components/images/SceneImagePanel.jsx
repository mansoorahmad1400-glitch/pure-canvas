import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, ChevronDown, ChevronUp, Loader2, AlertCircle,
  ImageIcon, Users, Gem, Pencil
} from 'lucide-react';

import StylePresetPicker from './StylePresetPicker';
import ImageCard from './ImageCard';
import { resolveScriptStyle, getStyleLabel } from '@/lib/scriptStyleResolver';

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '21:9'];

export default function SceneImagePanel({
  scene,           // { scene_number, visual_prompt, ... }
  images,          // GeneratedImage[] for this scene
  characters,      // ProjectCharacter[] for this project
  project,         // full project object (for style resolution)
  access,          // { canGenerate, canHD, canUpscale, canConsistency, maxPerScene, isAdmin }
  costs,           // { image_generate_standard, ... }
  providerConfigured,
  userBalance,
  onGenerate,
  onApprove,
  onUnapprove,
  onSendToVideo,
  onDelete,
  onReplace,
  generating,      // boolean — is this scene currently generating?
}) {
  const [expanded, setExpanded] = useState(false);
  const [stylePreset, setStylePreset] = useState('disney_inspired');
  const [aspectRatio, setAspectRatio] = useState(scene?.aspect_ratio || '16:9');
  const [quality, setQuality] = useState('standard');
  const [consistencyMode, setConsistencyMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState('');

  // Resolve the script-derived style key and label
  const resolvedScriptStyleKey = resolveScriptStyle(project);
  const resolvedScriptStyleLabel = getStyleLabel(resolvedScriptStyleKey);
  // The effective preset to actually use for generation
  const effectiveStylePreset = stylePreset === 'script_style' ? resolvedScriptStyleKey : stylePreset;

  const completedImages = images.filter(i => i.status === 'completed');
  const pendingImage = images.find(i => i.status === 'generating');
  const isRegen = completedImages.length > 0;
  const hasApproved = images.some(i => i.approved);

  const baseCostKey = quality === 'hd'
    ? (isRegen ? 'image_regenerate_hd' : 'image_generate_hd')
    : (isRegen ? 'image_regenerate_standard' : 'image_generate_standard');
  const gemCost = (costs?.[baseCostKey] ?? 5) + (consistencyMode ? (costs?.image_consistency_surcharge ?? 5) : 0);

  const sceneChars = characters.filter(c => c.scenes?.includes(scene.scene_number));
  const hasEnoughGems = access.isAdmin || userBalance >= gemCost;

  const canGenerate = providerConfigured && access.canGenerate && hasEnoughGems
    && (access.isAdmin || completedImages.length < access.maxPerScene);

  const promptToUse = customPrompt.trim() || scene?.visual_prompt || '';

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      hasApproved ? 'border-green-500/25 bg-green-500/5' : 'border-border/40 bg-card/40'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-purple-400">{scene.scene_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Scene {scene.scene_number}</p>
          {scene.visual_prompt && (
            <p className="text-[10px] text-muted-foreground truncate">{scene.visual_prompt.slice(0, 80)}…</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {completedImages.length > 0 && (
            <Badge className="text-[10px] bg-secondary text-muted-foreground border border-border/30">
              <ImageIcon className="w-2.5 h-2.5 mr-1" />{completedImages.length}
            </Badge>
          )}
          {hasApproved && <Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/20">✓ Approved</Badge>}
          <button onClick={() => setExpanded(e => !e)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Generated images gallery */}
      {(completedImages.length > 0 || pendingImage) && (
        <div className={`px-4 pt-3 grid gap-3 ${(completedImages.length + (pendingImage ? 1 : 0)) === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {completedImages.map(img => (
            <ImageCard
              key={img.id}
              image={img}
              onApprove={onApprove}
              onUnapprove={onUnapprove}
              onSendToVideo={onSendToVideo}
              onDelete={onDelete}
              onReplace={onReplace}
              isApproving={false}
            />
          ))}
          {pendingImage && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 aspect-video flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <p className="text-[11px] text-purple-400/80 font-medium">Generating…</p>
            </div>
          )}
        </div>
      )}

      {/* Generation controls (expanded or no images yet) */}
      {(expanded || completedImages.length === 0) && (
        <div className="p-4 space-y-3">
          {/* Style preset */}
          <StylePresetPicker
            value={stylePreset}
            onChange={setStylePreset}
            disabled={generating}
            scriptStyleLabel={resolvedScriptStyleLabel}
          />

          {/* Aspect ratio + Quality */}
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Aspect Ratio</p>
              <div className="flex gap-1">
                {ASPECT_RATIOS.map(r => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    disabled={generating}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      aspectRatio === r
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                    } disabled:opacity-40`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Quality</p>
              <div className="flex gap-1">
                {[
                  { key: 'standard', label: 'Standard' },
                  { key: 'hd',       label: 'HD', locked: !access.canHD },
                ].map(q => (
                  <button
                    key={q.key}
                    onClick={() => !q.locked && setQuality(q.key)}
                    disabled={generating || q.locked}
                    title={q.locked ? 'Requires Starter or higher' : ''}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      quality === q.key
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {q.label}{q.locked ? ' 🔒' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Character consistency */}
          {access.canConsistency && sceneChars.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Character Consistency
              </p>
              <button
                onClick={() => setConsistencyMode(c => !c)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  consistencyMode
                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                    : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                }`}
              >
                <div className={`w-8 h-4 rounded-full transition-colors relative ${consistencyMode ? 'bg-purple-500' : 'bg-border/60'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${consistencyMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <Users className="w-3 h-3" />
                Inject {sceneChars.length} character description{sceneChars.length !== 1 ? 's' : ''}
                <span className="text-[10px] text-muted-foreground">+{costs?.image_consistency_surcharge ?? 5}💎</span>
              </button>
            </div>
          )}

          {/* Edit instruction (for regen) / Custom prompt (for first gen) */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              {isRegen ? 'What to change' : 'Prompt Override'}
              <span className="normal-case font-normal ml-1">
                {isRegen ? '(describe what you want different)' : '(optional — uses scene prompt if empty)'}
              </span>
            </p>
            <Textarea
              value={isRegen ? editInstruction : customPrompt}
              onChange={e => isRegen ? setEditInstruction(e.target.value) : setCustomPrompt(e.target.value)}
              placeholder={isRegen
                ? 'e.g. make the sky darker, add more fog, change lighting to sunset…'
                : (scene?.visual_prompt?.slice(0, 120) || 'Custom image prompt…')}
              className="text-xs min-h-[56px] resize-none bg-background/60 border-border/40 focus:border-purple-500/50"
              disabled={generating}
            />
          </div>

          {/* Gate messages */}
          {!providerConfigured && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> Image provider not connected yet — no gems will be deducted.
            </p>
          )}
          {providerConfigured && !access.canGenerate && !access.isAdmin && (
            <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> Image generation requires a paid plan.
            </p>
          )}
          {providerConfigured && access.canGenerate && !access.isAdmin && completedImages.length >= access.maxPerScene && (
            <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> Scene image limit reached ({access.maxPerScene}) for your plan.
            </p>
          )}
          {providerConfigured && access.canGenerate && !hasEnoughGems && (
            <p className="text-[11px] text-destructive/80 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> Not enough gems. Need {gemCost}, have {userBalance}.
            </p>
          )}

          {/* Generate button */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => {
                const basePrompt = isRegen && editInstruction.trim()
                  ? `${scene?.visual_prompt || ''}\n\nChanges requested: ${editInstruction.trim()}`
                  : promptToUse;
                onGenerate({
                  scene_number: scene.scene_number,
                  base_prompt: basePrompt,
                  style_preset: effectiveStylePreset,
                  style_source: stylePreset === 'script_style' ? 'script' : 'manual',
                  script_context: {
                    project_type: project?.project_type,
                    audience: project?.audience,
                    tone: project?.tone,
                    mood: project?.mood,
                    visual_style_key: resolvedScriptStyleKey,
                  },
                  aspect_ratio: aspectRatio,
                  quality,
                  consistency_mode: consistencyMode,
                });
              }}
              disabled={!canGenerate || generating}
              className="h-9 text-sm bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {generating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating…' : isRegen ? 'Regenerate' : 'Generate Image'}
            </Button>
            <span className={`text-xs font-medium flex items-center gap-1 ${hasEnoughGems ? 'text-primary' : 'text-destructive'}`}>
              <Gem className="w-3 h-3" /> {gemCost} gems
            </span>
          </div>
        </div>
      )}

      {/* Collapsed footer — quick regenerate with edit instruction */}
      {!expanded && completedImages.length > 0 && (
        <div className="px-4 pb-3 pt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Textarea
              value={editInstruction}
              onChange={e => setEditInstruction(e.target.value)}
              placeholder="Describe what to change and regenerate…"
              className="text-xs min-h-[36px] max-h-[72px] resize-none bg-background/60 border-border/40 focus:border-purple-500/50 flex-1"
              disabled={generating}
              rows={1}
            />
            <Button
              size="sm"
              onClick={() => {
                const basePrompt = editInstruction.trim()
                  ? `${scene?.visual_prompt || ''}\n\nChanges requested: ${editInstruction.trim()}`
                  : (scene?.visual_prompt || '');
                onGenerate({
                  scene_number: scene.scene_number,
                  base_prompt: basePrompt,
                  style_preset: resolveScriptStyle(project),
                  style_source: 'script',
                  script_context: {
                    project_type: project?.project_type,
                    audience: project?.audience,
                    tone: project?.tone,
                    mood: project?.mood,
                    visual_style_key: resolveScriptStyle(project),
                  },
                  aspect_ratio: aspectRatio,
                  quality: 'standard',
                  consistency_mode: false,
                });
              }}
              disabled={generating || !canGenerate}
              className="h-9 shrink-0 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generating ? 'Generating…' : 'Regenerate'}
            </Button>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
          >
            <ChevronDown className="w-3 h-3" /> More options
          </button>
        </div>
      )}
    </div>
  );
}