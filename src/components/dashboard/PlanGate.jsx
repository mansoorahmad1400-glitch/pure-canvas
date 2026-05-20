import { Link } from 'react-router-dom';
import { Lock, Crown, Gem, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PlanGate — wraps content that requires a plan/gem check.
 *
 * Props:
 *   access: result of usePlanAccess().checkAccess(actionKey)
 *   comingSoon: boolean — if true, show "Coming Soon" instead of upgrade
 *   featureLabel: string — e.g. "Image Generation"
 *   children: the real content, rendered only when access.allowed
 */
export default function PlanGate({ access, comingSoon, featureLabel, children }) {
  if (comingSoon) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border border-border/30 bg-secondary/20 text-center">
        <Sparkles className="w-5 h-5 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">{featureLabel || 'Feature'}</p>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">Coming Soon</span>
      </div>
    );
  }

  if (!access || access.allowed) {
    return children;
  }

  if (access.upgradeRequired) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-xl border border-border/30 bg-secondary/20 text-center">
        <Lock className="w-5 h-5 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium text-foreground">{featureLabel || 'Premium Feature'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Upgrade your plan to unlock this feature.</p>
        </div>
        <Link to="/upgrade">
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90">
            <Crown className="w-3.5 h-3.5" /> Upgrade Plan
          </Button>
        </Link>
      </div>
    );
  }

  if (access.gemsRequired) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
        <Gem className="w-5 h-5 text-amber-400/70" />
        <div>
          <p className="text-sm font-medium text-foreground">{featureLabel || 'Not Enough Gems'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{access.reason}</p>
        </div>
        <Link to="/upgrade">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            <Crown className="w-3.5 h-3.5" /> Get More Gems
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}