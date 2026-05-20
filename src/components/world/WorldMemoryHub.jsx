import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe, RefreshCw, Sparkles, MapPin, Lock, Unlock,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import LocationCard from './LocationCard';

export default function WorldMemoryHub({ project }) {
  const [locations, setLocations] = useState([]);
  const [access, setAccess] = useState({ canView: true, canEdit: false, canLock: false, canUploadReference: false, isAdmin: false });
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);

  const load = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('worldMemory', {
        action: 'get_locations',
        project_id: project.id,
      });
      setLocations((res.data?.locations || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setAccess(res.data?.access || access);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load world memory');
    }
    setLoading(false);
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  const handleExtract = async (forceReinit = false) => {
    if (!project?.master_prompt && !project?.visual_prompt) {
      toast.error('Generate a blueprint first to extract world memory.');
      return;
    }
    setExtracting(true);
    try {
      const res = await base44.functions.invoke('worldMemory', {
        action: 'extract_locations',
        project_id: project.id,
        master_prompt: project.master_prompt,
        visual_prompt: project.visual_prompt,
        force_reinit: forceReinit,
      });
      const locs = res.data?.locations || [];
      setLocations(locs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      if (res.data?.extracted) {
        toast.success(`${locs.length} location${locs.length !== 1 ? 's' : ''} extracted from your world!`);
      } else {
        toast.info('World memory already loaded.');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Extraction failed');
    }
    setExtracting(false);
  };

  const lockedCount = locations.filter(l => l.lock_type !== 'none').length;
  const avgScore = locations.length > 0
    ? Math.round(locations.reduce((s, l) => s + (l.consistency_score || 0), 0) / locations.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-semibold text-foreground">World Memory</h3>
            {locations.length > 0 && (
              <Badge variant="outline" className="text-[10px] border-border/50">
                {locations.length} location{locations.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Recurring locations with locked visual DNA for cross-scene consistency.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {locations.length > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">{lockedCount} locked · avg {avgScore}%</p>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {locations.length > 0 && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-border/50"
              onClick={() => handleExtract(true)}
              disabled={extracting}
            >
              {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Re-scan
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {locations.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Locations', value: locations.length, icon: MapPin, color: 'text-sky-400' },
            { label: 'Locked', value: lockedCount, icon: Lock, color: 'text-blue-400' },
            { label: 'World Score', value: `${avgScore}%`, icon: Globe, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-card/50 border border-border/30 p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-sky-400/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No world memory yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Extract recurring locations from your blueprint to build visual consistency across all scenes.
            </p>
          </div>
          <Button
            onClick={() => handleExtract(false)}
            disabled={extracting}
            className="gap-2 bg-sky-600 hover:bg-sky-700 text-white"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {extracting ? 'Extracting World Memory…' : 'Extract World Memory'}
          </Button>
        </div>
      )}

      {/* Location cards */}
      {locations.length > 0 && (
        <div className="space-y-3">
          {locations.map(loc => (
            <LocationCard
              key={loc.id}
              location={loc}
              access={access}
              onUpdated={(updated) => setLocations(prev => prev.map(l => l.id === updated.id ? updated : l))}
              onDeleted={(id) => setLocations(prev => prev.filter(l => l.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Info footer */}
      {locations.length > 0 && (
        <div className="rounded-xl bg-sky-500/5 border border-sky-500/10 p-3">
          <p className="text-xs text-sky-300/80 leading-relaxed">
            <span className="font-semibold">How it works:</span> Locked environments auto-inject visual DNA (lighting, colors, architecture) into scene prompts — ensuring every scene at the same location looks visually consistent.
          </p>
        </div>
      )}
    </div>
  );
}