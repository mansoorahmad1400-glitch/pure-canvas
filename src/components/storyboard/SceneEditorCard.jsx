import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Copy, Trash2,
  Check, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import VisualSectionForm from './VisualSectionForm';
import AudioSectionForm from './AudioSectionForm';

export function canApprove(scene) {
  const visualOk = !!(scene.story_text?.trim() || scene.image_prompt?.trim());
  const audioOk =
    scene.audio_mode === 'silent' ||
    !!(
      scene.dialogue_text?.trim() ||
      scene.narration_text?.trim() ||
      scene.rhyme_lyrics?.trim() ||
      scene.background_music_prompt?.trim() ||
      scene.sfx_prompt?.trim()
    );
  return { ok: visualOk && audioOk, visualOk, audioOk };
}

export function sceneStatus(scene) {
  if (scene.visual_status === 'approved' && scene.audio_status === 'approved') return 'approved';
  if (canApprove(scene).ok) return 'ready';
  return 'draft';
}

const STATUS_STYLES = {
  draft:    'bg-muted/60 text-muted-foreground border-border/40',
  ready:    'bg-blue-500/10 text-blue-400 border-blue-500/30',
  approved: 'bg-green-500/15 text-green-400 border-green-500/30',
};

export default function SceneEditorCard({
  scene, index, total, dirty, justSaved,
  onChange, onMove, onDuplicate, onDelete, onToggleApprove,
}) {
  const [open, setOpen] = useState(true);
  const status = sceneStatus(scene);
  const approval = canApprove(scene);
  const isApproved = status === 'approved';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border bg-card/50 overflow-hidden ${
        isApproved ? 'border-green-500/40' : 'border-border/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-border/30 bg-card/30 flex-wrap">
        <span className="text-xs font-bold text-primary/80 bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 shrink-0">
          Scene {scene.scene_number}
        </span>

        <Input
          value={scene.scene_title || ''}
          onChange={(e) => onChange({ scene_title: e.target.value })}
          placeholder="Untitled scene"
          className="h-7 text-sm flex-1 min-w-[140px]"
        />

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">Sec</span>
          <Input
            type="number"
            min={1}
            step={1}
            value={scene.duration_seconds ?? scene.duration ?? 6}
            onChange={(e) => onChange({ duration_seconds: Number(e.target.value) || 6 })}
            className="h-7 w-14 text-xs text-center"
          />
        </div>

        <Badge className={`text-[10px] uppercase tracking-wide border ${STATUS_STYLES[status]}`}>
          {status}
        </Badge>

        {dirty && (
          <span className="text-[10px] text-amber-400/80">Unsaved</span>
        )}
        {justSaved && (
          <span className="text-[10px] text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}

        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0}
            onClick={() => onMove(-1)} title="Move up">
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={index === total - 1}
            onClick={() => onMove(1)} title="Move down">
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={onDuplicate} title="Duplicate">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300"
            onClick={onDelete} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7"
            onClick={() => setOpen((v) => !v)} title={open ? 'Collapse' : 'Expand'}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-3 sm:px-4 py-4">
          <Tabs defaultValue="visual" className="w-full">
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="visual">Visual</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
            </TabsList>
            <TabsContent value="visual" className="pt-4">
              <VisualSectionForm scene={scene} onChange={onChange} />
            </TabsContent>
            <TabsContent value="audio" className="pt-4">
              <AudioSectionForm scene={scene} onChange={onChange} />
            </TabsContent>
          </Tabs>

          {/* Footer / approval */}
          <div className="mt-5 pt-4 border-t border-border/30 flex flex-wrap items-center gap-3">
            {!isApproved ? (
              <Button
                size="sm"
                disabled={!approval.ok}
                onClick={onToggleApprove}
                className="gap-1.5"
                title={
                  approval.ok
                    ? 'Approve this scene'
                    : !approval.visualOk
                      ? 'Add Story / Action or Image Prompt first'
                      : 'Add dialogue, narration, lyrics, music or SFX — or set mode to Silent'
                }
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Storyboard Scene
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onToggleApprove}>
                Unapprove
              </Button>
            )}

            {!approval.ok && !isApproved && (
              <p className="text-[11px] text-muted-foreground">
                {!approval.visualOk && 'Visual needs Story or Image Prompt. '}
                {!approval.audioOk && 'Audio needs content or Silent mode.'}
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
