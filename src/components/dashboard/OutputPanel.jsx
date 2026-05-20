import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, RotateCcw, Save, Loader2, Sparkles, FileText, Lock, Film } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PromptSection = memo(function PromptSection({ title, content, accent, defaultCollapsed = false }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(`${title.replace(/[^a-zA-Z ]/g, '').trim()} copied!`);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`rounded-xl border ${accent} bg-card/40 overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
          <span className="text-muted-foreground text-xs ml-1">{collapsed ? '▶' : '▼'}</span>
        </button>
        <button
          onClick={copy}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {!collapsed && (
        <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed px-4 py-3">
          {content}
        </pre>
      )}
    </div>
  );
});

function safeString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return Object.entries(val).map(([k, v]) => `${k}:\n${safeString(v)}`).join('\n\n');
  return String(val);
}

const PROGRESS_STEPS = [
  'Building Story...',
  'Building Visual Scenes...',
  'Building Sound System...',
  'Building YouTube Package...',
  'Finalising Blueprint...',
];

export default function OutputPanel({ output, projectName, projectId, projectType, isGenerating, onReset, onSave, isSaving, visualTool, isElite, isPremium }) {
  const [copied, setCopied] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const navigate = useNavigate();

  const canDownload = isPremium || isElite;
  const canSave = isPremium || isElite;

  const handleLockedClick = (requiredPlan) => {
    const msg = requiredPlan === 'elite'
      ? 'Save Projects is a Studio Elite feature. Upgrade to unlock.'
      : 'This feature requires Creator Pro or Studio Elite.';
    toast(msg, {
      action: { label: 'Upgrade', onClick: () => navigate('/upgrade') },
    });
    navigate('/upgrade');
  };

  useEffect(() => {
    if (!isGenerating) { setProgressStep(0); return; }
    const interval = setInterval(() => {
      setProgressStep(s => (s + 1) % PROGRESS_STEPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const fullText = output
    ? [
        safeString(output.master_prompt),
        output.visual_prompt && `\n--- VISUAL CREATION PROMPTS ---\n${safeString(output.visual_prompt)}`,
        output.sound_prompt && `\n--- SOUND & MUSIC PROMPTS ---\n${safeString(output.sound_prompt)}`,
        output.narration_guide && `\n--- NARRATION GUIDE ---\n${safeString(output.narration_guide)}`,
        output.youtube_package && [
          '\n--- YOUTUBE PACKAGE ---',
          output.youtube_package.title_primary && `Title (EN): ${output.youtube_package.title_primary}`,
          output.youtube_package.title_secondary && `Title (Alt): ${output.youtube_package.title_secondary}`,
          output.youtube_package.description_primary && `\nDescription (EN):\n${output.youtube_package.description_primary}`,
          output.youtube_package.description_secondary && `\nDescription (Alt):\n${output.youtube_package.description_secondary}`,
          output.youtube_package.tags && `\nTags: ${output.youtube_package.tags}`,
          output.youtube_package.thumbnail_hook_primary && `\nThumbnail Hook (EN): ${output.youtube_package.thumbnail_hook_primary}`,
          output.youtube_package.thumbnail_hook_secondary && `Thumbnail Hook (Alt): ${output.youtube_package.thumbnail_hook_secondary}`,
        ].filter(Boolean).join('\n'),
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const copyAll = () => {
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('All prompts copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!fullText) return;
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectName || 'blueprint').replace(/\s+/g, '_')}_master_prompt.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Generated Output</h2>
            <p className="text-xs text-muted-foreground">Your production-ready prompts</p>
          </div>
        </div>

        {/* Action buttons */}
        {output && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAll}
              className="h-8 text-xs border-border/50"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copied ? 'Copied' : 'Copy All'}
            </Button>

            {/* Download — locked for free users */}
            {canDownload ? (
              <Button
                variant="outline"
                size="sm"
                onClick={download}
                className="h-8 text-xs border-border/50"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLockedClick('premium')}
                className="h-8 text-xs border-border/50 text-muted-foreground/60 relative"
                title="Upgrade to download"
              >
                <Lock className="w-3 h-3 mr-1.5 text-amber-400" />
                Download
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs border-border/50 text-muted-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
            </Button>

            {/* Create Storyboard button — shown after output */}
            {output?.visual_prompt && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/storyboard', {
                  state: { output, project_id: projectId, project_type: projectType, project_name: projectName }
                })}
                className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Film className="w-3.5 h-3.5" /> Create Storyboard
              </Button>
            )}

            {/* Save Project — locked for free users */}
            {canSave ? (
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isSaving ? 'Saving...' : 'Save Project'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleLockedClick('premium')}
                className="h-8 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400"
                title="Upgrade to save projects"
              >
                <Lock className="w-3 h-3 mr-1.5" />
                Save Project
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center gap-6 py-20"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-base font-semibold">Crafting your blueprint...</p>
                <p className="text-sm text-muted-foreground">{PROGRESS_STEPS[progressStep]}</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground/50 max-w-[200px] text-center">
                This may take up to 2 minutes. Please keep the screen open.
              </p>
            </motion.div>
          ) : !output ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center gap-4 py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border/40 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">No output yet</p>
                <p className="text-xs text-muted-foreground/60 max-w-[220px]">
                  Fill in your project details on the left and hit Generate
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-xs opacity-30 pointer-events-none">
                {['Master Prompt', 'Visual Prompt', 'Sound Prompt', 'YouTube Package'].map(label => (
                  <div key={label} className="h-20 rounded-xl border border-border/40 bg-card/30 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="output"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Partial warning banner */}
              {output._partial_warning && (
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs">
                  <span className="text-base leading-none mt-0.5">⚠️</span>
                  <span>{output._partial_warning}</span>
                </div>
              )}
              {output.master_prompt && (
                <PromptSection
                  title="🎬 Master Story Prompt"
                  content={safeString(output.master_prompt)}
                  accent="border-primary/20"
                  defaultCollapsed={false}
                />
              )}
              {output.visual_prompt && (
                <PromptSection
                  title={`🎨 Visual Prompts (${visualTool ? visualTool.toUpperCase() : 'Generated'})`}
                  content={safeString(output.visual_prompt)}
                  accent="border-blue-500/20"
                  defaultCollapsed={true}
                />
              )}
              {output.sound_prompt && (
                <PromptSection
                  title="🎵 Sound & Music Prompt"
                  content={safeString(output.sound_prompt)}
                  accent="border-purple-500/20"
                  defaultCollapsed={true}
                />
              )}
              {output.narration_guide && (
                <PromptSection
                  title="🎙️ Narration Guide"
                  content={safeString(output.narration_guide)}
                  accent="border-green-500/20"
                  defaultCollapsed={true}
                />
              )}
              {output.youtube_package && (
                <div className="rounded-xl border border-yellow-500/20 bg-card/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-yellow-500/20">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📦 YouTube Package</h3>
                  </div>
                  <div className="px-4 py-3 space-y-4">
                    {/* Titles */}
                    <div className="grid grid-cols-1 gap-2">
                      {output.youtube_package.title_primary && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Title (Primary)</p>
                          <p className="text-sm font-semibold text-foreground">{output.youtube_package.title_primary}</p>
                        </div>
                      )}
                      {output.youtube_package.title_secondary && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Title (Secondary Language)</p>
                          <p className="text-sm font-semibold text-foreground">{output.youtube_package.title_secondary}</p>
                        </div>
                      )}
                    </div>
                    {/* Descriptions */}
                    {output.youtube_package.description_primary && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description (Primary)</p>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{output.youtube_package.description_primary}</p>
                      </div>
                    )}
                    {output.youtube_package.description_secondary && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description (Secondary Language)</p>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{output.youtube_package.description_secondary}</p>
                      </div>
                    )}
                    {/* Tags */}
                    {output.youtube_package.tags && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Tags</p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{output.youtube_package.tags}</p>
                      </div>
                    )}
                    {/* Thumbnail hooks */}
                    {(output.youtube_package.thumbnail_hook_primary || output.youtube_package.thumbnail_hook_secondary) && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Thumbnail Hook Text</p>
                        {output.youtube_package.thumbnail_hook_primary && (
                          <p className="text-sm font-bold text-primary">"{output.youtube_package.thumbnail_hook_primary}"</p>
                        )}
                        {output.youtube_package.thumbnail_hook_secondary && (
                          <p className="text-sm font-bold text-primary/80">"{output.youtube_package.thumbnail_hook_secondary}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}