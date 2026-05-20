import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { date_from, date_to } = body;

    // Fetch all data in parallel
    const [allUsers, allTransactions, allProjects] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 1000),
      base44.asServiceRole.entities.GemTransaction.list('-created_date', 2000),
      base44.asServiceRole.entities.Project.list('-created_date', 2000),
    ]);

    // ─── Date filtering ─────────────────────────────────────────────────────────
    const now = new Date();
    const fromDate = date_from ? new Date(date_from) : null;
    const toDate   = date_to   ? new Date(date_to)   : null;

    const inRange = (dateStr) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > toDate)   return false;
      return true;
    };

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ─── User Overview ──────────────────────────────────────────────────────────
    const roleMap = { free: 0, starter: 0, premium: 0, elite: 0, admin: 0 };
    for (const u of allUsers) {
      const r = (u.role || 'free').toLowerCase();
      if (r === 'user' || r === 'free') roleMap.free++;
      else if (r === 'starter') roleMap.starter++;
      else if (r === 'premium') roleMap.premium++;
      else if (r === 'elite')   roleMap.elite++;
      else if (r === 'admin')   roleMap.admin++;
      else roleMap.free++;
    }

    // Active users = users who had at least one transaction today/this month
    const activeToday = new Set();
    const activeThisMonth = new Set();
    for (const tx of allTransactions) {
      if (!tx.created_date) continue;
      const d = new Date(tx.created_date);
      if (d >= monthStart) activeThisMonth.add(tx.user_email);
      if (d >= todayStart)  activeToday.add(tx.user_email);
    }

    // ─── Gem Economy ────────────────────────────────────────────────────────────
    const filteredTxs = allTransactions.filter(t => inRange(t.created_date));

    let totalGemsIssued = 0;
    let totalGemsSpent  = 0;
    let totalGemsRefunded = 0;
    const actionCounts = {};
    const actionGems   = {};

    for (const tx of filteredTxs) {
      const deducted = tx.gems_deducted ?? 0;
      const refunded = tx.gems_refunded ?? 0;
      totalGemsSpent    += deducted;
      totalGemsRefunded += refunded;

      // issued = refunded amounts + adjustments with gems_refunded
      if (tx.action_category === 'system' || tx.status === 'adjustment') {
        totalGemsIssued += refunded;
      }

      const key = tx.action_key || 'unknown';
      actionCounts[key] = (actionCounts[key] || 0) + 1;
      actionGems[key]   = (actionGems[key]   || 0) + deducted;
    }

    // Total remaining gems across all users
    const totalGemsRemaining = allUsers.reduce((s, u) => s + (u.gems_balance ?? 0), 0);

    // Monthly gem allotments count as "issued"
    for (const u of allUsers) {
      const limit = u.gems_limit_monthly ?? 0;
      totalGemsIssued += limit;
    }

    const mostUsedActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, count]) => ({ key, count, gems: actionGems[key] || 0 }));

    const highestCostActions = Object.entries(actionGems)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, gems]) => ({ key, gems, count: actionCounts[key] || 0 }));

    // ─── Revenue Overview ────────────────────────────────────────────────────────
    // Based on plan pricing from economy config
    const PLAN_PRICES = { starter: 9.99, premium: 19.99, elite: 39.99 };
    const paidUsers = allUsers.filter(u => ['starter', 'premium', 'elite'].includes((u.role || '').toLowerCase()));
    const cancelledUsers = allUsers.filter(u => u.subscription_cancelled === true);

    let mrr = 0;
    const revenueByPlan = { starter: 0, premium: 0, elite: 0 };
    for (const u of paidUsers) {
      const role = (u.role || '').toLowerCase();
      const price = PLAN_PRICES[role] || 0;
      mrr += price;
      if (revenueByPlan[role] !== undefined) revenueByPlan[role] += price;
    }

    const totalUsersNonAdmin = allUsers.filter(u => u.role !== 'admin').length;
    const conversionRate = totalUsersNonAdmin > 0 ? ((paidUsers.length / totalUsersNonAdmin) * 100).toFixed(1) : 0;

    // ─── Project stats ───────────────────────────────────────────────────────────
    const filteredProjects = allProjects.filter(p => inRange(p.created_date));
    const failedProjects   = filteredProjects.filter(p => p.status === 'error').length;
    const completedProjects = filteredProjects.filter(p => p.status === 'completed').length;

    // ─── API Cost Estimation ─────────────────────────────────────────────────────
    // Estimated $$$ cost per generation action (conservative estimates)
    // These are overridable from admin — returned so frontend can override
    const API_COST_DEFAULTS = {
      text_per_call:   0.01,   // $0.01 per text generation (GPT-4o-mini)
      text_pro_per_call: 0.05, // $0.05 per text generation (GPT-4o)
      image_per_call:  0.04,   // $0.04 per image
      video_per_call:  0.15,   // $0.15 per video second (rough)
      audio_per_call:  0.02,   // $0.02 per audio gen
      export_per_call: 0.001,  // $0.001 bandwidth
    };

    // Count action types in filtered range
    const actionTypeCounts = { text: 0, image: 0, video: 0, audio: 0, export: 0 };
    for (const tx of filteredTxs) {
      const cat = tx.action_category;
      if (cat && actionTypeCounts[cat] !== undefined) actionTypeCounts[cat]++;
    }

    // Estimate API spend
    const estimatedApiSpend =
      actionTypeCounts.text   * API_COST_DEFAULTS.text_per_call +
      actionTypeCounts.image  * API_COST_DEFAULTS.image_per_call +
      actionTypeCounts.video  * API_COST_DEFAULTS.video_per_call +
      actionTypeCounts.audio  * API_COST_DEFAULTS.audio_per_call +
      actionTypeCounts.export * API_COST_DEFAULTS.export_per_call;

    // Infra cost estimate ($5 base + $0.50/100 users)
    const estimatedInfraCost = 5 + (allUsers.length / 100) * 0.5;

    // Monthly period for profit calc
    const estimatedGrossRevenue = mrr;
    const estimatedProfit = estimatedGrossRevenue - estimatedApiSpend - estimatedInfraCost;
    const marginPct = estimatedGrossRevenue > 0
      ? ((estimatedProfit / estimatedGrossRevenue) * 100).toFixed(1)
      : 0;

    // ─── Per-action cost/revenue table ───────────────────────────────────────────
    const actionBreakdown = filteredTxs
      .filter(t => t.gems_deducted > 0)
      .reduce((acc, tx) => {
        const key = tx.action_key || 'unknown';
        if (!acc[key]) acc[key] = { key, count: 0, gems: 0, category: tx.action_category };
        acc[key].count++;
        acc[key].gems += tx.gems_deducted ?? 0;
        return acc;
      }, {});

    // Gem value in $ = plan price / monthly gems
    // avg $0.02 per gem as blended estimate
    const GEM_VALUE_USD = 0.02;
    const actionBreakdownArr = Object.values(actionBreakdown).map(a => ({
      ...a,
      revenue_value:   +(a.gems * GEM_VALUE_USD).toFixed(3),
      api_cost_est:    +(a.count * (API_COST_DEFAULTS[`${a.category}_per_call`] || 0.01)).toFixed(3),
      margin:          +(((a.gems * GEM_VALUE_USD) - (a.count * (API_COST_DEFAULTS[`${a.category}_per_call`] || 0.01))) / Math.max(a.gems * GEM_VALUE_USD, 0.001) * 100).toFixed(1),
    })).sort((a, b) => b.gems - a.gems);

    // ─── Plan Health ─────────────────────────────────────────────────────────────
    const planStats = {};
    for (const u of allUsers) {
      const role = (['starter','premium','elite'].includes(u.role)) ? u.role : (u.role === 'admin' ? 'admin' : 'free');
      if (!planStats[role]) planStats[role] = { users: 0, gems_used: 0, revenue: 0 };
      planStats[role].users++;
      planStats[role].gems_used += u.gems_used_this_month ?? 0;
      planStats[role].revenue   += PLAN_PRICES[role] ?? 0;
    }

    const planHealth = Object.entries(planStats).map(([plan, s]) => {
      const avgGemsUsed   = s.users > 0 ? +(s.gems_used / s.users).toFixed(1) : 0;
      const avgCostPerUser = +(avgGemsUsed * GEM_VALUE_USD * 0.5).toFixed(3); // 50% of gem value as cost
      const avgRevPerUser  = s.users > 0 ? +(s.revenue / s.users).toFixed(2) : 0;
      const profitable     = avgRevPerUser >= avgCostPerUser;
      return { plan, users: s.users, avgGemsUsed, avgCostPerUser, avgRevPerUser, profitable };
    });

    // ─── Alerts ──────────────────────────────────────────────────────────────────
    const alerts = [];
    const refundRate = filteredTxs.length > 0
      ? filteredTxs.filter(t => t.status === 'refunded' || t.status === 'failed').length / filteredTxs.length
      : 0;

    if (refundRate > 0.1)  alerts.push({ level: 'error', msg: 'Refund rate high — over 10% of transactions failed or refunded.' });
    if (failedProjects > 5) alerts.push({ level: 'warn',  msg: `Many failed generations — ${failedProjects} blueprint errors in selected range.` });
    if (marginPct < 20)    alerts.push({ level: 'warn',  msg: `Low margin — estimated at ${marginPct}%. Review API cost assumptions.` });
    if (actionTypeCounts.video > 0 && estimatedApiSpend > mrr * 0.5) {
      alerts.push({ level: 'error', msg: 'Video costs may exceed plan value — API spend over 50% of MRR.' });
    }
    if (estimatedProfit < 0) alerts.push({ level: 'error', msg: `Estimated loss of $${Math.abs(estimatedProfit).toFixed(2)} this period. Increase pricing or reduce API usage.` });

    const lowMarginActions = actionBreakdownArr.filter(a => a.margin < 30 && a.count > 2);
    if (lowMarginActions.length > 0) {
      alerts.push({ level: 'warn', msg: `Low margin actions: ${lowMarginActions.map(a => a.key).join(', ')}` });
    }

    console.log(`[adminAnalytics] users=${allUsers.length} txs=${filteredTxs.length} mrr=$${mrr.toFixed(2)} profit=$${estimatedProfit.toFixed(2)}`);

    return Response.json({
      user_overview: {
        total: allUsers.length,
        free: roleMap.free,
        starter: roleMap.starter,
        premium: roleMap.premium,
        elite: roleMap.elite,
        admin: roleMap.admin,
        active_today: activeToday.size,
        active_this_month: activeThisMonth.size,
      },
      gem_economy: {
        total_issued: totalGemsIssued,
        total_spent: totalGemsSpent,
        total_refunded: totalGemsRefunded,
        total_remaining: totalGemsRemaining,
        most_used_actions: mostUsedActions,
        highest_cost_actions: highestCostActions,
        action_type_counts: actionTypeCounts,
      },
      revenue: {
        mrr: +mrr.toFixed(2),
        revenue_by_plan: revenueByPlan,
        paid_subscribers: paidUsers.length,
        cancelled_count: cancelledUsers.length,
        conversion_rate: +conversionRate,
      },
      api_cost: {
        action_type_counts: actionTypeCounts,
        estimated_api_spend: +estimatedApiSpend.toFixed(2),
        estimated_infra_cost: +estimatedInfraCost.toFixed(2),
        defaults: API_COST_DEFAULTS,
      },
      profit_signals: {
        gross_revenue: +estimatedGrossRevenue.toFixed(2),
        api_spend: +estimatedApiSpend.toFixed(2),
        infra_cost: +estimatedInfraCost.toFixed(2),
        net_profit: +estimatedProfit.toFixed(2),
        margin_pct: +marginPct,
      },
      plan_health: planHealth,
      action_breakdown: actionBreakdownArr,
      project_stats: {
        total: filteredProjects.length,
        completed: completedProjects,
        failed: failedProjects,
      },
      alerts,
      gem_value_usd: GEM_VALUE_USD,
    });

  } catch (error) {
    console.error('[adminAnalytics] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});