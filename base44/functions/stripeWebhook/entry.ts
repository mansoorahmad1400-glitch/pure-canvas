import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Default gem allocations — overridden by EconomyConfig if available
const DEFAULT_GEM_ALLOC = {
  free:    { monthly_gems: 2,    gems_limit_monthly: 2    },
  starter: { monthly_gems: 200,  gems_limit_monthly: 200  },
  premium: { monthly_gems: 500,  gems_limit_monthly: 500  },
  elite:   { monthly_gems: 1100, gems_limit_monthly: 1100 },
};

// Role for DB
const PLAN_TO_ROLE = { starter: 'starter', premium: 'premium', elite: 'elite' };

// Derive plan key from Stripe price ID
const PRICE_TO_PLAN = {
  'price_1TWNsLPqHNcdlhYOMqBSlGyB': 'starter',
  'price_1TWNsLPqHNcdlhYO4ScjKBIJ': 'premium',
  'price_1TWNsLPqHNcdlhYOUhYwDo4X': 'elite',
};

async function getEconomyConfig(base44) {
  try {
    const records = await base44.asServiceRole.entities.EconomyConfig.filter({ config_key: 'main' });
    if (records && records.length > 0) return records[0];
  } catch (e) {
    console.warn('[stripeWebhook] Could not load EconomyConfig, using defaults:', e.message);
  }
  return null;
}

function getGemAlloc(config, planKey) {
  const planCfg = config?.plans?.[planKey];
  const monthly_gems = planCfg?.monthly_gems ?? DEFAULT_GEM_ALLOC[planKey]?.monthly_gems ?? 2;
  return {
    monthly_gems,
    gems_limit_monthly: monthly_gems,
  };
}

async function findUserByEmail(base44, email) {
  const all = await base44.asServiceRole.entities.User.list('-created_date', 500);
  return all.find(u => u.email === email) || null;
}

async function findUserByCustomerId(base44, customerId) {
  const all = await base44.asServiceRole.entities.User.list('-created_date', 500);
  return all.find(u => u.stripe_customer_id === customerId) || null;
}

