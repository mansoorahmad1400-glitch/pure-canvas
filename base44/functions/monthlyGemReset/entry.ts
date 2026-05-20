import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const now = new Date();
    let resetCount = 0;

    for (const user of allUsers) {
      const isStarter = user.role === 'starter';
      const isPremium = user.role === 'premium';
      const isElite   = user.role === 'elite';

      if (!isStarter && !isPremium && !isElite) continue;
      if (!user.gems_reset_date) continue;

      const resetDate = new Date(user.gems_reset_date);
      if (now < resetDate) continue;

      const limit = isElite ? 1100 : isPremium ? 500 : 200;
      const nextReset = new Date(resetDate);
      nextReset.setMonth(nextReset.getMonth() + 1);

      const balance_before = user.gems_balance ?? 0;

      await base44.asServiceRole.entities.User.update(user.id, {
        gems_balance: limit,
        gems_used_this_month: 0,
        gems_reset_date: nextReset.toISOString(),
      });

      // Log to gem ledger
      await base44.asServiceRole.entities.GemTransaction.create({
        user_email: user.email,
        user_id: user.id,
        plan_name: user.role,
        action_key: 'monthly_reset',
        action_label: 'Monthly Gem Reset',
        action_category: 'system',
        gems_deducted: 0,
        gems_refunded: limit,
        balance_before,
        balance_after: limit,
        status: 'adjustment',
        admin_note: `Monthly reset on ${now.toISOString()} — next reset: ${nextReset.toISOString()}`,
      });

      console.log(`[monthlyGemReset] Reset ${user.email} (${user.role}) → ${limit} gems`);
      resetCount++;
    }

    console.log(`[monthlyGemReset] Done. Reset ${resetCount} users.`);
    return Response.json({ success: true, reset_count: resetCount });
  } catch (error) {
    console.error('[monthlyGemReset] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});