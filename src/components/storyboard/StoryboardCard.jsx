import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, Edit2, ImageIcon, ChevronDown, ChevronUp, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const ASPECT_OPTIONS = [
  { value: '16:9', label: '16:9', hint: 'Landscape' },
  { value: '9:16', label: '9:16', hint: 'Portrait' },
  { value: '1:1',  label: '1:1',  hint: 'Square' },
];

const STATUS_CONFIG = {
  pending:    { label: 'Not Generated', color: 'text-muted-foreground', bg: 'bg-secondary/60' },
  generating: { label: 'Generating...', color: 'text-primary',          bg: 'bg-primary/10'   },
  completed:  { label: 'Completed',     color: 'text-green-400',         bg: 'bg-green-500/10' },
  failed:     { label: 'Failed',        color: 'text-red-400',           bg: 'bg-red-500/10'   },
};

// Aspect ratio placeholder dimensions (visual representation only)
const ASPECT_DIMS = {
  '16:9': { w: '100%', paddingTop: '56.25%' },
  '9:16': { w: '56.25%', paddingTop: '100%' },
  '1:1':  { w: '100%', paddingTop: '100%' },
};

function AspectPlaceholder({ ratio, imageUrl, status }) {
  const dims = ASPECT_DIMS[ratio] || ASPECT_DIMS['16:9'];
  return (
    <div className="flex justify-center">
      <div style={{ width: ratio === '9:16' ? '160px' : '100%' }} className="relative">
        <div style={{ paddingTop: ratio === '9:16' ? '284px' : ratio === '1:1' ? '200px' : '112px' }}
          className="relative w-full rounded-lg overflow-hidden bg-secondary/40 border border-border/30">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {imageUrl ? (
              <img src={imageUrl} alt="Storyboard frame" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                {status === 'generating' ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : status === 'failed' ? (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                )}
                <span className="text-xs text-muted-foreground/40 font-medium">{ratio}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoryboardCard({
  scene,
  index,
  onGenerate,
  onRegenerate,
  onApprove,
  onUnapprove,
  onAspectChange,
  onPromptEdit,
  canGenerate,
  gemCost,
  providerEnabled,
  isGeneratingThis,
}) {
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(scene.visual_prompt || '');

  const statusCfg = STATUS_CONFIG[scene.status] || STATUS_CONFIG.pending;
  const isGenerating = isGeneratingThis || scene.status === 'generating';
  const hasImage = !!scene.image_url && scene.status === 'completed';
  const isApproved = scene.approved;

  const handleSavePrompt = () => {
    onPromptEdit(scene.id, editedPrompt);
    setEditingPrompt(false);
  };

  // Short summary: first 80 chars of prompt
  const shortSummary = (scene.visual_prompt || '').slice(0, 80).trim() + (scene.visual_prompt?.length > 80 ? '...' : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className={`rounded-xl border bg-card/50 overflow-hidden transition-all ${
        isApproved ? 'border-green-500/40' : 'border-border/40'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-card/30">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-primary/80 bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5">
            Scene {scene.scene_number}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${statusCfg.bg} ${statusCfg.color} border-current/20`}>
            {statusCfg.label}
          </span>
          {isApproved && (
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs gap-1">
              <Check className="w-2.5 h-2.5" /> Approved
            </Badge>
          )}
        </div>
        {/* Aspect ratio selector */}
        <div className="flex gap-1">
          {ASPECT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onAspectChange(scene.id, opt.value)}
              title={opt.hint}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-all ${
                scene.aspect_ratio === opt.value
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-secondary/40 border-border/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image preview */}
      <div className="px-4 pt-3">
        <AspectPlaceholder ratio={scene.aspect_ratio || '16:9'} imageUrl={scene.image_url} status={scene.status} />
      </div>

      {/* Error message */}
      {scene.status === 'failed' && scene.error_message && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {scene.error_message}
        </div>
      )}

      {/* Prompt section */}
      <div className="px-4 pt-3 pb-1">
        {editingPrompt ? (
          <div className="space-y-2">
            <textarea
              value={editedPrompt}
              onChange={e => setEditedPrompt(e.target.value)}
              rows={4}
              className="w-full text-xs text-foreground/90 bg-secondary/30 border border-border/50 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleSavePrompt}>Save</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingPrompt(false); setEditedPrompt(scene.visual_prompt || ''); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {promptExpanded ? scene.visual_prompt : shortSummary}
            </p>
            {(scene.visual_prompt || '').length > 80 && (
              <button
                onClick={() => setPromptExpanded(v => !v)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground mt-1 transition-colors"
              >
                {promptExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {promptExpanded ? 'Collapse' : 'Show full prompt'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
        {/* Generate / Regenerate */}
        {!hasImage ? (
          providerEnabled && canGenerate ? (
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground"
              disabled={isGenerating}
              onClick={() => onGenerate(scene)}
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              {isGenerating ? 'Generating...' : `Generate (${gemCost} 💎)`}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 text-muted-foreground border-border/40"
              disabled
              title={!providerEnabled ? 'Provider not configured' : 'Upgrade required'}
            >
              <Lock className="w-3 h-3" />
              {!providerEnabled ? 'Provider Not Active' : 'Upgrade to Generate'}
            </Button>
          )
        ) : (
          providerEnabled && canGenerate ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-border/40"
              disabled={isGenerating}
              onClick={() => onRegenerate(scene)}
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate ({gemCost + 1} 💎)
            </Button>
          ) : null
        )}

        {/* Edit Prompt */}
        {!editingPrompt && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-border/40 text-muted-foreground"
            onClick={() => setEditingPrompt(true)}
          >
            <Edit2 className="w-3 h-3" /> Edit Prompt
          </Button>
        )}

        {/* Approve / Unapprove */}
        {!isApproved ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
            onClick={() => onApprove(scene.id)}
          >
            <Check className="w-3 h-3" /> Approve Frame
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-border/40 text-muted-foreground"
            onClick={() => onUnapprove(scene.id)}
          >
            Unapprove
          </Button>
        )}
      </div>
    </motion.div>
  );
}