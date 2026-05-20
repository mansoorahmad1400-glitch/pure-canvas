import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, AlertTriangle, Users, ImageIcon, Lock, Globe, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

export default function CharacterReadinessChecklist({ projectId }) {
  const [charStats, setCharStats] = useState(null);
  const [worldStats, setWorldStats] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      base44.functions.invoke('characterRefGeneration', { action: 'get_status', project_id: projectId })
        .then(res => { if (res.data?.stats) setCharStats(res.data.stats); })
        .catch(() => {}),
      base44.functions.invoke('worldMemory', { action: 'get_world_status', project_id: projectId })
        .then(res => { if (res.data?.stats) setWorldStats(res.data.stats); })
        .catch(() => {}),
    ]);
  }, [projectId]);

  if (!charStats && !worldStats) return null;

  const steps = [
    {
      id: 'chars_extracted',
      label: 'Characters extracted',
      done: charStats?.has_any_chars ?? false,
      icon: Users,
    },
    {
      id: 'char_refs',
      label: `Character references generated (${charStats?.with_refs ?? 0}/${charStats?.main ?? 0} main)`,
      done: charStats?.has_refs ?? false,
      icon: ImageIcon,
    },
    {
      id: 'chars_approved',
      label: `Main characters approved (${charStats?.approved ?? 0}/${charStats?.main ?? 0})`,
      done: charStats?.all_main_approved ?? false,
      icon: Lock,
    },
    {
      id: 'locs_extracted',
      label: `Locations extracted (${worldStats?.total ?? 0} found)`,
      done: worldStats?.has_any ?? false,
      icon: Globe,
      optional: true,
    },
    {
      id: 'locs_approved',
      label: `Location references approved (${worldStats?.approved ?? 0}/${worldStats?.total ?? 0})`,
      done: worldStats?.all_approved ?? false,
      icon: MapPin,
      optional: true,
    },
  ];

  const requiredSteps = steps.filter(s => !s.optional);
  const allRequiredDone = requiredSteps.every(s => s.done);
  const allDone = steps.every(s => s.done);

  const statusColor = allDone ? 'green' : allRequiredDone ? 'sky' : 'amber';
  const borderClass = allDone ? 'border-green-500/20 bg-green-500/5' : allRequiredDone ? 'border-sky-500/20 bg-sky-500/5' : 'border-amber-500/20 bg-amber-500/5';
  const iconClass = allDone ? 'text-green-400' : allRequiredDone ? 'text-sky-400' : 'text-amber-400';
  const textClass = allDone ? 'text-green-400' : allRequiredDone ? 'text-sky-400' : 'text-amber-400';

  const summaryText = allDone
    ? 'All references ready — scene generation fully optimized!'
    : allRequiredDone
    ? 'Characters ready. Recommended: approve location references for world consistency.'
    : 'Recommended: approve character references before generating scenes.';

  return (
    <div className={`rounded-xl border ${borderClass} overflow-hidden`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 gap-3"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          {allDone
            ? <Check className={`w-4 h-4 ${iconClass}`} />
            : <AlertTriangle className={`w-4 h-4 ${iconClass}`} />
          }
          <span className={`text-xs font-semibold ${textClass}`}>{summaryText}</span>
        </div>
        {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-border/20 pt-3">
          {steps.map(step => (
            <div key={step.id} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-500/20' : 'bg-secondary/60'}`}>
                {step.done
                  ? <Check className="w-2.5 h-2.5 text-green-400" />
                  : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                }
              </div>
              <span className={`text-xs ${step.done ? 'text-muted-foreground line-through' : 'text-foreground/80'}`}>
                {step.label}
                {step.optional && !step.done && (
                  <span className="ml-1 text-[10px] text-muted-foreground/50">(recommended)</span>
                )}
              </span>
            </div>
          ))}

          {!allDone && (
            <p className="text-[11px] text-muted-foreground/60 pt-1">
              {!allRequiredDone
                ? <>Go to the <span className="text-primary font-medium">Characters tab</span> to generate and approve character references.</>
                : <>Go to the <span className="text-sky-400 font-medium">World Memory tab</span> to generate and approve location references for stronger visual consistency.</>
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
}