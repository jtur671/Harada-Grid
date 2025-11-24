# Webhook Deployment Status Check

## ✅ Function is Deployed

The function is accessible at: `https://harada-grid.pages.dev/api/stripe-webhook`

Test response: Returns "Missing stripe-signature header" (expected behavior)

## ❌ Issue: Stripe Shows 0 Event Deliveries

This means Stripe isn't successfully sending events to your webhook, or the events are failing silently.

## Steps to Fix

### 1. Verify Webhook Endpoint URL in Stripe

In Stripe Dashboard → Developers → Webhooks → Your webhook:
- **Endpoint URL** should be: `https://harada-grid.pages.dev/api/stripe-webhook`
- Make sure there's no trailing slash
- Make sure it's using `https://` not `http://`

### 2. Check Webhook Status in Stripe

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on "Harada production webhook"
3. Check the **Status** - should be "Active" (green)
4. If it shows "Inactive" or "Failed", click "Reactivate" or check the error

### 3. Test Webhook Manually from Stripe

1. In Stripe Dashboard → Developers → Webhooks
2. Click on your webhook
3. Click **"Send test webhook"** button
4. Select event: `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check if it shows "Succeeded" or "Failed"

### 4. Check Recent Events in Stripe

1. Go to Stripe Dashboard → Developers → Events
2. Look for `checkout.session.completed` events
3. Click on the most recent one
4. Check if it shows a webhook delivery attempt
5. If it shows "Failed", click on it to see the error

### 5. Verify Webhook Secret Matches

The webhook secret in Cloudflare should match the one in Stripe:

1. **In Stripe**: Go to your webhook → **Signing secret** (starts with `whsec_`)
2. **In Cloudflare**: Settings → Variables and Secrets → `STRIPE_WEBHOOK_SECRET`
3. They should match exactly

### 6. Check Cloudflare Function Logs

1. Go to Cloudflare Dashboard → Workers & Pages → harada-grid
2. Go to **Functions** tab
3. Click on `stripe-webhook`
4. Check **Logs** for:
   - "Webhook signature verification failed"
   - "User not found for email"
   - "Failed to upsert subscription"
   - Any other errors

### 7. Re-send Webhook for Past Checkout

If you already completed checkout, you can manually trigger the webhook:

1. Go to Stripe Dashboard → Payments
2. Find your checkout session
3. Click on it
4. Look for "Send test webhook" or "Replay webhook" option
5. Or go to Developers → Events → Find `checkout.session.completed` → Click "Send again"

## Most Likely Issues

1. **Webhook URL mismatch** - Check the exact URL in Stripe matches your Cloudflare Pages URL
2. **Webhook secret mismatch** - The secret in Cloudflare doesn't match Stripe
3. **Webhook not active** - The webhook is disabled or failed in Stripe
4. **Events not configured** - The webhook isn't listening to `checkout.session.completed`

## Quick Test

Run this in your terminal to test if the function responds:

```bash
curl -X POST https://harada-grid.pages.dev/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

Expected response: `Missing stripe-signature header` (this confirms the function is deployed)

