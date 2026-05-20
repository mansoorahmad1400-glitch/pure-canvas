import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSearchParams, Link } from 'react-router-dom';
import { Crown, Gem, Check, X, Sparkles, Zap, Lock, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    priceNote: '',
    gems: '2 lifetime gems',
    tagline: 'Try StudioOne AI with 2 lifetime gems.',
    model: 'GPT-4o-mini',
    color: 'muted',
    features: [
      { label: '2 lifetime gems', ok: true },
      { label: '1 gem per generation', ok: true },
      { label: 'Copy & download blueprints', ok: true },
      { label: 'Monthly gem reset', ok: false },
      { label: 'Priority generation', ok: false },
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$9.99',
    priceNote: '/month',
    gems: '200 gems/month',
    tagline: 'Start creating with 200 monthly gems.',
    model: 'GPT-4o-mini',
    color: 'blue',
    features: [
      { label: '200 gems per month', ok: true },
      { label: 'Monthly gem reset', ok: true },
      { label: '1 gem per generation', ok: true },
      { label: 'Copy & download blueprints', ok: true },
      { label: 'Full blueprint output', ok: true },
    ],
  },
  {
    key: 'premium',
    name: 'Creator Pro',
    price: '$19.99',
    priceNote: '/month',
    gems: '500 gems/month',
    tagline: 'For regular creators — 500 monthly gems.',
    model: 'GPT-4o-mini',
    color: 'primary',
    featured: true,
    features: [
      { label: '500 gems per month', ok: true },
      { label: 'Monthly gem reset', ok: true },
      { label: '1 gem per generation', ok: true },
      { label: 'Full blueprint output', ok: true },
      { label: 'YouTube packaging', ok: true },
    ],
  },
  {
    key: 'elite',
    name: 'Studio Elite',
    price: '$39.99',
    priceNote: '/month',
    gems: '1100 gems/month',
    tagline: 'Premium creative power with GPT-4o and 1100 monthly gems.',
    model: 'GPT-4o',
    color: 'amber',
    features: [
      { label: '1100 gems per month', ok: true },
      { label: 'GPT-4o quality generation', ok: true },
      { label: 'Monthly gem reset', ok: true },
      { label: '1 gem per generation', ok: true },
      { label: 'Early feature access', ok: true },
    ],
  },
];

const isInBuilderPreview = () => {
  try {
    const hostname = window.location.hostname;
    return hostname.includes('preview-sandbox') && hostname.includes('base44.app');
  } catch { return false; }
};

function IframeBlocker() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="font-playfair text-2xl font-bold mb-3">Open the App to Upgrade</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Payments cannot be processed inside a preview. Please open the published app directly to upgrade your plan.
        </p>
        <a
          href="https://studioone.ai/upgrade"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Open StudioOne AI
        </a>
      </motion.div>
    </div>
  );
}

