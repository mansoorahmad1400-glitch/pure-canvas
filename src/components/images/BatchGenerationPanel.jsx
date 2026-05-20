import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ZapIcon, X, AlertCircle, Gem, CheckSquare } from 'lucide-react';
import { resolveScriptStyle } from '@/lib/scriptStyleResolver';

const PLAN_LABELS = {
  free:    'Free — Batch disabled',
  starter: 'Starter — up to 3 scenes',
  premium: 'Creator Pro — up to 8 scenes',
  elite:   'Studio Elite — all scenes',
  admin:   'Admin — unlimited',
};

export default function BatchGenerationPanel({
  scenes, batchLimit, costs, access, userBalance,
  project, providerConfigured, onBatchGenerate, onClose,
}) {
  const [selectedScenes, setSelectedScenes] = useState(
    scenes.slice(0, batchLimit).map(s => s.scene_number)
  );
  const [quality, setQuality] = useState('standard');

  const toggle = (sceneNum) => {
    setSelectedScenes(prev => {
      if (prev.includes(sceneNum)) return prev.filter(n => n !== sceneNum);
      if (prev.length >= batchLimit) return prev; // respect limit
      return [...prev, sceneNum];
    });
  };

  const costPerScene = quality === 'hd'
    ? (costs?.image_generate_hd ?? 10)
    : (costs?.image_generate_standard ?? 5);
  const totalCost = selectedScenes.length * costPerScene;
  const hasEnough = access.isAdmin || userBalance >= totalCost;

  const styleKey = resolveScriptStyle(project);

  const handleRun = () => {
    onBatchGenerate(selectedScenes, {
      style_preset: styleKey,
      style_source: 'script',
      script_context: {
        project_type: project?.project_type,
        audience: project?.audience,
        tone: project?.tone,
        mood: project?.mood,
        visual_style_key: styleKey,
      },
      aspect_ratio: '16:9',
      quality,
      consistency_mode: false,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ZapIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-foreground">Batch Generation</h3>
          <span className="text-[10px] text-purple-400/70 bg-purple-500/10 px-2 py-0.5 rounded-full">
            {PLAN_LABELS[project?.audience] || `Up to ${batchLimit} scenes`}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Provider notice */}
      {!providerConfigured && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Image provider not configured. Batch will run in demo mode.
        </div>
      )}

      {/* Quality picker */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Quality for all scenes</p>
        <div className="flex gap-1.5">
          {[
            { key: 'standard', label: 'Standard' },
            { key: 'hd', label: 'HD', locked: !access.canHD },
          ].map(q => (
            <button
              key={q.key}
              onClick={() => !q.locked && setQuality(q.key)}
              disabled={q.locked}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
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

      {/* Scene selector */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Select Scenes ({selectedScenes.length}/{batchLimit} max)
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {scenes.map(scene => {
            const selected = selectedScenes.includes(scene.scene_number);
            const atLimit = !selected && selectedScenes.length >= batchLimit;
            return (
              <button
                key={scene.scene_number}
                onClick={() => toggle(scene.scene_number)}
                disabled={atLimit}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all text-left ${
                  selected
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : atLimit
                    ? 'bg-background/30 border-border/20 text-muted-foreground/30 cursor-not-allowed'
                    : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground'
                }`}
              >
                <CheckSquare className={`w-3 h-3 shrink-0 ${selected ? 'text-purple-400' : 'text-muted-foreground/30'}`} />
                <span>Scene {scene.scene_number}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost summary */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/40 border border-border/25">
        <div className="flex items-center gap-2">
          <Gem className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">
            {selectedScenes.length} scenes × {costPerScene}💎 =
          </span>
          <span className={`text-sm font-bold ${hasEnough ? 'text-primary' : 'text-destructive'}`}>
            {totalCost} 💎 total
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Balance: {userBalance} 💎</span>
      </div>

      {!hasEnough && !access.isAdmin && (
        <p className="text-[11px] text-destructive/80 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" /> Not enough gems for this batch.
        </p>
      )}

      {/* Run button */}
      <Button
        onClick={handleRun}
        disabled={selectedScenes.length === 0 || !hasEnough}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
      >
        <ZapIcon className="w-4 h-4" />
        Generate {selectedScenes.length} Scene{selectedScenes.length !== 1 ? 's' : ''} — {totalCost} 💎
      </Button>
    </motion.div>
  );
}