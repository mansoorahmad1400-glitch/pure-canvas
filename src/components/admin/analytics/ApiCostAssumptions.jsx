import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';

const COST_FIELDS = [
  { key: 'text_per_call',     label: 'Text Gen (per call)',   hint: 'GPT-4o-mini avg' },
  { key: 'text_pro_per_call', label: 'Text Gen Pro (per call)',hint: 'GPT-4o avg' },
  { key: 'image_per_call',    label: 'Image Gen (per call)',  hint: 'DALL-E / Midjourney avg' },
  { key: 'video_per_call',    label: 'Video Gen (per call)',  hint: 'Runway / Sora avg' },
  { key: 'audio_per_call',    label: 'Audio Gen (per call)',  hint: 'ElevenLabs avg' },
  { key: 'export_per_call',   label: 'Export / Bandwidth',    hint: 'Bandwidth cost per export' },
];

export default function ApiCostAssumptions({ costs, onCostsChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-secondary/20 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2 text-foreground">
          <Save className="w-3.5 h-3.5 text-primary" />
          API Cost Assumptions (editable)
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-border/30 pt-4">
          {COST_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{f.label}</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.001}
                  value={costs[f.key] ?? 0}
                  onChange={e => onCostsChange({ ...costs, [f.key]: Number(e.target.value) })}
                  className="h-8 text-xs pl-5 border-border/40 bg-background/60"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{f.hint}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}