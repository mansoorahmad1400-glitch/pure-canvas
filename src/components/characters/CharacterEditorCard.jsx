import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check, Trash2, Upload, ChevronDown, ChevronUp, User, Loader2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ROLES = [
  { value: 'protagonist', label: 'Main Character' },
  { value: 'antagonist',  label: 'Antagonist' },
  { value: 'supporting',  label: 'Supporting' },
  { value: 'narrator',    label: 'Narrator' },
  { value: 'minor',       label: 'Minor' },
  { value: 'background',  label: 'Background' },
];

export function canApproveCharacter(c) {
  if (!c?.name?.trim()) return false;
  if (!c?.style_prompt?.trim()) return false;
  if (!(c.description?.trim() || c.appearance?.trim())) return false;
  return true;
}

export default function CharacterEditorCard({
  character, isDirty, justSaved, onChange, onApprove, onUnapprove, onDelete, onUploadImage,
}) {
  const [expanded, setExpanded] = useState(true);
  const approved = character.approval_status === 'approved';
  const canApprove = canApproveCharacter(character);

  const set = (patch) => onChange(character.id, patch);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadImage(character.id, file);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/40 bg-card/40 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-secondary/30 border border-border/40 shrink-0">
          {character.reference_image_url ? (
            <img src={character.reference_image_url} alt={character.name || 'Character'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <User className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={character.name || ''}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Character name"
            className="h-8 text-sm font-medium border-0 bg-transparent px-0 focus-visible:ring-0"
          />
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
              approved ? 'bg-green-500/15 text-green-400'
              : canApprove ? 'bg-amber-500/15 text-amber-400'
              : 'bg-muted text-muted-foreground'
            }`}>
              {approved ? 'Approved' : canApprove ? 'Ready' : 'Draft'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {ROLES.find((r) => r.value === character.role)?.label || character.role}
            </span>
            {isDirty && <span className="text-[10px] text-amber-400">• Unsaved</span>}
            {justSaved && <span className="text-[10px] text-green-400">✓ Saved</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded((x) => !x)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(character.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={character.role || 'supporting'} onValueChange={(v) => set({ role: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Voice Style (optional)</Label>
              <Input
                value={character.voice_style || ''}
                onChange={(e) => set({ voice_style: e.target.value })}
                placeholder="e.g. warm older male, energetic young girl"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={character.description || ''}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Short summary of who this character is."
              className="text-sm min-h-[60px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Appearance / Costume</Label>
            <Textarea
              value={character.appearance || ''}
              onChange={(e) => set({ appearance: e.target.value })}
              placeholder="Physical look, clothing, distinctive features."
              className="text-sm min-h-[60px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Personality</Label>
            <Textarea
              value={character.personality || ''}
              onChange={(e) => set({ personality: e.target.value })}
              placeholder="Behavior, mood, motivations."
              className="text-sm min-h-[50px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Style Prompt</Label>
            <Textarea
              value={character.style_prompt || ''}
              onChange={(e) => set({ style_prompt: e.target.value })}
              placeholder="Visual style used during image generation."
              className="text-sm min-h-[50px]"
            />
            <p className="text-[10px] text-muted-foreground">Defaults are set from your project type — edit to refine the look.</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Reference Image</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/50 text-xs cursor-pointer hover:bg-secondary/40">
                  <Upload className="w-3.5 h-3.5" /> Upload Image
                </span>
              </label>
              <Input
                value={character.reference_image_url || ''}
                onChange={(e) => set({ reference_image_url: e.target.value || null })}
                placeholder="…or paste an image URL"
                className="h-9 text-xs flex-1 min-w-[200px]"
              />
              {character.reference_image_url && (
                <Button size="sm" variant="ghost" className="h-9 text-xs gap-1 text-muted-foreground" onClick={() => set({ reference_image_url: null })}>
                  <X className="w-3.5 h-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
            {approved ? (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onUnapprove(character.id)}>
                <X className="w-4 h-4" /> Unapprove
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-600/90 text-white disabled:opacity-50"
                disabled={!canApprove}
                onClick={() => onApprove(character.id)}
                title={canApprove ? 'Approve character' : 'Add a name, description (or appearance), and style prompt first.'}
              >
                <Check className="w-4 h-4" /> Approve Character
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
