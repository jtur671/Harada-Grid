# Production Pro Plan Setup Guide

## Overview
This guide walks you through setting up production-ready Stripe subscription management for the Pro plan.

## Current State
- ✅ Stripe checkout URL: `https://buy.stripe.com/aFa6oHfYQgCI3eDcj8cAo00`
- ⚠️ Pro status currently stored in localStorage (testing only)
- ❌ No database tracking of subscriptions
- ❌ No Stripe webhook integration

## What You Need

### 1. Supabase Database Setup

#### Add subscription tracking to your database:

```sql
-- Add subscription columns to your users table or create a subscriptions table
-- Option A: Add to existing user metadata
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Option B: Create separate subscriptions table (RECOMMENDED)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing', etc.
  plan TEXT NOT NULL, -- 'free' or 'premium'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Enable RLS (Row Level Security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all subscriptions (for webhooks)
-- Note: This requires service_role key, not anon key
```

### 2. Stripe Webhook Setup

#### Create webhook endpoint in Cloudflare Pages Functions:

**File: `functions/api/stripe-webhook.ts`**

```typescript
// This will be created - see implementation below
```

#### Configure in Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://harada-grid.pages.dev/api/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed` (when user completes checkout)
   - `customer.subscription.created` (when subscription is created)
   - `customer.subscription.updated` (when subscription changes)
   - `customer.subscription.deleted` (when subscription is canceled)
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Cloudflare Secrets: `wrangler secret put STRIPE_WEBHOOK_SECRET`

### 3. Environment Variables

#### Cloudflare Pages Secrets (Production):
```bash
# Set via Wrangler CLI (recommended) or Cloudflare Dashboard
cd harada-grid
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste your webhook signing secret from Stripe Dashboard (starts with whsec_)

wrangler secret put STRIPE_SECRET_KEY
# Paste your Stripe secret key (starts with sk_live_ for production, sk_test_ for testing)

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your Supabase service_role key (from Supabase Dashboard → Settings → API)
# ⚠️ WARNING: This key has admin access - never expose it in client code!
```

#### Local Development (`.dev.vars`):
Add these to your existing `.dev.vars` file:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe Dashboard → Webhooks → Your endpoint → Signing secret
STRIPE_SECRET_KEY=sk_test_...    # From Stripe Dashboard → Developers → API keys → Secret key
SUPABASE_SERVICE_ROLE_KEY=eyJ... # From Supabase Dashboard → Settings → API → service_role key
```

**Note:** `.dev.vars` is already in `.gitignore`, so it won't be committed.

### 4. Code Changes Needed

#### A. Create subscription service
- `src/services/subscriptions.ts` - Check subscription status from database

#### B. Update App.tsx
- Replace localStorage plan check with database subscription check
- Load subscription status on user login

#### C. Create Stripe webhook handler
- `functions/api/stripe-webhook.ts` - Handle Stripe events

#### D. Update PricingPage
- After Stripe checkout, redirect to success page that triggers subscription sync

### 5. Stripe Dashboard Configuration

#### Checkout Settings:
- ✅ Success URL: `https://harada-grid.pages.dev/pricing?success=true`
- ✅ Cancel URL: `https://harada-grid.pages.dev/pricing?canceled=true`
- ✅ Customer email collection: Enabled
- ✅ Metadata: Include `user_id` if possible

#### Product Setup:
- Product: "Action Maps Pro"
- Price: Your monthly/yearly price
- Billing: Recurring
- Trial: Optional (if offering trial)

## Implementation Steps

1. ✅ Set up Supabase subscriptions table
2. ✅ Create Stripe webhook handler
3. ✅ Create subscription service
4. ✅ Update App.tsx to check database
5. ✅ Test webhook locally with Stripe CLI
6. ✅ Deploy webhook to production
7. ✅ Configure Stripe webhook in dashboard
8. ✅ Test end-to-end flow

## Local Testing

### Test Webhook Locally with Stripe CLI

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server:**
   ```bash
   # In one terminal, start your local API server
   npm run dev:api
   
   # In another terminal, forward Stripe webhooks
   stripe listen --forward-to localhost:8788/api/stripe-webhook
   ```

4. **Trigger test events:**
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.created
   ```

### Test in Stripe Test Mode

1. Use test mode in Stripe Dashboard
2. Use test checkout URL: Update `PricingPage.tsx` to use test checkout link
3. Complete test checkout with card: `4242 4242 4242 4242`
4. Verify webhook receives event
5. Check Supabase database for subscription record

## Testing Checklist

- [ ] Supabase subscriptions table created
- [ ] Stripe webhook endpoint configured
- [ ] Environment variables set (local and production)
- [ ] User can purchase Pro plan via Stripe checkout
- [ ] Webhook receives `checkout.session.completed` event
- [ ] Subscription record created in database
- [ ] User shows as Pro in UI after purchase (refresh page)
- [ ] User can create unlimited maps as Pro
- [ ] Subscription cancellation updates database
- [ ] Expired subscription reverts to free
- [ ] Free users limited to 3 maps
- [ ] Webhook signature verification works

## Security Notes

- ⚠️ Never expose Stripe secret key in client code
- ⚠️ Always verify webhook signatures
- ⚠️ Use Supabase service role key only in server-side code
- ⚠️ Validate user_id in webhook payloads

