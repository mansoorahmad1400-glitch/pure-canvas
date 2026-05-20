import { useState } from 'react';
import { Crown, Lock, Zap, FileText, FolderPlus, Download, Youtube, Image, Package, BookOpen } from 'lucide-react';
import UpgradeModal from './UpgradeModal';

const PREMIUM_FEATURES = [
  {
    id: 'advanced_production',
    icon: Zap,
    label: 'Advanced Production Pack',
    desc: 'Cinematography notes, emotional arc, scene variations',
  },
  {
    id: 'longer_story',
    icon: BookOpen,
    label: 'Longer Story Generation',
    desc: 'Extended narratives up to 30 min with deep scene detail',
  },
  {
    id: 'more_projects',
    icon: FolderPlus,
    label: 'More Saved Projects',
    desc: 'Unlimited project saves vs 5 on free',
  },
  {
    id: 'premium_exports',
    icon: Download,
    label: 'Premium Exports',
    desc: 'Export as PDF, structured JSON, and formatted scripts',
  },
  {
    id: 'priority_generation',
    icon: Zap,
    label: 'Priority Generation Mode',
    desc: 'Jump the queue — fastest AI processing available',
  },
  {
    id: 'multi_pack',
    icon: Package,
    label: 'Multi-Pack Output',
    desc: 'Generate 3 variations in one click for A/B testing',
  },
  {
    id: 'advanced_youtube',
    icon: Youtube,
    label: 'Advanced YouTube Package',
    desc: 'SEO-optimized title, description, tags + hook script',
  },
  {
    id: 'thumbnail_pack',
    icon: Image,
    label: 'Advanced Thumbnail Pack',
    desc: 'Multiple thumbnail concepts with style & color direction',
  },
];

function FeatureItem({ feature, isPremium, onLockClick }) {
  const Icon = feature.icon;

  return (
    <button
      onClick={() => !isPremium && onLockClick(feature.label)}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 group
        ${isPremium
          ? 'border-border/40 bg-background/40 hover:bg-primary/5 hover:border-primary/30 cursor-pointer'
          : 'border-border/30 bg-background/20 hover:bg-secondary/40 cursor-pointer opacity-80 hover:opacity-100'
        }`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors
        ${isPremium ? 'bg-primary/15 group-hover:bg-primary/25' : 'bg-secondary'}`}
      >
        <Icon className={`w-3.5 h-3.5 ${isPremium ? 'text-primary' : 'text-muted-foreground/60'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-semibold truncate ${isPremium ? 'text-foreground' : 'text-muted-foreground'}`}>
            {feature.label}
          </span>
          {!isPremium && <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
          {isPremium && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold border border-primary/20">
              <Crown className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/70 leading-snug">{feature.desc}</p>
      </div>
    </button>
  );
}

export default function PremiumFeatures({ isPremium }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const handleLockClick = (featureName) => {
    setSelectedFeature(featureName);
    setModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Crown className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Premium Features</h2>
            <p className="text-xs text-muted-foreground">
              {isPremium ? 'All features unlocked' : 'Upgrade to unlock'}
            </p>
          </div>
          {!isPremium && (
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
              $9/mo
            </span>
          )}
        </div>

        {/* Feature list */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {PREMIUM_FEATURES.map(f => (
            <FeatureItem
              key={f.id}
              feature={f}
              isPremium={isPremium}
              onLockClick={handleLockClick}
            />
          ))}
        </div>

        {/* Upgrade CTA for free users */}
        {!isPremium && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <button
              onClick={() => { setSelectedFeature(null); setModalOpen(true); }}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold transition-colors"
            >
              <Crown className="w-3.5 h-3.5" /> Unlock All Premium Features
            </button>
          </div>
        )}
      </div>

      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={selectedFeature}
      />
    </>
  );
}