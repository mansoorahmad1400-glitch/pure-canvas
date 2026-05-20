import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Gem, Image, Film, Mic, Scissors, Send, Settings2,
  CheckCircle2, Clock, Lock, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PHASES = [
  {
    id: 'blueprint',
    phase: 'Phase 1',
    title: 'Blueprint Engine',
    status: 'live',
    icon: Gem,
    color: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgColor: 'from-green-500/8',
    badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
    description: 'Core text-based content creation engine. Generates structured AI blueprints for video production.',
    specs: [
      '1 gem per successful blueprint generation',
      'Max 18 scenes per blueprint',
      'Failed generations do not deduct gems (refunded)',
      'Manual user text edits cost 0 gems',
      'Standard and Advanced generation modes',
      'YouTube metadata package included',
    ],
  },
  {
    id: 'storyboard',
    phase: 'Phase 2',
    title: 'Storyboard Image System',
    status: 'planned',
    icon: Image,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'from-blue-500/5',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Static visual previews generated per scene before any animation or video rendering begins.',
    specs: [
      'One image generated per scene from visual prompts',
      'User reviews and approves images before proceeding',
      'Supports aspect ratios: 16:9, 9:16, 1:1',
      'Rejected images can be regenerated (gem cost TBD)',
      'Images stored per project in user library',
      'Approval gate prevents wasteful video generation',
    ],
  },
  {
    id: 'animation',
    phase: 'Phase 3',
    title: 'Animation / Video System',
    status: 'planned',
    icon: Film,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'from-purple-500/5',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: 'Scene-by-scene animation engine using approved storyboard images as visual anchors.',
    specs: [
      'Animation triggered only after image approval gate',
      'Frame chaining for visual continuity between scenes',
      'Gem-based rendering cost per scene (TBD)',
      'Scene-level re-render without full project re-generation',
      'Multiple animation style presets',
      'Raw video output per scene before post-production',
    ],
  },
  {
    id: 'audio',
    phase: 'Phase 4',
    title: 'Audio / Voice System',
    status: 'planned',
    icon: Mic,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    bgColor: 'from-yellow-500/5',
    badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    description: 'Scene-synchronized audio pipeline covering narration, sound effects, and music.',
    specs: [
      'Narration guide generated per scene',
      'AI voice narration (TTS integration, TBD)',
      'Sound effect prompts per scene',
      'Background music prompts and mood matching',
      'Scene-based audio timing and sync',
      'Audio tracks exported separately or merged',
    ],
  },
  {
    id: 'postprod',
    phase: 'Phase 5',
    title: 'Post-Production Editor',
    status: 'planned',
    icon: Scissors,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    bgColor: 'from-orange-500/5',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    description: 'In-app editor for finalizing video output after animation and audio are complete.',
    specs: [
      'Trim and reorder scene clips',
      'Scene organization with drag-and-drop',
      'Caption / subtitle overlay per scene',
      'AI upscaling options (resolution enhancement)',
      'Preview full video before export',
      'Export final merged video file',
    ],
  },
  {
    id: 'publishing',
    phase: 'Phase 6',
    title: 'Publishing Hub',
    status: 'planned',
    icon: Send,
    color: 'text-pink-400',
    borderColor: 'border-pink-500/30',
    bgColor: 'from-pink-500/5',
    badgeColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    description: 'One-click publishing pipeline to distribute finished videos across major platforms.',
    specs: [
      'YouTube direct upload with generated metadata',
      'TikTok video publishing integration',
      'Instagram Reels export support',
      'Scheduled publishing (future)',
      'Analytics overview post-publish',
      'Multi-platform single-click distribution',
    ],
  },
  {
    id: 'admin-pricing',
    phase: 'Phase 7',
    title: 'Admin Pricing Control',
    status: 'planned',
    icon: Settings2,
    color: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgColor: 'from-red-500/5',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    description: 'Admin dashboard controls for managing gem costs, plan limits, feature access, and tool pricing.',
    specs: [
      'Configurable gem cost per feature type',
      'Plan-based feature flags (enable/disable per tier)',
      'Override individual user gem limits',
      'Cost analytics: gems consumed per feature per period',
      'Emergency feature kill-switch per module',
      'Pricing history and audit log',
    ],
  },
];

const STATUS_CONFIG = {
  live: { label: 'Live', icon: CheckCircle2, className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  planned: { label: 'Planned', icon: Clock, className: 'bg-secondary text-muted-foreground border-border/50' },
  locked: { label: 'Locked', icon: Lock, className: 'bg-secondary text-muted-foreground border-border/30' },
};

function PhaseCard({ phase, index }) {
  const Icon = phase.icon;
  const status = STATUS_CONFIG[phase.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-2xl border-2 ${phase.borderColor} bg-gradient-to-b ${phase.bgColor} to-card/50 p-6 overflow-hidden`}
    >
      {/* Phase label top-right */}
      <div className="absolute top-4 right-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${status.className}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-5 pr-20">
        <div className={`w-11 h-11 rounded-xl bg-card/80 border ${phase.borderColor} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${phase.color}`} />
        </div>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${phase.color} mb-0.5`}>{phase.phase}</p>
          <h3 className="text-lg font-semibold text-foreground leading-tight">{phase.title}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{phase.description}</p>

      <ul className="space-y-2">
        {phase.specs.map((spec, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/75">
            <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${phase.color}`} />
            {spec}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function Roadmap() {
  const { user, isAdmin } = useCurrentUser();

  if (!isAdmin && user) return <Navigate to="/" replace />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-wider">
            Internal — Admin Only
          </Badge>
        </div>
        <h1 className="text-3xl font-bold font-playfair mb-2">StudioOne AI — Product Roadmap</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Structured development phases for expanding StudioOne AI from text blueprint generation into a full end-to-end video production platform. Phases 2–7 are placeholders — not yet activated.
        </p>
      </motion.div>

      {/* Phase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PHASES.map((phase, i) => (
          <PhaseCard key={phase.id} phase={phase} index={i} />
        ))}
      </div>

      {/* Footer note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 p-4 rounded-xl border border-border/40 bg-card/30 text-center"
      >
        <p className="text-xs text-muted-foreground">
          This roadmap is visible to admins only. Planned features are structural placeholders — no code is activated until each phase is officially developed and deployed.
        </p>
      </motion.div>
    </div>
  );
}