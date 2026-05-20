import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, MapPin, Palette, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function StoryboardContinuityPanel({ projectId }) {
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      base44.entities.ProjectCharacter.filter({ project_id: projectId }),
      base44.entities.WorldLocation.filter({ project_id: projectId }),
    ]).then(([chars, locs]) => {
      setCharacters((chars || []).filter(c => c.lock_type !== 'none' || c.reference_image_url));
      setLocations((locs || []).filter(l => l.lock_type !== 'none' || l.reference_image_url));
    }).catch(() => {});
  }, [projectId]);

  if (characters.length === 0 && locations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/30 bg-card/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-xs font-semibold text-foreground">Continuity Inheritance</h4>
        <span className="text-[10px] text-muted-foreground ml-1">Locked assets auto-injected into prompts</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {characters.map(c => (
          <div key={c.id} className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-2.5 py-1">
            {c.reference_image_url && (
              <img src={c.reference_image_url} className="w-4 h-4 rounded-full object-cover" alt="" />
            )}
            {!c.reference_image_url && <Users className="w-3 h-3 text-purple-400" />}
            <span className="text-[11px] text-purple-300">{c.name}</span>
            {(c.lock_type === 'image' || c.lock_type === 'text') && (
              <Check className="w-2.5 h-2.5 text-green-400" />
            )}
          </div>
        ))}
        {locations.map(l => (
          <div key={l.id} className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1">
            <MapPin className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] text-blue-300">{l.canonical_name}</span>
            {(l.lock_type === 'image' || l.lock_type === 'text') && (
              <Check className="w-2.5 h-2.5 text-green-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}