import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_MAP = {
  starter: 'price_1TWNsLPqHNcdlhYOMqBSlGyB', // $9.99/month
  premium: 'price_1TWNsLPqHNcdlhYO4ScjKBIJ', // $19.99/month
  elite:   'price_1TWNsLPqHNcdlhYOUhYwDo4X', // $39.99/month
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan, success_url, cancel_url } = await req.json();
    const newPriceId = PRICE_MAP[plan];
    if (!newPriceId) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    // Get the user record to find stripe_customer_id
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userRecord = allUsers.find(u => u.email === user.email);

    // Try to find an active subscription to upgrade inline (prorate)
    if (userRecord?.stripe_customer_id) {
      let subscriptions;
      try {
        subscriptions = await stripe.subscriptions.list({
          customer: userRecord.stripe_customer_id,
          status: 'active',
          limit: 1,
        });
      } catch (stripeErr) {
        console.warn('[upgradeSubscription] customer lookup failed (stale ID?):', stripeErr.message);
        subscriptions = { data: [] };
        // Clear the stale customer ID
        await base44.asServiceRole.entities.User.update(userRecord.id, { stripe_customer_id: null });
      }

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const currentItem = subscription.items.data[0];

        await stripe.subscriptions.update(subscription.id, {
          items: [{ id: currentItem.id, price: newPriceId }],
          proration_behavior: 'always_invoice',
          metadata: {
            base44_app_id: Deno.env.get('BASE44_APP_ID'),
            plan,
          },
        });

        const GEM_ALLOC = {
          starter: { gems_balance: 200,  gems_limit_monthly: 200 },
          premium: { gems_balance: 500,  gems_limit_monthly: 500 },
          elite:   { gems_balance: 1100, gems_limit_monthly: 1100 },
        };
        const gems = GEM_ALLOC[plan] || {};
        const ROLE_MAP = { starter: 'starter', premium: 'premium', elite: 'elite' };
        const resetDate = new Date();
        resetDate.setMonth(resetDate.getMonth() + 1);

        await base44.asServiceRole.entities.User.update(userRecord.id, {
          role: ROLE_MAP[plan] || 'premium',
          ...gems,
          gems_used_this_month: 0,
          subscription_plan: plan,
          subscription_status: 'active',
          subscription_reset_date: resetDate.toISOString(),
          gems_reset_date: resetDate.toISOString(),
        });

        console.log(`[upgradeSubscription] ${user.email} inline-upgraded to ${plan}`);
        return Response.json({ success: true });
      }
    }

    // No valid active subscription found — fall back to a new Stripe checkout session
    console.log(`[upgradeSubscription] no active subscription for ${user.email}, creating checkout session for ${plan}`);
    const origin = success_url ? new URL(success_url).origin : 'https://studioone.ai';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: newPriceId, quantity: 1 }],
      success_url: success_url || `${origin}/upgrade?success=1`,
      cancel_url: cancel_url || `${origin}/upgrade?cancelled=1`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        plan,
      },
    });

    return Response.json({ success: false, checkout_url: session.url });
  } catch (error) {
    console.error('[upgradeSubscription] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});