function PlanCard({ plan, currentRole, onUpgrade, upgrading, onSwitch, switching }) {
  const isCurrent = currentRole === plan.key || (plan.key === 'free' && !['starter', 'premium', 'elite', 'admin'].includes(currentRole));
  const isDowngrade = false; // we never show downgrade UI

  const colorMap = {
    muted:   { border: 'border-border/50',        bg: 'bg-card/50',                        badge: '',                        icon: 'text-muted-foreground', btn: 'variant-outline' },
    blue:    { border: 'border-blue-500/40',       bg: 'bg-gradient-to-b from-blue-500/8 to-card/60',  badge: '',           icon: 'text-blue-400',         btn: 'blue' },
    primary: { border: 'border-primary/50',        bg: 'bg-gradient-to-b from-primary/10 to-card/60',  badge: 'Most Popular', icon: 'text-primary',         btn: 'primary' },
    amber:   { border: 'border-amber-500/50',      bg: 'bg-gradient-to-b from-amber-500/10 to-card/60', badge: 'Best Quality', icon: 'text-amber-400',       btn: 'amber' },
  };
  const c = colorMap[plan.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-6 rounded-2xl border-2 ${c.border} ${c.bg} overflow-hidden flex flex-col`}
    >
      {/* glow */}
      {plan.color !== 'muted' && (
        <div className={`absolute -top-8 -right-8 w-32 h-32 ${plan.color === 'amber' ? 'bg-amber-500/20' : plan.color === 'primary' ? 'bg-primary/20' : 'bg-blue-500/15'} rounded-full blur-2xl pointer-events-none`} />
      )}

      {c.badge && (
        <div className="absolute top-4 right-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${plan.color === 'amber' ? 'bg-amber-500 text-amber-950' : 'bg-primary text-primary-foreground'}`}>
            <Star className="w-3 h-3" /> {c.badge}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-1">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.color === 'muted' ? 'bg-secondary' : plan.color === 'amber' ? 'bg-amber-500/20' : plan.color === 'primary' ? 'bg-primary/20' : 'bg-blue-500/15'}`}>
          {plan.color === 'muted' ? <Gem className="w-5 h-5 text-muted-foreground" /> : <Crown className={`w-5 h-5 ${c.icon}`} />}
        </div>
        <div>
          <h2 className={`font-semibold text-lg ${plan.color !== 'muted' ? c.icon : ''}`}>{plan.name}</h2>
          <p className="text-2xl font-bold">{plan.price}<span className="text-sm text-muted-foreground font-normal">{plan.priceNote}</span></p>
        </div>
      </div>

      <p className={`text-xs mb-1 ${plan.color !== 'muted' ? c.icon + '/70' : 'text-muted-foreground'}`}>{plan.gems} · {plan.model}</p>
      <p className="text-xs text-muted-foreground mb-5 italic">{plan.tagline}</p>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-center gap-2.5 text-sm">
            {f.ok
              ? <Check className={`w-4 h-4 shrink-0 ${plan.color === 'muted' ? 'text-muted-foreground' : plan.color === 'amber' ? 'text-amber-400' : plan.color === 'primary' ? 'text-primary' : 'text-blue-400'}`} />
              : <X className="w-4 h-4 shrink-0 text-muted-foreground/30" />}
            <span className={f.ok ? 'text-foreground/85' : 'text-muted-foreground/40 line-through'}>{f.label}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <Button variant="outline" disabled className={`w-full h-11 rounded-xl font-bold ${plan.color === 'amber' ? 'border-amber-500/30 text-amber-400' : plan.color === 'primary' ? 'border-primary/30 text-primary' : plan.color === 'blue' ? 'border-blue-500/30 text-blue-400' : 'border-border/50 text-muted-foreground'}`}>
          ✓ Current Plan
        </Button>
      ) : plan.key === 'free' ? null : (
        <Button
          onClick={() => onUpgrade(plan.key)}
          disabled={!!upgrading || !!switching}
          className={`w-full h-11 rounded-xl font-bold ${plan.color === 'amber' ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400' : plan.color === 'primary' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400'}`}
        >
          {upgrading === plan.key ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Upgrading...
            </span>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Upgrade to {plan.name}</>
          )}
        </Button>
      )}
    </motion.div>
  );
}

