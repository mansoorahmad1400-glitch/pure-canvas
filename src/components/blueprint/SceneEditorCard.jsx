import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Edit3, Sparkles, Copy, Trash2, RotateCcw,
  GitCompare, GripVertical, Check, X, Loader2, ChevronRight,
  Repeat, ZoomIn, ZoomOut, CloudLightning, MapPin, MessageSquare,
  ArrowRight, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const FIELD_LABELS = {
  title: 'Scene Title',
  script_text: 'Script / Story Text',
  visual_summary: 'Visual Summary',
  characters_detected: 'Characters',
  location_detected: 'Location',
  mood: 'Mood / Tone',
  camera_direction: 'Camera Direction',
  transition_to_next: 'Transition to Next Scene',
  duration: 'Duration (seconds)',
};

const AI_ACTIONS = [
  { id: 'improve',           label: 'Improve with AI',     icon: Sparkles,    cost: 2, color: 'text-primary' },
  { id: 'rewrite',           label: 'Rewrite Scene',        icon: Repeat,      cost: 3, color: 'text-purple-400' },
  { id: 'expand',            label: 'Expand Scene',         icon: ZoomIn,      cost: 2, color: 'text-blue-400' },
  { id: 'shorten',           label: 'Shorten Scene',        icon: ZoomOut,     cost: 2, color: 'text-cyan-400' },
  { id: 'change_mood',       label: 'Change Mood',          icon: CloudLightning, cost: 2, color: 'text-amber-400', hasParam: true, paramLabel: 'New mood (e.g. dark, hopeful, tense)' },
  { id: 'change_location',   label: 'Change Location',      icon: MapPin,      cost: 2, color: 'text-green-400', hasParam: true, paramLabel: 'New location description' },
  { id: 'change_dialogue',   label: 'Change Dialogue',      icon: MessageSquare, cost: 2, color: 'text-orange-400' },
  { id: 'change_transition', label: 'Change Transition',    icon: ArrowRight,  cost: 1, color: 'text-rose-400', hasParam: true, paramLabel: 'Transition style (e.g. fade to black, cut)' },
];

