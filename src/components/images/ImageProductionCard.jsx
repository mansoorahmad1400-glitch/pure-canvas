import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronDown, ChevronUp, Sparkles, Loader2, AlertCircle,
  Users, MapPin, Palette, Gem, CheckCircle2, ImageIcon,
  Pencil, Film, Camera, RefreshCw, LayoutGrid
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StylePresetPicker from './StylePresetPicker';
import ImageCompareGrid from './ImageCompareGrid';
import { resolveScriptStyle, getStyleLabel } from '@/lib/scriptStyleResolver';

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '21:9'];

const CAMERA_LABELS = {
  wide_shot: 'Wide', medium_shot: 'Medium', close_up: 'Close-Up',
  extreme_close_up: 'Extreme CU', birds_eye: "Bird's Eye", low_angle: 'Low Angle',
  dutch_angle: 'Dutch', tracking_shot: 'Tracking', dolly_in: 'Dolly In',
  dolly_out: 'Dolly Out', aerial: 'Aerial', over_shoulder: 'Over Shoulder',
};

export default function ImageProductionCard({
  scene, images, characters, locations, project,
  access, costs, providerConfigured, userBalance,
  onGenerate, onApprove, onUnapprove, onSendToVideo, onDelete, onReplace,
  generating,
}) {
  const [expanded, setExpanded]         = useState(false);
  const [compareMode, setCompareMode]   = useState(false);
  const [stylePreset, setStylePreset]   = useState('script_style');
  const [aspectRatio, setAspectRatio]   = useState(scene?.camera_direction?.includes('9:16') ? '9:16' : '16:9');
  const [quality, setQuality]           = useState('standard');
  const [consistencyMode, setConsistencyMode] = useState(true);
  const [editInstruction, setEditInstruction] = useState('');
  const [promptOverride, setPromptOverride]   = useState('');
  const [uploadingManual, setUploadingManual] = useState(false);

  const resolvedStyleKey   = resolveScriptStyle(project);
  const resolvedStyleLabel = getStyleLabel(resolvedStyleKey);
  const effectiveStyle = stylePreset === 'script_style' ? resolvedStyleKey : stylePreset;

  const completedImages = images.filter(i => i.status === 'completed');
  const pendingImage    = images.find(i => i.status === 'generating');
  const isRegen         = completedImages.length > 0;
  const approvedImage   = completedImages.find(i => i.approved);
  const hasApproved     = !!approvedImage;

  // Characters for this scene
  const sceneChars = characters.filter(c =>
    c.scenes?.includes(scene.scene_number) ||
    (scene.detected_characters || []).some(name =>
      c.name?.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(c.name?.toLowerCase())
    )
  );
  const lockedChars = sceneChars.filter(c => c.lock_type === 'text' || c.lock_type === 'image');

  // Locations for this scene
  const sceneLocation = scene.detected_location;
  const matchedLocation = locations.find(l =>
    sceneLocation && (
      l.canonical_name?.toLowerCase().includes(sceneLocation.toLowerCase()) ||
      sceneLocation.toLowerCase().includes(l.canonical_name?.toLowerCase())
    )
  );
  const lockedLocations = locations.filter(l =>
    (l.lock_type === 'text' || l.lock_type === 'image') &&
    (l.scenes?.includes(scene.scene_number) || matchedLocation?.id === l.id)
  );

  // Gem cost calculation
  const baseCostKey = quality === 'hd'
    ? (isRegen ? 'image_regenerate_hd' : 'image_generate_hd')
    : (isRegen ? 'image_regenerate_standard' : 'image_generate_standard');
  const gemCost = (costs?.[baseCostKey] ?? 5) + (consistencyMode ? (costs?.image_consistency_surcharge ?? 5) : 0);
  const hasEnoughGems = access.isAdmin || userBalance >= gemCost;

  const canGenerate = providerConfigured && (access.canGenerate || access.isAdmin) && hasEnoughGems
    && (access.isAdmin || completedImages.length < access.maxPerScene);

  const handleGenerateClick = () => {
    const basePrompt = isRegen && editInstruction.trim()
      ? `${scene.visual_prompt || ''}\n\nChanges requested: ${editInstruction.trim()}`
      : (promptOverride.trim() || scene.visual_prompt || '');

    onGenerate({
      scene_number:    scene.scene_number,
      base_prompt:     basePrompt,
      style_preset:    effectiveStyle,
      style_source:    stylePreset === 'script_style' ? 'script' : 'manual',
      script_context:  {
        project_type:     project?.project_type,
        audience:         project?.audience,
        tone:             project?.tone,
        mood:             project?.mood,
        visual_style_key: resolvedStyleKey,
      },
      aspect_ratio:       aspectRatio,
      quality,
      consistency_mode:   consistencyMode && sceneChars.length > 0,
      camera_direction:   scene.camera_direction,
      storyboard_scene_id: scene.id,
    });
  };

  const handleManualUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingManual(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onGenerate({ scene_number: scene.scene_number, manual_image_url: file_url, aspect_ratio: aspectRatio });
    } catch {
      // handled upstream
    }
    setUploadingManual(false);
    e.target.value = '';
  };

  return (
    <motion.div
      layout
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        hasApproved
          ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.06)]'
          : 'border-border/40 bg-card/40'
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Scene number */}
        <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-purple-400">{scene.scene_number}</span>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Story text / visual prompt */}
          <p className="text-sm font-semibold text-foreground leading-snug">
            {scene.story_text
              ? scene.story_text.slice(0, 80) + (scene.story_text.length > 80 ? '…' : '')
              : `Scene ${scene.scene_number}`}
          </p>
          {/* Meta chips */}
          <div className="flex flex-wrap gap-1.5">
            {scene.camera_direction && (
              <span className="inline-flex items-center gap-1 text-[10px] text-sky-400/80 bg-sky-500/8 border border-sky-500/15 px-1.5 py-0.5 rounded">
                <Camera className="w-2.5 h-2.5" />
                {CAMERA_LABELS[scene.camera_direction] || scene.camera_direction}
              </span>
            )}
            {scene.pacing && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80 bg-amber-500/8 border border-amber-500/15 px-1.5 py-0.5 rounded capitalize">
                {scene.pacing}
              </span>
            )}
            {lockedChars.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-violet-400/80 bg-violet-500/8 border border-violet-500/15 px-1.5 py-0.5 rounded">
                <Users className="w-2.5 h-2.5" /> {lockedChars.length} char{lockedChars.length !== 1 ? 's' : ''}
              </span>
            )}
            {lockedLocations.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80 bg-emerald-500/8 border border-emerald-500/15 px-1.5 py-0.5 rounded">
                <MapPin className="w-2.5 h-2.5" /> {lockedLocations[0].canonical_name?.slice(0, 16)}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-background/40 border border-border/20 px-1.5 py-0.5 rounded">
              <Palette className="w-2.5 h-2.5" /> {resolvedStyleLabel}
            </span>
          </div>
        </div>

        {/* Right badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {completedImages.length > 0 && (
            <Badge className="text-[10px] h-5 bg-secondary/60 text-muted-foreground border-border/30">
              <ImageIcon className="w-2.5 h-2.5 mr-1" />{completedImages.length}
            </Badge>
          )}
          {hasApproved && (
            <Badge className="text-[10px] h-5 bg-green-500/15 text-green-400 border-green-500/20">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Approved
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />}
        </div>
      </div>

      {/* ── Approved image preview (always visible) ──────────────────────── */}
      {approvedImage && !expanded && (
        <div className="px-4 pb-3">
          <div className="relative rounded-xl overflow-hidden border border-green-500/20">
            <img
              src={approvedImage.image_url}
              alt={`Scene ${scene.scene_number} approved`}
              className="w-full object-cover max-h-48"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <Badge className="text-[10px] bg-green-500/80 text-white border-0">✓ Approved Frame</Badge>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                className="text-[10px] text-white/70 hover:text-white transition-colors"
              >
                Edit →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick regen footer (collapsed + has images but not approved) ─── */}
      {!expanded && !hasApproved && completedImages.length > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={editInstruction}
              onChange={e => setEditInstruction(e.target.value)}
              placeholder="Describe what to change and regenerate…"
              className="text-xs min-h-[36px] max-h-[72px] resize-none bg-background/60 border-border/40 focus:border-purple-500/50 flex-1"
              disabled={generating}
              rows={1}
              onClick={e => e.stopPropagation()}
            />
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleGenerateClick(); }}
              disabled={generating || !canGenerate}
              className="h-9 shrink-0 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {generating ? 'Generating…' : 'Regen'}
            </Button>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1"
          >
            <ChevronDown className="w-3 h-3" /> More options
          </button>
        </div>
      )}

      {/* ── Expanded content ───────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Visual prompt preview */}
              {scene.visual_prompt && (
                <div className="rounded-xl bg-background/40 border border-border/25 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Film className="w-3 h-3" /> Storyboard Visual Prompt
                  </p>
                  <p className="text-xs text-foreground/75 leading-relaxed">{scene.visual_prompt}</p>
                </div>
              )}

              {/* Character consistency panel */}
              {sceneChars.length > 0 && (
                <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 px-3 py-2.5 space-y-2">
                  <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3" /> Character Consistency
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sceneChars.map(c => (
                      <div key={c.id} className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-1">
                        {c.reference_image_url && (
                          <img src={c.reference_image_url} alt={c.name} className="w-5 h-5 rounded-full object-cover border border-violet-500/30" />
                        )}
                        <span className="text-[10px] font-medium text-violet-300">{c.name}</span>
                        <span className={`text-[9px] px-1 rounded ${c.lock_type !== 'none' ? 'text-green-400 bg-green-500/10' : 'text-muted-foreground/50 bg-background/40'}`}>
                          {c.lock_type !== 'none' ? '✓ locked' : 'unlocked'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {access.canConsistency && (
                    <button
                      onClick={() => setConsistencyMode(c => !c)}
                      className={`flex items-center gap-2 text-[11px] font-medium transition-all px-2.5 py-1.5 rounded-lg border ${
                        consistencyMode
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'bg-background/40 border-border/30 text-muted-foreground hover:border-border/60'
                      }`}
                    >
                      <div className={`w-7 h-3.5 rounded-full relative transition-colors ${consistencyMode ? 'bg-violet-500' : 'bg-border/60'}`}>
                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${consistencyMode ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </div>
                      Inject character DNA into prompt
                      <span className="text-muted-foreground ml-1">+{costs?.image_consistency_surcharge ?? 5}💎</span>
                    </button>
                  )}
                </div>
              )}

              {/* Location reference */}
              {lockedLocations.length > 0 && (
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location Reference
                  </p>
                  {lockedLocations.map(loc => (
                    <div key={loc.id} className="flex items-start gap-2">
                      {loc.reference_image_url && (
                        <img src={loc.reference_image_url} alt={loc.canonical_name} className="w-8 h-8 rounded-lg object-cover border border-emerald-500/25 shrink-0" />
                      )}
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-300">{loc.canonical_name}</p>
                        {loc.dna?.atmosphere && <p className="text-[10px] text-muted-foreground">{loc.dna.atmosphere}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Style + Aspect + Quality */}
              <StylePresetPicker
                value={stylePreset}
                onChange={setStylePreset}
                disabled={generating}
                scriptStyleLabel={resolvedStyleLabel}
              />

              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Aspect Ratio</p>
                  <div className="flex gap-1">
                    {ASPECT_RATIOS.map(r => (
                      <button
                        key={r} onClick={() => setAspectRatio(r)} disabled={generating}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          aspectRatio === r
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                            : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60'
                        } disabled:opacity-40`}
                      >{r}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Quality</p>
                  <div className="flex gap-1">
                    {[
                      { key: 'standard', label: 'Standard' },
                      { key: 'hd', label: 'HD', locked: !access.canHD },
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

              {/* Prompt override / edit instruction */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Pencil className="w-3 h-3" />
                  {isRegen ? 'What to change (optional)' : 'Prompt Override (optional)'}
                </p>
                <Textarea
                  value={isRegen ? editInstruction : promptOverride}
                  onChange={e => isRegen ? setEditInstruction(e.target.value) : setPromptOverride(e.target.value)}
                  placeholder={isRegen
                    ? 'e.g. darker sky, add fog, sunset lighting…'
                    : (scene.visual_prompt?.slice(0, 100) || 'Leave empty to use storyboard prompt')}
                  className="text-xs min-h-[52px] resize-none bg-background/60 border-border/40 focus:border-purple-500/50"
                  disabled={generating}
                />
              </div>

              {/* Gate messages */}
              {!providerConfigured && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> Image provider not configured — no gems deducted.
                </p>
              )}
              {providerConfigured && !access.canGenerate && !access.isAdmin && (
                <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Image generation requires a paid plan.
                </p>
              )}
              {providerConfigured && !hasEnoughGems && access.canGenerate && (
                <p className="text-[11px] text-destructive/80 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Not enough gems. Need {gemCost}, have {userBalance}.
                </p>
              )}

              {/* Action row */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleGenerateClick}
                  disabled={!canGenerate || generating}
                  className="h-9 text-sm bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Generating…' : isRegen ? 'Regenerate' : 'Generate Image'}
                </Button>

                {/* Gem cost preview */}
                <span className={`text-xs font-medium flex items-center gap-1 ${hasEnoughGems ? 'text-primary' : 'text-destructive'}`}>
                  <Gem className="w-3 h-3" /> {gemCost} gems
                </span>

                {/* Compare mode toggle */}
                {completedImages.length > 1 && (
                  <button
                    onClick={() => setCompareMode(c => !c)}
                    className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                      compareMode
                        ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                        : 'bg-background/40 border-border/30 text-muted-foreground hover:border-border/60'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" /> Compare Versions
                  </button>
                )}

                {/* Manual upload */}
                <label className="cursor-pointer flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border/30 bg-background/40 text-muted-foreground hover:border-border/60 hover:text-foreground transition-all">
                  {uploadingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleManualUpload} disabled={uploadingManual} />
                </label>
              </div>

              {/* Compare grid */}
              <AnimatePresence>
                {compareMode && completedImages.length > 0 && (
                  <ImageCompareGrid
                    images={completedImages}
                    onApprove={onApprove}
                    onUnapprove={onUnapprove}
                    onDelete={onDelete}
                    onSendToVideo={onSendToVideo}
                    onReplace={onReplace}
                  />
                )}
              </AnimatePresence>

              {/* Single image view (when not in compare mode) */}
              {!compareMode && (completedImages.length > 0 || pendingImage) && (
                <div className={`grid gap-3 ${completedImages.length <= 1 && !pendingImage ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {completedImages.slice(0, compareMode ? 0 : 6).map(img => (
                    <SingleImageCard
                      key={img.id}
                      image={img}
                      onApprove={onApprove}
                      onUnapprove={onUnapprove}
                      onSendToVideo={onSendToVideo}
                      onDelete={onDelete}
                    />
                  ))}
                  {pendingImage && (
                    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 aspect-video flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                      <p className="text-[11px] text-purple-400/80 font-medium">Generating…</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Inline single image card ────────────────────────────────────────────────
function SingleImageCard({ image, onApprove, onUnapprove, onSendToVideo, onDelete }) {
  const [lightbox, setLightbox] = useState(false);
  return (
    <>
      <div className={`relative rounded-xl overflow-hidden border group ${image.approved ? 'border-green-500/30' : 'border-border/30'}`}>
        <img
          src={image.image_url}
          alt="Generated scene"
          className="w-full object-cover aspect-video cursor-zoom-in"
          onClick={() => setLightbox(true)}
        />
        {image.approved && (
          <div className="absolute top-1.5 left-1.5">
            <Badge className="text-[9px] h-4 bg-green-500/80 text-white border-0">✓</Badge>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 gap-1.5">
          {!image.approved ? (
            <button onClick={() => onApprove(image.id)} className="text-[10px] font-medium bg-green-600/90 text-white px-2 py-1 rounded-lg hover:bg-green-600 transition-colors">
              ✓ Approve
            </button>
          ) : (
            <>
              <button onClick={() => onUnapprove(image.id)} className="text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded-lg hover:bg-black/60 transition-colors">
                Unapprove
              </button>
              <button onClick={() => onSendToVideo(image.id)} className="text-[10px] font-medium bg-sky-600/90 text-white px-2 py-1 rounded-lg hover:bg-sky-600 transition-colors">
                → Video
              </button>
            </>
          )}
          <button onClick={() => onDelete(image.id)} className="text-[10px] text-white/60 bg-black/40 px-1.5 py-1 rounded-lg hover:bg-destructive/60 transition-colors">
            ✕
          </button>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <img src={image.image_url} alt="Full view" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}