function UpgradeInner() {
  const { user, isStarter, isPremium, isElite, isAdmin, gems, isLoading, refetch } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const [upgrading, setUpgrading] = useState(null);
  const [switching, setSwitching] = useState(false);
  const inIframe = isInBuilderPreview();

  const currentRole = user?.role || 'free';

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      const timer = setTimeout(() => window.location.replace('/upgrade'), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleUpgrade = async (plan) => {
    if (isAdmin) return;
    if (!user) { base44.auth.redirectToLogin(); return; }

    // If already on a paid plan, use upgradeSubscription (prorate)
    if (isStarter || isPremium) {
      setSwitching(true);
      try {
        const res = await base44.functions.invoke('upgradeSubscription', {
          plan,
          success_url: `${window.location.origin}/upgrade?success=1`,
          cancel_url: `${window.location.origin}/upgrade?cancelled=1`,
        });
        if (res.data?.success) {
          toast.success(`Switched to ${plan}! Difference charged via Stripe.`);
          setTimeout(() => refetch(), 2000);
        } else if (res.data?.checkout_url) {
          window.location.href = res.data.checkout_url;
        } else {
          toast.error(res.data?.error || 'Upgrade failed. Please try again.');
        }
      } catch (err) {
        toast.error(err.message || 'Upgrade failed.');
      } finally {
        setSwitching(false);
      }
      return;
    }

    setUpgrading(plan);
    try {
      const response = await base44.functions.invoke('createCheckoutSession', {
        plan,
        success_url: `${window.location.origin}/upgrade?success=1`,
        cancel_url: `${window.location.origin}/upgrade?cancelled=1`,
      });
      const { url, error } = response.data;
      if (url) {
        window.location.href = url;
      } else {
        toast.error(error || 'Could not start checkout. Please try again.');
        setUpgrading(null);
      }
    } catch (err) {
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('unauthorized')) {
        toast.error('Please sign in to upgrade your plan.');
        setTimeout(() => base44.auth.redirectToLogin(window.location.pathname), 1500);
      } else {
        toast.error(err.message || 'Checkout failed. Please try again.');
      }
      setUpgrading(null);
    }
  };

  if (inIframe) return <IframeBlocker />;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (searchParams.get('success') === '1') {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="font-playfair text-3xl font-bold mb-3">Success!</h1>
          <p className="text-muted-foreground mb-4">Your plan has been activated. Reloading your account...</p>
        </motion.div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center mx-auto mb-6">
            <Crown className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="font-playfair text-3xl font-bold mb-3">Admin Access</h1>
          <p className="text-muted-foreground mb-6">You have system-level access with GPT-4o.</p>
          <Link to="/studio">
            <Button className="bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold hover:bg-purple-500/30">
              <Sparkles className="w-4 h-4 mr-2" /> Open Studio
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
            <Crown className="w-3.5 h-3.5" /> Choose Your Plan
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold mb-4">Unlock Your Creative Engine</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {user
              ? <>You have <span className="text-primary font-semibold">{gems} gem{gems !== 1 ? 's' : ''}</span> remaining.</>
              : <>Start free with 2 gems. No credit card required.</>
            }
          </p>
        </motion.div>

        {/* Plans grid — Free, Starter, Creator Pro, Studio Elite */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <PlanCard
                plan={plan}
                currentRole={currentRole}
                onUpgrade={handleUpgrade}
                upgrading={upgrading}
                switching={switching}
              />
            </motion.div>
          ))}
        </div>

        {/* Gem value table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" /> Plan Comparison
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Plan</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Gems</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Model</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground">Per gem</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Free',        price: '$0',        gems: '2 total',     model: 'GPT-4o-mini', perGem: '—' },
                  { name: 'Starter',     price: '$9.99/mo',  gems: '200/month',   model: 'GPT-4o-mini', perGem: '~$0.050' },
                  { name: 'Creator Pro', price: '$19.99/mo', gems: '500/month',   model: 'GPT-4o-mini', perGem: '~$0.040' },
                  { name: 'Studio Elite',price: '$39.99/mo', gems: '1100/month',  model: 'GPT-4o',      perGem: '~$0.036' },
                ].map((row) => (
                  <tr key={row.name} className="border-b border-border/20 last:border-0 hover:bg-card/60 transition-colors">
                    <td className="px-6 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.price}</td>
                    <td className="px-4 py-3 text-right text-primary font-semibold">{row.gems}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.model}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">{row.perGem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-border/20 bg-card/20">
            <p className="text-xs text-muted-foreground">All plans: 1 gem per successful blueprint generation. Failed generations cost 0 gems.</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

export default function Upgrade() {
  return <UpgradeInner />;
}