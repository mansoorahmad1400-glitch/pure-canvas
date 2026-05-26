import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const TRANSITIONS = [
  { value: 'cut',      label: 'Cut' },
  { value: 'fade',     label: 'Fade' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'wipe',     label: 'Wipe' },
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

export default function VisualSectionForm({ scene, onChange }) {
  const set = (patch) => onChange(patch);
  const charactersStr = Array.isArray(scene.characters)
    ? scene.characters.join(', ')
    : (scene.characters || '');

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Describe what the viewer sees in this scene.
      </p>

      <Field label="Scene Title">
        <Input
          value={scene.scene_title || ''}
          onChange={(e) => set({ scene_title: e.target.value })}
          placeholder="e.g. Ali Baba enters the forest"
        />
      </Field>

      <Field label="Story / Action" helper="What happens in this moment?">
        <Textarea
          rows={3}
          value={scene.story_text || ''}
          onChange={(e) => set({ story_text: e.target.value })}
          placeholder="Ali Baba walks into a dense forest, looking for firewood..."
        />
      </Field>

      <Field label="Characters in Scene" helper="Comma-separated names.">
        <Input
          value={charactersStr}
          onChange={(e) =>
            set({
              characters: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="Ali Baba, Narrator"
        />
      </Field>

      <Field label="Environment / Location Description">
        <Textarea
          rows={2}
          value={scene.environment_description || ''}
          onChange={(e) => set({ environment_description: e.target.value })}
          placeholder="Lush green forest at golden hour, tall ancient trees..."
        />
      </Field>

      <Field label="Camera Direction" helper="e.g. wide shot, close-up, dolly in.">
        <Input
          value={scene.camera_direction || ''}
          onChange={(e) => set({ camera_direction: e.target.value })}
          placeholder="Wide shot, slow push-in"
        />
      </Field>

      <Field label="Image Prompt" helper="Used later to generate the scene image.">
        <Textarea
          rows={3}
          value={scene.image_prompt || ''}
          onChange={(e) => set({ image_prompt: e.target.value })}
          placeholder="Cinematic shot of a man in robes entering a sunlit forest..."
        />
      </Field>

      <Field label="Animation Prompt" helper="How should the image move?">
        <Textarea
          rows={2}
          value={scene.animation_prompt || ''}
          onChange={(e) => set({ animation_prompt: e.target.value })}
          placeholder="Gentle wind in leaves, character walks forward slowly..."
        />
      </Field>

      <Field label="Transition to Next Scene">
        <Select
          value={scene.transition_to_next || 'cut'}
          onValueChange={(v) => set({ transition_to_next: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
