import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Gem, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const STATUS_COLORS = {
  success:    'bg-green-500/15 text-green-400 border-green-500/25',
  failed:     'bg-red-500/15 text-red-400 border-red-500/25',
  refunded:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
  pending:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  adjustment: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
};

const CATEGORY_LABELS = {
  text: 'Text', image: 'Image', video: 'Video',
  audio: 'Audio', export: 'Export', system: 'System', admin: 'Admin',
};

export default function GemHistory() {
  const { user, isLoading: userLoading, gems } = useCurrentUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('gemLedger', { action: 'my_history' });
      setTransactions(res.data?.transactions || []);
    } catch {
      setTransactions([]);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  if (userLoading) return null;
  if (!user) return <Navigate to="/" replace />;

  const totalSpent    = transactions.reduce((s, t) => s + (t.gems_deducted ?? 0), 0);
  const totalRefunded = transactions.reduce((s, t) => s + (t.gems_refunded ?? 0), 0);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-playfair mb-1">Gem History</h1>
          <p className="text-sm text-muted-foreground">Your complete gem transaction history</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5 text-xs h-8">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl border border-border/40 bg-card/50 text-center">
          <Gem className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-primary">{gems}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
        </div>
        <div className="p-3 rounded-xl border border-border/40 bg-card/50 text-center">
          <TrendingDown className="w-4 h-4 text-rose-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-rose-400">{totalSpent}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Spent</p>
        </div>
        <div className="p-3 rounded-xl border border-border/40 bg-card/50 text-center">
          <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-400">{totalRefunded}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Refunded</p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="px-4 py-2.5 bg-secondary/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
          <span>Action</span>
          <span>Gems</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading history...</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Gem className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No gem transactions yet.
          </div>
        ) : (
          transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={`flex items-start justify-between gap-3 px-4 py-3 ${
                i % 2 === 0 ? 'bg-card/20' : 'bg-card/5'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {tx.action_label || tx.action_key}
                  </span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[tx.status] || ''}`}>
                    {tx.status}
                  </Badge>
                </div>
                {tx.admin_note && (
                  <p className="text-[11px] text-purple-400/80">{tx.admin_note}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground/70">
                    {tx.created_date ? new Date(tx.created_date).toLocaleString() : '—'}
                  </span>
                  {tx.action_category && (
                    <span className="text-[10px] text-muted-foreground/50">
                      · {CATEGORY_LABELS[tx.action_category] || tx.action_category}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {(tx.gems_deducted ?? 0) > 0 && (
                  <p className="text-sm font-semibold text-rose-400">-{tx.gems_deducted} 💎</p>
                )}
                {(tx.gems_refunded ?? 0) > 0 && (
                  <p className="text-sm font-semibold text-green-400">+{tx.gems_refunded} 💎</p>
                )}
                {!(tx.gems_deducted) && !(tx.gems_refunded) && (
                  <p className="text-sm text-muted-foreground">0 💎</p>
                )}
                <p className="text-[10px] text-muted-foreground/60">{tx.balance_after ?? '—'} left</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}