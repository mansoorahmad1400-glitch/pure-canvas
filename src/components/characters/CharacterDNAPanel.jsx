import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Save, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DNA_FIELDS = [
  { key: 'gender',          label: 'Gender' },
  { key: 'age_range',       label: 'Age Range' },
  { key: 'ethnicity',       label: 'Ethnicity / Appearance' },
  { key: 'facial_structure',label: 'Facial Structure' },
  { key: 'hairstyle',       label: 'Hairstyle' },
  { key: 'beard_makeup',    label: 'Beard / Makeup' },
  { key: 'clothing_style',  label: 'Clothing Style' },
  { key: 'color_palette',   label: 'Color Palette' },
  { key: 'body_type',       label: 'Body Type' },
  { key: 'accessories',     label: 'Accessories' },
  { key: 'personality_vibe',label: 'Personality Vibe' },
  { key: 'emotional_tone',  label: 'Emotional Tone' },
  { key: 'voice_tone',      label: 'Voice Tone' },
  { key: 'style_category',  label: 'Style Category' },
];

export default function CharacterDNAPanel({ character, projectId, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [dna, setDna] = useState(character.dna || {});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build a compact consistency_prompt from DNA
      const parts = [
        dna.gender, dna.age_range, dna.ethnicity, dna.facial_structure,
        dna.hairstyle, dna.beard_makeup, dna.clothing_style, dna.color_palette,
        dna.body_type, dna.accessories,
      ].filter(Boolean);
      const consistencyPrompt = parts.length > 0
        ? `${character.name}: ${parts.join(', ')}`
        : character.description_full || '';

      const score = calculateScore({ ...character, dna: { ...dna, consistency_prompt: consistencyPrompt } });

      await base44.functions.invoke('characterHub', {
        action: 'update_dna',
        project_id: projectId,
        character_id: character.id,
        dna: { ...dna, consistency_prompt: consistencyPrompt },
        consistency_score: score,
      });
      onUpdate(character.id, { dna: { ...dna, consistency_prompt: consistencyPrompt }, consistency_score: score });
      toast.success('DNA profile saved');
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('characterHub', {
        action: 'generate_dna',
        project_id: projectId,
        character_id: character.id,
        description_full: character.description_full,
        description_short: character.description_short,
        name: character.name,
      });
      if (res.data?.dna) {
        setDna(res.data.dna);
        onUpdate(character.id, { dna: res.data.dna, consistency_score: res.data.consistency_score ?? 0 });
        toast.success('DNA auto-generated from description');
      }
    } catch (e) {
      toast.error(e.message || 'Generation failed');
    }
    setGenerating(false);
  };

  const filledCount = DNA_FIELDS.filter(f => dna[f.key]?.trim()).length;

  return (
    <div className="mt-2 rounded-lg border border-border/20 bg-background/30 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-primary/70">⬡</span> DNA Profile
          <span className={`ml-1 px-1.5 py-0 rounded text-[9px] font-bold ${
            filledCount >= 8 ? 'bg-green-500/20 text-green-400' :
            filledCount >= 4 ? 'bg-amber-500/20 text-amber-400' :
            'bg-secondary text-muted-foreground'
          }`}>
            {filledCount}/{DNA_FIELDS.length}
          </span>
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            {DNA_FIELDS.map(f => (
              <div key={f.key}>
                <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-0.5">{f.label}</p>
                <input
                  value={dna[f.key] || ''}
                  onChange={e => setDna(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder="—"
                  className="w-full text-[11px] bg-secondary/40 border border-border/20 rounded-md px-2 py-1 text-foreground focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/30"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoGenerate}
              disabled={generating}
              className="h-7 text-[11px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Auto-Generate
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-7 text-[11px] gap-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save DNA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function calculateScore(char) {
  let score = 0;
  if (char.lock_type === 'image') score += 40;
  else if (char.lock_type === 'text') score += 20;
  if (char.reference_image_url) score += 20;
  const dna = char.dna || {};
  const dnaFilled = ['gender','age_range','ethnicity','facial_structure','hairstyle','clothing_style','color_palette'].filter(k => dna[k]?.trim()).length;
  score += Math.round((dnaFilled / 7) * 30);
  if (char.description_full?.length > 50) score += 10;
  return Math.min(score, 100);
}