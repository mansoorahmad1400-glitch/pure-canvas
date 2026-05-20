import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, RefreshCw, Download, Plus, Minus, Filter } from 'lucide-react';

const STATUS_COLORS = {
  success:    'bg-green-500/15 text-green-400 border-green-500/25',
  failed:     'bg-red-500/15 text-red-400 border-red-500/25',
  refunded:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
  pending:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  adjustment: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
};

const CATEGORY_COLORS = {
  text:   'bg-blue-500/10 text-blue-400',
  image:  'bg-purple-500/10 text-purple-400',
  video:  'bg-amber-500/10 text-amber-400',
  audio:  'bg-green-500/10 text-green-400',
  export: 'bg-rose-500/10 text-rose-400',
  system: 'bg-muted text-muted-foreground',
  admin:  'bg-primary/10 text-primary',
};

function exportCSV(rows) {
  const headers = ['Date', 'User Email', 'Plan', 'Action', 'Category', 'Deducted', 'Refunded', 'Before', 'After', 'Status', 'Error'];
  const lines = rows.map(r => [
    new Date(r.created_date).toISOString(),
    r.user_email,
    r.plan_name || '',
    r.action_label || r.action_key,
    r.action_category,
    r.gems_deducted ?? 0,
    r.gems_refunded ?? 0,
    r.balance_before ?? '',
    r.balance_after ?? '',
    r.status,
    r.error_message || r.admin_note || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `gem_ledger_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function GemLedgerAdmin() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Adjust modal state
  const [adjustEmail, setAdjustEmail] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('gemLedger', {
        action: 'admin_list',
        email_filter: emailFilter || undefined,
        status_filter: statusFilter || undefined,
        category_filter: categoryFilter || undefined,
      });
      setTransactions(res.data?.transactions || []);
    } catch (e) {
      toast.error('Failed to load ledger');
    }
    setLoading(false);
  }, [emailFilter, statusFilter, categoryFilter]);

  useEffect(() => { load(); }, []);

  const handleAdjust = async () => {
    if (!adjustEmail || adjustAmount === '' || !adjustReason) {
      toast.error('Fill all adjustment fields'); return;
    }
    setAdjusting(true);
    try {
      await base44.functions.invoke('gemLedger', {
        action: 'admin_adjust',
        target_email: adjustEmail,
        amount: Number(adjustAmount),
        reason: adjustReason,
      });
      toast.success(`Gems adjusted for ${adjustEmail}`);
      setAdjustEmail(''); setAdjustAmount(''); setAdjustReason('');
      setShowAdjust(false);
      load();
    } catch (e) {
      toast.error(e.message || 'Adjustment failed');
    }
    setAdjusting(false);
  };

  // Stats
  const totalDeducted = transactions.reduce((s, t) => s + (t.gems_deducted ?? 0), 0);
  const totalRefunded = transactions.reduce((s, t) => s + (t.gems_refunded ?? 0), 0);
  const failedCount   = transactions.filter(t => t.status === 'failed' || t.status === 'refunded').length;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Transactions', value: transactions.length, color: 'text-foreground' },
          { label: 'Gems Deducted', value: `${totalDeducted} 💎`, color: 'text-rose-400' },
          { label: 'Gems Refunded', value: `${totalRefunded} 💎`, color: 'text-green-400' },
          { label: 'Failed / Refunded', value: failedCount, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-border/40 bg-card/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by email..."
            value={emailFilter}
            onChange={e => setEmailFilter(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs px-2 rounded-md border border-border/40 bg-background text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="pending">Pending</option>
          <option value="adjustment">Adjustment</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-8 text-xs px-2 rounded-md border border-border/40 bg-background text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">All Categories</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="export">Export</option>
          <option value="system">System</option>
          <option value="admin">Admin</option>
        </select>
        <Button variant="outline" size="sm" onClick={load} className="h-8 gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportCSV(transactions)} className="h-8 gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
        <Button size="sm" onClick={() => setShowAdjust(v => !v)} className="h-8 gap-1.5 text-xs bg-primary/90 hover:bg-primary">
          <Plus className="w-3.5 h-3.5" /> Adjust Gems
        </Button>
      </div>

      {/* Admin Adjustment Panel */}
      {showAdjust && (
        <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
          <p className="text-sm font-semibold text-primary">Manual Gem Adjustment</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">User Email</label>
              <Input value={adjustEmail} onChange={e => setAdjustEmail(e.target.value)} placeholder="user@example.com" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Amount (+ add / − remove)</label>
              <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="+50 or -10" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Reason</label>
              <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="e.g. Compensation for bug" className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdjust} disabled={adjusting} className="h-7 text-xs">
              {adjusting ? 'Saving...' : 'Apply Adjustment'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdjust(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_100px_70px_70px_80px] gap-2 px-4 py-2 bg-secondary/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>User / Action</span>
          <span>Category</span>
          <span>Status</span>
          <span className="text-right">Deducted</span>
          <span className="text-right">Refunded</span>
          <span className="text-right">Balance</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading ledger...</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">No transactions found.</div>
        ) : (
          transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={`grid grid-cols-[1fr_90px_100px_70px_70px_80px] gap-2 px-4 py-2.5 items-start text-xs ${
                i % 2 === 0 ? 'bg-card/20' : 'bg-card/5'
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{tx.user_email}</p>
                <p className="text-muted-foreground truncate">{tx.action_label || tx.action_key}</p>
                {(tx.error_message || tx.admin_note) && (
                  <p className="text-amber-400/70 text-[10px] truncate">{tx.error_message || tx.admin_note}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {tx.created_date ? new Date(tx.created_date).toLocaleString() : '—'}
                  {tx.plan_name && ` · ${tx.plan_name}`}
                </p>
              </div>
              <div>
                <Badge className={`text-[10px] border-0 ${CATEGORY_COLORS[tx.action_category] || 'text-muted-foreground'}`}>
                  {tx.action_category}
                </Badge>
              </div>
              <div>
                <Badge className={`text-[10px] ${STATUS_COLORS[tx.status] || ''}`}>
                  {tx.status}
                </Badge>
              </div>
              <div className="text-right font-mono text-rose-400/90">
                {(tx.gems_deducted ?? 0) > 0 ? `-${tx.gems_deducted}💎` : '—'}
              </div>
              <div className="text-right font-mono text-green-400/90">
                {(tx.gems_refunded ?? 0) > 0 ? `+${tx.gems_refunded}💎` : '—'}
              </div>
              <div className="text-right font-mono text-muted-foreground">
                {tx.balance_after ?? '—'}💎
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-right">Showing {transactions.length} transactions</p>
    </div>
  );
}