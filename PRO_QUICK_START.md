# Pro Plan Production Setup - Quick Start

## ✅ What's Already Done

1. ✅ Stripe webhook handler created (`functions/api/stripe-webhook.ts`)
2. ✅ Subscription service created (`src/services/subscriptions.ts`)
3. ✅ App.tsx updated to check database for subscription status
4. ✅ Stripe package installed
5. ✅ SQL migration file created (`supabase/migrations/001_create_subscriptions_table.sql`)

## 🚀 Next Steps (In Order)

### 1. Run Database Migration
```sql
-- Go to Supabase Dashboard → SQL Editor
-- Copy and paste contents of: supabase/migrations/001_create_subscriptions_table.sql
-- Click "Run"
```

### 2. Get Your API Keys

**From Stripe Dashboard:**
- Secret Key: https://dashboard.stripe.com/apikeys → Copy "Secret key"
- Webhook Secret: https://dashboard.stripe.com/webhooks → (after creating webhook)

**From Supabase Dashboard:**
- Service Role Key: Settings → API → service_role key (⚠️ Keep secret!)

### 3. Set Environment Variables

**Local Development (`.dev.vars`):**
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Production (Cloudflare Pages):**
```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### 4. Deploy to Production
```bash
npm run build
# Deploy to Cloudflare Pages (via your CI/CD or manually)
```

### 5. Configure Stripe Webhook
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://harada-grid.pages.dev/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy signing secret → `wrangler secret put STRIPE_WEBHOOK_SECRET`

### 6. Test
1. Purchase Pro plan via Stripe checkout
2. Check Supabase `subscriptions` table for new record
3. Refresh app → Should show Pro status
4. Try creating >3 maps → Should work (Pro users have unlimited)

## 📋 Files Created/Modified

**New Files:**
- `functions/api/stripe-webhook.ts` - Webhook handler
- `src/services/subscriptions.ts` - Subscription service
- `supabase/migrations/001_create_subscriptions_table.sql` - Database migration
- `PRODUCTION_PRO_SETUP.md` - Full setup guide
- `PRO_QUICK_START.md` - This file

**Modified Files:**
- `src/App.tsx` - Now checks database for subscription status
- `package.json` - Added `stripe` dependency

## 🔍 How It Works

1. User clicks "Upgrade to Premium" → Redirects to Stripe checkout
2. User completes payment → Stripe sends `checkout.session.completed` webhook
3. Webhook handler finds user by email → Creates subscription record in database
4. User refreshes app → `App.tsx` loads subscription from database
5. `isPro` is now `true` → User can create unlimited maps

## ⚠️ Important Notes

- **Webhook must be configured** for subscriptions to work
- **Service role key** is required for webhook (bypasses RLS)
- **Email matching** is used to link Stripe customer to Supabase user
- **Fallback to localStorage** still works for development/testing

## 🐛 Troubleshooting

**Subscription not showing after purchase:**
- Check Stripe webhook logs for errors
- Verify webhook secret is correct
- Check Supabase `subscriptions` table for record
- Verify user email matches between Stripe and Supabase

**Webhook not receiving events:**
- Verify endpoint URL is correct
- Check Cloudflare Pages function logs
- Test with Stripe CLI locally first

**User not found in webhook:**
- User must sign up with same email used in Stripe checkout
- Consider storing `user_id` in Stripe checkout metadata for better matching


