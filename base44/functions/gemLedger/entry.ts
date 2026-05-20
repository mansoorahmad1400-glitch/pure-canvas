import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── RECORD: deduct gems and log a transaction ──────────────────────────────
    if (action === 'record') {
      const { action_key, action_label, action_category, gems_cost, project_id } = body;

      const targetUser = await base44.asServiceRole.entities.User.filter({ email: user.email });
      const u = targetUser?.[0];
      if (!u) return Response.json({ error: 'User not found' }, { status: 404 });

      const balance_before = u.gems_balance ?? 0;

      // Admin never pays gems
      const isAdmin = user.role === 'admin';
      const cost = isAdmin ? 0 : (gems_cost ?? 0);

      if (!isAdmin && balance_before < cost) {
        return Response.json({ error: 'Insufficient gems', balance: balance_before }, { status: 402 });
      }

      const balance_after = balance_before - cost;

      // Update user balance
      if (cost > 0) {
        await base44.asServiceRole.entities.User.update(u.id, {
          gems_balance: balance_after,
          gems_used_this_month: (u.gems_used_this_month ?? 0) + cost,
        });
      }

      // Log transaction
      const tx = await base44.asServiceRole.entities.GemTransaction.create({
        user_email: user.email,
        user_id: u.id,
        plan_name: user.role || 'free',
        action_key,
        action_label,
        action_category,
        gems_deducted: cost,
        gems_refunded: 0,
        balance_before,
        balance_after,
        status: 'success',
        project_id: project_id || null,
      });

      console.log(`[gemLedger] record: ${user.email} -${cost}💎 for ${action_key} (${balance_before}→${balance_after})`);
      return Response.json({ success: true, transaction_id: tx.id, balance_after, gems_deducted: cost });
    }

    // ── REFUND: restore gems for a failed action ───────────────────────────────
    if (action === 'refund') {
      const { transaction_id, error_message } = body;

      const tx = await base44.asServiceRole.entities.GemTransaction.get('GemTransaction', transaction_id).catch(() => null);
      if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

      // Only refund if it belongs to this user (or admin)
      if (tx.user_email !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const refundAmount = tx.gems_deducted ?? 0;
      if (refundAmount > 0) {
        const targetUser = await base44.asServiceRole.entities.User.filter({ email: tx.user_email });
        const u = targetUser?.[0];
        if (u) {
          const newBalance = (u.gems_balance ?? 0) + refundAmount;
          await base44.asServiceRole.entities.User.update(u.id, {
            gems_balance: newBalance,
            gems_used_this_month: Math.max(0, (u.gems_used_this_month ?? 0) - refundAmount),
          });
        }
      }

      await base44.asServiceRole.entities.GemTransaction.update(transaction_id, {
        gems_refunded: refundAmount,
        status: 'refunded',
        error_message: error_message || 'Action failed',
      });

      console.log(`[gemLedger] refund: ${tx.user_email} +${refundAmount}💎 for tx ${transaction_id}`);
      return Response.json({ success: true, gems_refunded: refundAmount });
    }

    // ── MY_HISTORY: user's own gem history ────────────────────────────────────
    if (action === 'my_history') {
      const txs = await base44.entities.GemTransaction.filter(
        { user_email: user.email },
        '-created_date',
        100
      );
      return Response.json({ transactions: txs });
    }

    // ── ADMIN ONLY below ──────────────────────────────────────────────────────
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── ADMIN_LIST: paginated/filtered ledger ─────────────────────────────────
    if (action === 'admin_list') {
      const { email_filter, status_filter, category_filter, limit = 200 } = body;
      let filter = {};
      if (email_filter) filter.user_email = email_filter;
      if (status_filter) filter.status = status_filter;
      if (category_filter) filter.action_category = category_filter;

      const txs = await base44.asServiceRole.entities.GemTransaction.filter(filter, '-created_date', limit);
      return Response.json({ transactions: txs });
    }

    // ── ADMIN_ADJUST: manually add or remove gems ─────────────────────────────
    if (action === 'admin_adjust') {
      const { target_email, amount, reason } = body;
      if (!target_email || amount === undefined || !reason) {
        return Response.json({ error: 'target_email, amount, and reason are required' }, { status: 400 });
      }

      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: target_email });
      const u = targetUsers?.[0];
      if (!u) return Response.json({ error: 'User not found' }, { status: 404 });

      const balance_before = u.gems_balance ?? 0;
      const balance_after = Math.max(0, balance_before + amount);

      await base44.asServiceRole.entities.User.update(u.id, { gems_balance: balance_after });

      await base44.asServiceRole.entities.GemTransaction.create({
        user_email: target_email,
        user_id: u.id,
        plan_name: u.role || 'free',
        action_key: 'admin_adjustment',
        action_label: `Admin Adjustment: ${reason}`,
        action_category: 'admin',
        gems_deducted: amount < 0 ? Math.abs(amount) : 0,
        gems_refunded: amount > 0 ? amount : 0,
        balance_before,
        balance_after,
        status: 'adjustment',
        admin_note: `By ${user.email}: ${reason}`,
      });

      console.log(`[gemLedger] admin_adjust: ${target_email} ${amount > 0 ? '+' : ''}${amount}💎 by ${user.email} (${reason})`);
      return Response.json({ success: true, balance_after });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[gemLedger] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});