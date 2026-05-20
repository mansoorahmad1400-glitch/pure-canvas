import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  CreditCard, Crown, Gem, RefreshCw, ExternalLink, AlertTriangle,
  CheckCircle2, XCircle, Clock, Download, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';

const PLAN_LABELS = { starter: 'Starter', premium: 'Creator Pro', elite: 'Studio Elite', free: 'Free' };
const PLAN_COLORS = {
  starter: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  premium: 'bg-primary/15 text-primary border-primary/30',
  elite:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  free:    'bg-secondary text-muted-foreground border-border/50',
};

function StatusBadge({ status }) {
  const map = {
    active:     { label: 'Active',      cls: 'bg-green-500/15 text-green-400 border-green-500/30',  Icon: CheckCircle2 },
    cancelling: { label: 'Cancelling',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',  Icon: Clock },
    cancelled:  { label: 'Cancelled',   cls: 'bg-secondary text-muted-foreground border-border/50', Icon: XCircle },
    past_due:   { label: 'Past Due',    cls: 'bg-red-500/15 text-red-400 border-red-500/30',         Icon: AlertTriangle },
    trialing:   { label: 'Trial',       cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',     Icon: CheckCircle2 },
  };
  const s = map[status] || { label: status || 'Unknown', cls: 'bg-secondary text-muted-foreground border-border/50', Icon: XCircle };
  return (
    <Badge className={`flex items-center gap-1 border text-xs ${s.cls}`}>
      <s.Icon className="w-3 h-3" /> {s.label}
    </Badge>
  );
}

export default function BillingPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manageSubscription', { action: 'get_status' });
      setData(res.data);
    } catch (e) {
      toast.error('Failed to load billing info');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You keep full access until the billing period ends.')) return;
    setCancelling(true);
    try {
      const res = await base44.functions.invoke('manageSubscription', { action: 'cancel' });
      if (res.data?.success) {
        toast.success('Subscription cancelled. Access continues until your billing period ends.');
        load();
      } else {
        toast.error(res.data?.error || 'Failed to cancel');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to cancel');
    }
    setCancelling(false);
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const res = await base44.functions.invoke('manageSubscription', { action: 'reactivate' });
      if (res.data?.success) {
        toast.success('Subscription reactivated!');
        load();
      } else {
        toast.error(res.data?.error || 'Failed to reactivate');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to reactivate');
    }
    setReactivating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const u = data?.user || {};
  const sub = data?.stripe_subscription;
  const invoices = data?.invoices || [];
  const planKey = u.subscription_plan || 'free';
  const isPaid = ['starter', 'premium', 'elite'].includes(planKey);

  const renewalDate = u.subscription_reset_date
    ? new Date(u.subscription_reset_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const cancelAt = u.subscription_cancel_at
    ? new Date(u.subscription_cancel_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const gemPct = u.gems_limit_monthly > 0
    ? Math.min(100, Math.round(((u.gems_balance ?? 0) / u.gems_limit_monthly) * 100))
    : 0;

  return (
    <div className="space-y-4">

      {/* Billing issue warning */}
      {u.billing_issue && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/8 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Payment issue detected</p>
            <p className="text-xs mt-0.5 text-red-400/80">Your last payment failed. Please update your payment method to keep your subscription active.</p>
          </div>
        </div>
      )}

      {/* Cancelling notice */}
      {u.subscription_status === 'cancelling' && cancelAt && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/8 text-sm text-amber-400">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Subscription ends {cancelAt}</p>
            <p className="text-xs mt-0.5 text-amber-400/80">You have full access until your billing period ends.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleReactivate} disabled={reactivating} className="ml-auto shrink-0 h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            {reactivating ? '...' : 'Reactivate'}
          </Button>
        </div>
      )}

      {/* Current plan card */}
      <div className="p-5 rounded-2xl border border-border/50 bg-card/50 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Current Plan</p>
              <p className="font-bold text-foreground font-playfair">{PLAN_LABELS[planKey] || 'Free'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={u.subscription_status || 'cancelled'} />
            <Button variant="ghost" size="icon" onClick={load} className="h-7 w-7 text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Renewal / billing info */}
        {isPaid && sub && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
              <p className="text-muted-foreground mb-0.5">Monthly charge</p>
              <p className="font-semibold text-foreground">${sub.amount ? (sub.amount / 100).toFixed(2) : '—'} / {sub.interval || 'month'}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
              <p className="text-muted-foreground mb-0.5">
                {u.subscription_status === 'cancelling' ? 'Access until' : 'Next renewal'}
              </p>
              <p className="font-semibold text-foreground">{renewalDate || cancelAt || '—'}</p>
            </div>
          </div>
        )}

        {/* Gem meter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Gem className="w-3.5 h-3.5" /> Gem Balance</p>
            <p className="text-xs font-semibold text-foreground">{u.gems_balance ?? 0} / {u.gems_limit_monthly ?? 2} gems</p>
          </div>
          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${gemPct > 50 ? 'bg-primary' : gemPct > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${gemPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{u.gems_used_this_month ?? 0} gems used this month · {u.gems_balance ?? 0} remaining</p>
        </div>
      </div>

      {/* Upgrade / action buttons */}
      <div className="space-y-2">
        {!isPaid && (
          <Link to="/upgrade">
            <Button className="w-full h-11 bg-primary hover:bg-primary/90 font-semibold text-sm rounded-xl">
              <Crown className="w-4 h-4 mr-2" /> Upgrade Plan
            </Button>
          </Link>
        )}
        {isPaid && planKey !== 'elite' && (
          <Link to="/upgrade">
            <Button className="w-full h-11 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-semibold text-sm rounded-xl">
              <Zap className="w-4 h-4 mr-2" /> Upgrade to Studio Elite — $39.99/mo
            </Button>
          </Link>
        )}
        {isPaid && u.subscription_status === 'active' && (
          <Button
            variant="outline"
            className="w-full h-10 text-sm border-border/50 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        )}
      </div>

      {/* Billing history */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-secondary/20 transition-colors"
            onClick={() => setShowInvoices(v => !v)}
          >
            <span className="flex items-center gap-2 text-foreground">
              <Download className="w-4 h-4 text-primary" /> Billing History ({invoices.length})
            </span>
            {showInvoices ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showInvoices && (
            <div className="border-t border-border/40 divide-y divide-border/30">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-xs">
                  <div>
                    <p className="font-medium text-foreground">
                      ${(inv.amount_paid / 100).toFixed(2)} —{' '}
                      <span className={inv.paid ? 'text-green-400' : 'text-red-400'}>{inv.paid ? 'Paid' : 'Failed'}</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {new Date(inv.created * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  {inv.hosted_invoice_url && (
                    <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}