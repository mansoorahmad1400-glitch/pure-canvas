import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Check, X, ImageIcon } from 'lucide-react';

export default function CharacterRefPanel({ character, projectId, access, costs, onUpdated }) {
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);

  const isApproved = character.consistency_status === 'image_locked';
  const hasRef = !!character.reference_image_url;

  const isMainRole = ['protagonist', 'antagonist'].includes(character.role);
  if (!isMainRole && !['supporting'].includes(character.role)) return null;

  const genCost = hasRef ? (costs?.character_ref_regenerate ?? 0) : (costs?.character_ref_generate ?? 0);

  const handleGenerate = async () => {
    if (!access?.canGenerate) { toast.error('Character reference generation requires a paid plan'); return; }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('characterRefGeneration', {
        action: 'generate',
        project_id: projectId,
        character_id: character.id,
      });
      if (res.data?.success) {
        toast.success(`Reference generated — ${res.data.gems_deducted ?? genCost} 💎`);
        onUpdated(character.id, {
          reference_image_url: res.data.image_url,
          consistency_status: 'reference_uploaded',
          lock_type: 'image',
        });
      }
    } catch (e) {
      const d = e?.response?.data;
      if (d?.insufficient_gems) toast.error(d.error || 'Not enough gems');
      else if (d?.provider_not_configured) toast.error('Image provider not configured yet');
      else if (d?.plan_gate) toast.error('Paid plan required');
      else toast.error(d?.error || 'Generation failed');
    }
    setGenerating(false);
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await base44.functions.invoke('characterRefGeneration', {
        action: 'approve',
        project_id: projectId,
        character_id: character.id,
      });
      toast.success(`${character.name} approved ✓`);
      onUpdated(character.id, { consistency_status: 'image_locked', lock_type: 'image' });
    } catch (e) { toast.error('Approve failed'); }
    setApproving(false);
  };

  const handleUnapprove = async () => {
    try {
      await base44.functions.invoke('characterRefGeneration', {
        action: 'unapprove',
        project_id: projectId,
        character_id: character.id,
      });
      onUpdated(character.id, { consistency_status: 'reference_uploaded' });
    } catch (e) { toast.error('Failed'); }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/20 space-y-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Character Reference</p>

      {/* Small Disney-style thumbnail */}
      {hasRef && (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border/30 bg-secondary/20">
          <img
            src={character.reference_image_url}
            alt={`${character.name} ref`}
            className="w-full h-full object-cover"
          />
          {isApproved && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm" variant="outline"
          className="h-7 text-[11px] gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating
            ? <RefreshCw className="w-3 h-3 animate-spin" />
            : <Sparkles className="w-3 h-3" />
          }
          {generating ? 'Generating…' : hasRef ? 'Regen' : 'Generate'}
        </Button>

        {hasRef && !isApproved && (
          <Button
            size="sm" variant="outline"
            className="h-7 text-[11px] gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Approve &amp; Lock
          </Button>
        )}

        {isApproved && (
          <Button
            size="sm" variant="ghost"
            className="h-7 text-[11px] gap-1 text-muted-foreground"
            onClick={handleUnapprove}
          >
            <X className="w-3 h-3" /> Unapprove
          </Button>
        )}
      </div>
    </div>
  );
}