function EditableField({ fieldKey, value, multiline = false, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  const startEdit = () => {
    setDraft(value || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const save = () => {
    onChange(fieldKey, draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const label = FIELD_LABELS[fieldKey] || fieldKey;

  return (
    <div className="group/field">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</span>
        {!editing && (
          <button onClick={startEdit} className="opacity-0 group-hover/field:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground">
            <Edit3 className="w-3 h-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-1.5">
          {multiline ? (
            <textarea
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={4}
              className="w-full text-xs bg-background/60 border border-primary/30 rounded-lg px-3 py-2 text-foreground resize-y focus:outline-none focus:border-primary/60 leading-relaxed"
            />
          ) : (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-full text-xs bg-background/60 border border-primary/30 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary/60"
            />
          )}
          <div className="flex gap-1.5">
            <button onClick={save} className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 border border-green-500/30 rounded px-2 py-1 hover:bg-green-500/10 transition-colors">
              <Check className="w-3 h-3" /> Save
            </button>
            <button onClick={cancel} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/40 rounded px-2 py-1 hover:bg-secondary/40 transition-colors">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-foreground/80 leading-relaxed cursor-text hover:text-foreground transition-colors" onClick={startEdit}>
          {value || <span className="text-muted-foreground/40 italic">Not specified</span>}
        </p>
      )}
    </div>
  );
}

export default function SceneEditorCard({
  scene,
  index,
  totalScenes,
  projectContext,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  userBalance,
  isAdmin,
  forceExpanded,
}) {
  const [expanded, setExpanded] = useState(index === 0); // first scene open by default

  // Sync with parent expand-all toggle
  useEffect(() => {
    if (forceExpanded !== undefined) setExpanded(forceExpanded);
  }, [forceExpanded]);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [paramInput, setParamInput] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [originalSnapshot] = useState({ ...scene }); // snapshot on mount for compare

  const isDirty = JSON.stringify(scene) !== JSON.stringify(originalSnapshot);

  const handleFieldChange = (field, value) => {
    onUpdate({ ...scene, [field]: value });
  };

  const handleReset = () => {
    onUpdate({ ...originalSnapshot });
    toast.success('Scene reset to original');
  };

  const runAiAction = async (actionId, param) => {
    const actionDef = AI_ACTIONS.find(a => a.id === actionId);
    if (!actionDef) return;

    if (!isAdmin && userBalance < actionDef.cost) {
      toast.error(`Not enough gems. Need ${actionDef.cost} 💎`);
      return;
    }

    setAiLoading(true);
    setAiMenuOpen(false);
    setPendingAction(null);
    setParamInput('');

    try {
      const res = await base44.functions.invoke('sceneEditor', {
        action: actionId,
        scene,
        project_context: projectContext,
        param: param || undefined,
      });
      if (res.data?.success && res.data?.scene) {
        onUpdate({ ...res.data.scene, scene_number: scene.scene_number });
        toast.success(`Scene ${scene.scene_number} updated — ${res.data.gems_deducted ?? 0} 💎`);
      } else {
        toast.error(res.data?.error || 'AI operation failed');
      }
    } catch (e) {
      const d = e?.response?.data;
      if (d?.insufficient_gems) toast.error(d.error || 'Not enough gems');
      else toast.error(d?.error || e.message || 'AI operation failed');
    }
    setAiLoading(false);
  };

  const handleAiClick = (action) => {
    if (action.hasParam) {
      setPendingAction(action);
      setParamInput('');
    } else {
      runAiAction(action.id, null);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        isDirty ? 'border-primary/30 bg-primary/3' : 'border-border/40 bg-card/30'
      }`}
    >
      {/* ── Card Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 shrink-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30" />
          <div className="w-6 h-6 rounded-lg bg-primary/12 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{scene.scene_number}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{scene.title || `Scene ${scene.scene_number}`}</p>
          {!expanded && scene.visual_summary && (
            <p className="text-[11px] text-muted-foreground truncate">{scene.visual_summary}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isDirty && (
            <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 rounded-full px-2 py-0.5 font-semibold">Edited</span>
          )}
          {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground/60" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/60" />}
        </div>
      </div>

      {/* ── Expanded Body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/30">

              {/* Compare mode toggle */}
              {isDirty && (
                <div className="pt-3">
                  <button
                    onClick={() => setCompareMode(c => !c)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground border border-border/40 rounded-lg px-2.5 py-1.5 hover:border-border/70 transition-colors"
                  >
                    <GitCompare className="w-3 h-3" />
                    {compareMode ? 'Hide comparison' : 'Compare vs original'}
                  </button>
                </div>
              )}

              {/* Compare view */}
              {compareMode && isDirty && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border/30 p-3 bg-card/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Original</p>
                    <pre className="whitespace-pre-wrap text-muted-foreground/70 font-sans leading-relaxed text-[11px] max-h-48 overflow-y-auto">
                      {originalSnapshot.script_text || originalSnapshot.visual_summary || '—'}
                    </pre>
                  </div>
                  <div className="rounded-lg border border-primary/20 p-3 bg-primary/3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/50 mb-2">Edited</p>
                    <pre className="whitespace-pre-wrap text-foreground/80 font-sans leading-relaxed text-[11px] max-h-48 overflow-y-auto">
                      {scene.script_text || scene.visual_summary || '—'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Fields */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="sm:col-span-2">
                  <EditableField fieldKey="title" value={scene.title} onChange={handleFieldChange} />
                </div>
                <div className="sm:col-span-2">
                  <EditableField fieldKey="script_text" value={scene.script_text} multiline onChange={handleFieldChange} />
                </div>
                <div className="sm:col-span-2">
                  <EditableField fieldKey="visual_summary" value={scene.visual_summary} multiline onChange={handleFieldChange} />
                </div>
                <EditableField fieldKey="characters_detected" value={scene.characters_detected} onChange={handleFieldChange} />
                <EditableField fieldKey="location_detected" value={scene.location_detected} onChange={handleFieldChange} />
                <EditableField fieldKey="mood" value={scene.mood} onChange={handleFieldChange} />
                <EditableField fieldKey="camera_direction" value={scene.camera_direction} onChange={handleFieldChange} />
                <div className="sm:col-span-2">
                  <EditableField fieldKey="transition_to_next" value={scene.transition_to_next} onChange={handleFieldChange} />
                </div>
                <EditableField fieldKey="duration" value={scene.duration} onChange={handleFieldChange} />
              </div>

              {/* Param input for pending AI action */}
              {pendingAction && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">{pendingAction.label}</p>
                  <input
                    autoFocus
                    value={paramInput}
                    onChange={e => setParamInput(e.target.value)}
                    placeholder={pendingAction.paramLabel}
                    className="w-full text-xs bg-background/60 border border-border/40 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary/50"
                    onKeyDown={e => e.key === 'Enter' && paramInput.trim() && runAiAction(pendingAction.id, paramInput.trim())}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => runAiAction(pendingAction.id, paramInput.trim())} disabled={!paramInput.trim()} className="text-xs h-7 bg-primary hover:bg-primary/90">
                      Apply — {pendingAction.cost} 💎
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingAction(null)} className="text-xs h-7 border-border/40">
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* AI Actions dropdown */}
              <div className="relative">
                <button
                  onClick={() => setAiMenuOpen(o => !o)}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-primary/25 rounded-lg px-3 py-1.5 hover:bg-primary/5 hover:border-primary/40 transition-colors disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Edit
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                <AnimatePresence>
                  {aiMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full left-0 mb-1.5 z-30 w-64 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                    >
                      {AI_ACTIONS.map(action => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.id}
                            onClick={() => handleAiClick(action)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${action.color}`} />
                            <span className="flex-1 text-xs text-foreground">{action.label}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{action.cost} 💎</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => index > 0 && onMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-25"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => index < totalScenes - 1 && onMoveDown(index)}
                    disabled={index === totalScenes - 1}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-25"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDuplicate(index)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                    title="Duplicate scene"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {isDirty && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/40 rounded px-2 py-1 hover:bg-secondary/40 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(index)}
                    className="flex items-center gap-1 text-[10px] text-destructive/70 hover:text-destructive border border-destructive/20 rounded px-2 py-1 hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}