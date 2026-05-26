import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export const AUDIO_MODES = [
  { value: 'dialogue',   label: 'Dialogue' },
  { value: 'narration',  label: 'Narration' },
  { value: 'mixed',      label: 'Mixed' },
  { value: 'rhyme_song', label: 'Rhyme / Song' },
  { value: 'silent',     label: 'Silent' },
];

function Field({ label, helper, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/90">{label}</Label>
      {children}
      {helper && <p className="text-[11px] text-muted-foreground/70">{helper}</p>}
    </div>
  );
}

export default function AudioSectionForm({ scene, onChange }) {
  const set = (patch) => onChange(patch);
  const mode = scene.audio_mode || 'dialogue';
  const isSilent = mode === 'silent';
  const showDialogue   = !isSilent && (mode === 'dialogue' || mode === 'mixed');
  const showNarration  = !isSilent && (mode === 'narration' || mode === 'mixed');
  const showRhyme      = !isSilent && (mode === 'rhyme_song' || mode === 'mixed');

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Choose what should be heard. Generation happens later in the Audio phase.
      </p>

      <Field label="Audio Mode">
        <Select value={mode} onValueChange={(v) => set({ audio_mode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {AUDIO_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {showDialogue && (
        <Field
          label="Dialogue"
          helper="Format: `Character: line`. Only the line will be spoken — speaker names are metadata."
        >
          <Textarea
            rows={3}
            value={scene.dialogue_text || ''}
            onChange={(e) => set({ dialogue_text: e.target.value })}
            placeholder={'Ali Baba: Just a bit more wood to chop!'}
          />
        </Field>
      )}

      {showNarration && (
        <Field label="Narration">
          <Textarea
            rows={3}
            value={scene.narration_text || ''}
            onChange={(e) => set({ narration_text: e.target.value })}
            placeholder="Deep in the forest, Ali Baba searched for firewood..."
          />
        </Field>
      )}

      {showRhyme && (
        <Field label="Rhyme / Song Lyrics" helper="Used later for the song generator.">
          <Textarea
            rows={4}
            value={scene.rhyme_lyrics || ''}
            onChange={(e) => set({ rhyme_lyrics: e.target.value })}
            placeholder={'Twinkle twinkle little star,\nHow I wonder what you are...'}
          />
        </Field>
      )}

      {!isSilent && (
        <>
          <Field label="Background Music Prompt">
            <Textarea
              rows={2}
              value={scene.background_music_prompt || ''}
              onChange={(e) => set({ background_music_prompt: e.target.value })}
              placeholder="Soft orchestral, mysterious, low strings..."
            />
          </Field>

          <Field label="Sound Effects Prompt">
            <Textarea
              rows={2}
              value={scene.sfx_prompt || ''}
              onChange={(e) => set({ sfx_prompt: e.target.value })}
              placeholder="Birds chirping, footsteps on dry leaves..."
            />
          </Field>

          <Field label="Voice Style" helper="e.g. warm male, child, narrator.">
            <Input
              value={scene.voice_style || ''}
              onChange={(e) => set({ voice_style: e.target.value })}
              placeholder="Warm male narrator"
            />
          </Field>

          <Field label="Audio Timing (seconds)" helper="Optional. When should audio start within the scene?">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={scene.audio_timing ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                set({ audio_timing: v === '' ? null : Number(v) });
              }}
              placeholder="0"
            />
          </Field>
        </>
      )}

      {isSilent && (
        <p className="text-xs text-muted-foreground italic">
          This scene will be silent — no audio fields are needed.
        </p>
      )}
    </div>
  );
}
