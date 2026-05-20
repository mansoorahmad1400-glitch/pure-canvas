import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Get current user record
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const userRecord = allUsers.find(u => u.email === user.email);
    if (!userRecord) return Response.json({ error: 'User not found' }, { status: 404 });

    // ── GET STATUS ─────────────────────────────────────────────────────────────
    if (action === 'get_status') {
      let stripeSubscription = null;
      let invoices = [];

      if (userRecord.stripe_customer_id) {
        try {
          const [subs, inv] = await Promise.all([
            stripe.subscriptions.list({ customer: userRecord.stripe_customer_id, limit: 1, status: 'all' }),
            stripe.invoices.list({ customer: userRecord.stripe_customer_id, limit: 10 }),
          ]);
          if (subs.data.length > 0) {
            const s = subs.data[0];
            stripeSubscription = {
              id: s.id,
              status: s.status,
              cancel_at_period_end: s.cancel_at_period_end,
              current_period_end: s.current_period_end,
              current_period_start: s.current_period_start,
              plan: s.items?.data?.[0]?.price?.nickname || null,
              price_id: s.items?.data?.[0]?.price?.id || null,
              amount: s.items?.data?.[0]?.price?.unit_amount || null,
              interval: s.items?.data?.[0]?.price?.recurring?.interval || null,
            };
          }
          invoices = inv.data.map(inv => ({
            id: inv.id,
            amount_paid: inv.amount_paid,
            amount_due: inv.amount_due,
            status: inv.status,
            paid: inv.paid,
            created: inv.created,
            period_start: inv.period_start,
            period_end: inv.period_end,
            invoice_pdf: inv.invoice_pdf,
            hosted_invoice_url: inv.hosted_invoice_url,
          }));
        } catch (e) {
          console.warn('[manageSubscription] Stripe lookup failed:', e.message);
        }
      }

      return Response.json({
        user: {
          email: userRecord.email,
          role: userRecord.role,
          subscription_plan: userRecord.subscription_plan,
          subscription_status: userRecord.subscription_status,
          subscription_reset_date: userRecord.subscription_reset_date,
          subscription_cancel_at: userRecord.subscription_cancel_at,
          gems_balance: userRecord.gems_balance,
          gems_limit_monthly: userRecord.gems_limit_monthly,
          gems_used_this_month: userRecord.gems_used_this_month,
          billing_issue: userRecord.billing_issue,
          billing_issue_since: userRecord.billing_issue_since,
          stripe_customer_id: userRecord.stripe_customer_id,
        },
        stripe_subscription: stripeSubscription,
        invoices,
      });
    }

    // ── CANCEL SUBSCRIPTION ─────────────────────────────────────────────────────
    if (action === 'cancel') {
      if (!userRecord.stripe_customer_id) {
        return Response.json({ error: 'No active subscription found' }, { status: 400 });
      }

      const subs = await stripe.subscriptions.list({
        customer: userRecord.stripe_customer_id,
        status: 'active',
        limit: 1,
      });

      if (subs.data.length === 0) {
        return Response.json({ error: 'No active subscription to cancel' }, { status: 400 });
      }

      // Cancel at period end (preserve access until billing cycle ends)
      const cancelled = await stripe.subscriptions.update(subs.data[0].id, {
        cancel_at_period_end: true,
      });

      const cancelAt = cancelled.current_period_end
        ? new Date(cancelled.current_period_end * 1000).toISOString()
        : null;

      await base44.asServiceRole.entities.User.update(userRecord.id, {
        subscription_status: 'cancelling',
        subscription_cancel_at: cancelAt,
      });

      console.log(`[manageSubscription] cancel scheduled for ${user.email} at ${cancelAt}`);
      return Response.json({ success: true, cancel_at: cancelAt });
    }

    // ── REACTIVATE SUBSCRIPTION ─────────────────────────────────────────────────
    if (action === 'reactivate') {
      if (!userRecord.stripe_customer_id) {
        return Response.json({ error: 'No subscription found' }, { status: 400 });
      }

      const subs = await stripe.subscriptions.list({
        customer: userRecord.stripe_customer_id,
        limit: 1,
      });

      if (subs.data.length === 0) {
        return Response.json({ error: 'No subscription found to reactivate' }, { status: 400 });
      }

      await stripe.subscriptions.update(subs.data[0].id, {
        cancel_at_period_end: false,
      });

      await base44.asServiceRole.entities.User.update(userRecord.id, {
        subscription_status: 'active',
        subscription_cancel_at: null,
      });

      console.log(`[manageSubscription] reactivated for ${user.email}`);
      return Response.json({ success: true });
    }

    // ── ADMIN ACTIONS ──────────────────────────────────────────────────────────
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Admin: list all subscriptions
    if (action === 'admin_list') {
      const allU = await base44.asServiceRole.entities.User.list('-created_date', 1000);
      const subscribers = allU.filter(u => ['starter', 'premium', 'elite'].includes(u.role));
      const failed = allU.filter(u => u.billing_issue === true);
      const cancelling = allU.filter(u => u.subscription_status === 'cancelling');

      return Response.json({ subscribers, failed, cancelling, total_users: allU.length });
    }

    // Admin: manually grant plan
    if (action === 'admin_grant_plan') {
      const { target_email, plan } = body;
      if (!target_email || !plan) return Response.json({ error: 'target_email and plan required' }, { status: 400 });

      const target = allUsers.find(u => u.email === target_email);
      if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

      const GEM_ALLOC = { free: 2, starter: 200, premium: 500, elite: 1100 };
      const ROLE_MAP  = { free: 'user', starter: 'starter', premium: 'premium', elite: 'elite' };
      const gems = GEM_ALLOC[plan] ?? 2;
      const role = ROLE_MAP[plan] ?? 'user';
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);

      await base44.asServiceRole.entities.User.update(target.id, {
        role,
        gems_balance: gems,
        gems_limit_monthly: gems,
        gems_used_this_month: 0,
        subscription_plan: plan === 'free' ? null : plan,
        subscription_status: plan === 'free' ? 'cancelled' : 'active',
        subscription_reset_date: plan === 'free' ? null : resetDate.toISOString(),
        gems_reset_date: plan === 'free' ? null : resetDate.toISOString(),
        billing_issue: false,
      });

      // Log the grant
      await base44.asServiceRole.entities.GemTransaction.create({
        user_email: target_email,
        user_id: target.id,
        plan_name: plan,
        action_key: 'admin_grant_plan',
        action_label: `Admin granted plan: ${plan}`,
        action_category: 'admin',
        gems_deducted: 0,
        gems_refunded: gems,
        balance_before: target.gems_balance ?? 0,
        balance_after: gems,
        status: 'adjustment',
        admin_note: `Granted by ${user.email}`,
      });

      console.log(`[manageSubscription] admin granted ${plan} to ${target_email} by ${user.email}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[manageSubscription] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});