async function logGemTransaction(base44, { userRecord, planKey, gems, action_key, action_label, status, admin_note }) {
  try {
    const balance_before = userRecord.gems_balance ?? 0;
    const balance_after = gems;
    await base44.asServiceRole.entities.GemTransaction.create({
      user_email: userRecord.email,
      user_id: userRecord.id,
      plan_name: planKey,
      action_key,
      action_label,
      action_category: 'system',
      gems_deducted: 0,
      gems_refunded: gems > 0 ? gems : 0,
      balance_before,
      balance_after,
      status,
      admin_note,
    });
  } catch (e) {
    console.warn('[stripeWebhook] ledger log failed:', e.message);
  }
}

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripeWebhook] signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);
  console.log('[stripeWebhook] event:', event.type);

  try {
    // ── CHECKOUT COMPLETED (new subscription) ─────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode !== 'subscription') return Response.json({ received: true });

      const email = session.metadata?.user_email || session.customer_email;
      const planKey = session.metadata?.plan;
      if (!email || !planKey) {
        console.warn('[stripeWebhook] missing email/plan in checkout metadata');
        return Response.json({ received: true });
      }

      const config = await getEconomyConfig(base44);
      const { monthly_gems, gems_limit_monthly } = getGemAlloc(config, planKey);
      const role = PLAN_TO_ROLE[planKey] || 'premium';
      const userRecord = await findUserByEmail(base44, email);

      if (!userRecord) {
        console.warn('[stripeWebhook] user not found for email:', email);
        return Response.json({ received: true });
      }

      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);

      await base44.asServiceRole.entities.User.update(userRecord.id, {
        role,
        gems_balance: monthly_gems,
        gems_limit_monthly,
        gems_used_this_month: 0,
        subscription_plan: planKey,
        subscription_status: 'active',
        subscription_reset_date: resetDate.toISOString(),
        gems_reset_date: resetDate.toISOString(),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        billing_issue: false,
        billing_issue_since: null,
      });

      await logGemTransaction(base44, {
        userRecord: { ...userRecord, gems_balance: userRecord.gems_balance ?? 0 },
        planKey,
        gems: monthly_gems,
        action_key: 'subscription_new',
        action_label: `New subscription: ${planKey} — ${monthly_gems} gems delivered`,
        status: 'adjustment',
        admin_note: `Checkout session ${session.id}`,
      });

      console.log(`[stripeWebhook] ✅ checkout.completed: ${email} → ${role} (${monthly_gems} gems)`);
    }

    // ── INVOICE PAID (renewal / initial payment) ───────────────────────────────
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_create') {
        // Already handled by checkout.session.completed
        return Response.json({ received: true });
      }

      const customerId = invoice.customer;
      const subscriptionId = invoice.subscription;

      // Get current plan from Stripe subscription
      let planKey = null;
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items?.data?.[0]?.price?.id;
        planKey = PRICE_TO_PLAN[priceId] || sub.metadata?.plan || null;
      } catch (e) {
        console.warn('[stripeWebhook] could not retrieve subscription:', e.message);
      }

      if (!planKey) {
        console.warn('[stripeWebhook] could not determine plan for invoice.paid');
        return Response.json({ received: true });
      }

      const userRecord = await findUserByCustomerId(base44, customerId);
      if (!userRecord) {
        console.warn('[stripeWebhook] no user for customer:', customerId);
        return Response.json({ received: true });
      }

      const config = await getEconomyConfig(base44);
      const { monthly_gems, gems_limit_monthly } = getGemAlloc(config, planKey);
      const role = PLAN_TO_ROLE[planKey] || 'premium';

      // Check rollover setting
      const allowRollover = config?.gem_economy?.allow_gem_rollover ?? false;
      const currentBalance = userRecord.gems_balance ?? 0;
      const newBalance = allowRollover
        ? currentBalance + monthly_gems  // rollover: add on top
        : monthly_gems;                   // no rollover: reset to full allocation

      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);

      await base44.asServiceRole.entities.User.update(userRecord.id, {
        role,
        gems_balance: newBalance,
        gems_limit_monthly,
        gems_used_this_month: 0,
        subscription_plan: planKey,
        subscription_status: 'active',
        subscription_reset_date: resetDate.toISOString(),
        gems_reset_date: resetDate.toISOString(),
        billing_issue: false,
        billing_issue_since: null,
      });

      await logGemTransaction(base44, {
        userRecord,
        planKey,
        gems: newBalance,
        action_key: 'subscription_renewal',
        action_label: `Renewal: ${planKey} — ${monthly_gems} gems ${allowRollover ? 'added (rollover)' : 'reset'}`,
        status: 'adjustment',
        admin_note: `Invoice ${invoice.id}`,
      });

      console.log(`[stripeWebhook] ✅ invoice.paid renewal: ${userRecord.email} → ${newBalance} gems`);
    }

    // ── INVOICE PAYMENT FAILED ──────────────────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const userRecord = await findUserByCustomerId(base44, customerId);

      if (userRecord) {
        const alreadyFlagged = userRecord.billing_issue === true;
        await base44.asServiceRole.entities.User.update(userRecord.id, {
          billing_issue: true,
          billing_issue_since: alreadyFlagged
            ? userRecord.billing_issue_since
            : new Date().toISOString(),
          subscription_status: 'past_due',
        });

        await logGemTransaction(base44, {
          userRecord,
          planKey: userRecord.subscription_plan || 'unknown',
          gems: 0,
          action_key: 'payment_failed',
          action_label: 'Payment failed — billing issue flagged',
          status: 'failed',
          admin_note: `Invoice ${invoice.id} failed`,
        });

        console.warn(`[stripeWebhook] ⚠️ invoice.payment_failed for ${userRecord.email}`);
      }
    }

    // ── SUBSCRIPTION UPDATED (upgrades/downgrades/cancellation scheduled) ───────
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const customerId = sub.customer;
      const userRecord = await findUserByCustomerId(base44, customerId);
      if (!userRecord) return Response.json({ received: true });

      const priceId = sub.items?.data?.[0]?.price?.id;
      const planKey = PRICE_TO_PLAN[priceId] || sub.metadata?.plan || null;

      // Subscription is being cancelled at period end
      if (sub.cancel_at_period_end) {
        const cancelAt = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await base44.asServiceRole.entities.User.update(userRecord.id, {
          subscription_status: 'cancelling',
          subscription_cancel_at: cancelAt,
        });

        console.log(`[stripeWebhook] ⏳ subscription cancellation scheduled for ${userRecord.email} at ${cancelAt}`);
        return Response.json({ received: true });
      }

      // Reactivated (cancel reversed)
      if (!sub.cancel_at_period_end && userRecord.subscription_status === 'cancelling') {
        await base44.asServiceRole.entities.User.update(userRecord.id, {
          subscription_status: 'active',
          subscription_cancel_at: null,
        });
        console.log(`[stripeWebhook] ✅ subscription reactivated for ${userRecord.email}`);
        return Response.json({ received: true });
      }

      // Active plan change (upgrade/downgrade)
      if (sub.status === 'active' && planKey) {
        const config = await getEconomyConfig(base44);
        const { monthly_gems, gems_limit_monthly } = getGemAlloc(config, planKey);
        const role = PLAN_TO_ROLE[planKey] || 'premium';
        const prevPlan = userRecord.subscription_plan;
        const isUpgrade = ['starter','premium','elite'].indexOf(planKey) > ['starter','premium','elite'].indexOf(prevPlan || 'free');
        const resetDate = new Date();
        resetDate.setMonth(resetDate.getMonth() + 1);

        await base44.asServiceRole.entities.User.update(userRecord.id, {
          role,
          gems_balance: monthly_gems,
          gems_limit_monthly,
          gems_used_this_month: 0,
          subscription_plan: planKey,
          subscription_status: 'active',
          subscription_reset_date: resetDate.toISOString(),
          gems_reset_date: resetDate.toISOString(),
          billing_issue: false,
          billing_issue_since: null,
        });

        await logGemTransaction(base44, {
          userRecord,
          planKey,
          gems: monthly_gems,
          action_key: isUpgrade ? 'plan_upgrade' : 'plan_downgrade',
          action_label: `Plan ${isUpgrade ? 'upgrade' : 'downgrade'}: ${prevPlan} → ${planKey} (${monthly_gems} gems)`,
          status: 'adjustment',
          admin_note: `Subscription update ${sub.id}`,
        });

        console.log(`[stripeWebhook] ✅ plan change: ${userRecord.email} → ${planKey}`);
      }
    }

    // ── SUBSCRIPTION DELETED (fully cancelled/expired) ─────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;
      const userRecord = await findUserByCustomerId(base44, customerId);

      if (userRecord) {
        await base44.asServiceRole.entities.User.update(userRecord.id, {
          role: 'user',
          gems_balance: 2,
          gems_limit_monthly: 2,
          gems_used_this_month: 0,
          subscription_plan: null,
          subscription_status: 'cancelled',
          subscription_reset_date: null,
          gems_reset_date: null,
          subscription_cancel_at: null,
          billing_issue: false,
          billing_issue_since: null,
        });

        await logGemTransaction(base44, {
          userRecord,
          planKey: 'free',
          gems: 2,
          action_key: 'subscription_cancelled',
          action_label: 'Subscription cancelled — downgraded to Free',
          status: 'adjustment',
          admin_note: `Subscription ${sub.id} deleted`,
        });

        console.log(`[stripeWebhook] ❌ subscription deleted: ${userRecord.email} → Free`);
      }
    }

    // ── CHARGE REFUNDED ─────────────────────────────────────────────────────────
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const customerId = charge.customer;
      const userRecord = customerId ? await findUserByCustomerId(base44, customerId) : null;

      if (userRecord) {
        await logGemTransaction(base44, {
          userRecord,
          planKey: userRecord.subscription_plan || 'free',
          gems: 0,
          action_key: 'charge_refunded',
          action_label: `Stripe charge refunded: $${(charge.amount_refunded / 100).toFixed(2)}`,
          status: 'refunded',
          admin_note: `Charge ${charge.id} refunded`,
        });
        console.log(`[stripeWebhook] 💸 charge.refunded for ${userRecord.email}`);
      }
    }

  } catch (err) {
    console.error('[stripeWebhook] handler error:', err.message);
  }

  return Response.json({ received: true });
});