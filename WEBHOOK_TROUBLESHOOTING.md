# Stripe Webhook Troubleshooting

## Problem: Empty Subscriptions Table After Stripe Checkout

After completing Stripe checkout, you should see a row in the `subscriptions` table. If it's empty, the webhook hasn't run or failed.

## Step 1: Check Stripe Webhook Configuration

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Find your webhook endpoint (should be something like `https://harada-grid.pages.dev/api/stripe-webhook`)
3. Check if it's **enabled** and has the correct events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

## Step 2: Check Recent Webhook Events

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Go to **Recent events** tab
4. Look for `checkout.session.completed` events
5. Click on the most recent one
6. Check:
   - **Status**: Should be "Succeeded" (green)
   - **Response**: Should show `{"received": true}`
   - **Request**: Check the payload

## Step 3: Check Cloudflare Pages Function Logs

1. Go to **Cloudflare Dashboard** → **Workers & Pages**
2. Select your `harada-grid` project
3. Go to **Functions** tab
4. Click on `stripe-webhook` function
5. Check **Logs** for:
   - Any errors
   - "Webhook signature verification failed"
   - "Failed to upsert subscription"
   - "User not found for email"

## Step 4: Verify Environment Variables

Make sure these are set in **Cloudflare Pages** → **Settings** → **Environment Variables**:

- ✅ `STRIPE_WEBHOOK_SECRET` - From Stripe webhook settings
- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key
- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (NOT anon key!)

## Step 5: Test Webhook Manually

You can manually trigger a webhook event from Stripe:

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click on your webhook
3. Click **Send test webhook**
4. Select `checkout.session.completed`
5. Click **Send test webhook**
6. Check if a row appears in the `subscriptions` table

## Step 6: Check Webhook Endpoint URL

Your webhook endpoint should be:
```
https://harada-grid.pages.dev/api/stripe-webhook
```

Make sure:
- ✅ The URL is correct in Stripe
- ✅ The function is deployed to Cloudflare Pages
- ✅ The route is `/api/stripe-webhook` (not `/functions/api/stripe-webhook`)

## Step 7: Verify User Email Match

The webhook finds users by email. Make sure:
- ✅ The email in Stripe customer matches the email in Supabase auth
- ✅ The user exists in Supabase `auth.users` table

## Common Issues

### Issue 1: Webhook Secret Mismatch
**Error**: "Webhook signature verification failed"
**Fix**: Copy the webhook signing secret from Stripe and update `STRIPE_WEBHOOK_SECRET` in Cloudflare

### Issue 2: User Not Found
**Error**: "User not found for email: ..."
**Fix**: Make sure the email in Stripe matches the email in Supabase auth

### Issue 3: Service Role Key Wrong
**Error**: "Failed to upsert subscription" with 401/403
**Fix**: Use `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_ANON_KEY`)

### Issue 4: Function Not Deployed
**Error**: 404 or function not found
**Fix**: Make sure `functions/api/stripe-webhook.ts` is deployed to Cloudflare Pages

## Quick Fix: Manually Create Subscription (Testing Only)

If you need to test immediately, you can manually insert a subscription:

```sql
INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  plan,
  current_period_start,
  current_period_end,
  cancel_at_period_end
) VALUES (
  'a20acfc-bea1-49d4-83ef-99a7220e14d0', -- Your user_id
  'cus_xxxxx', -- From Stripe customer ID
  'sub_xxxxx', -- From Stripe subscription ID
  'active',
  'premium',
  NOW(),
  NOW() + INTERVAL '1 month',
  false
);
```

**Note**: This is only for testing. The webhook should handle this automatically.

