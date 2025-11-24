# Fixing 406 Not Acceptable Error for Subscriptions

## Problem
After completing Stripe checkout, users see a `406 Not Acceptable` error when fetching subscription status, and their Pro status doesn't show.

## Root Causes

1. **`.single()` throws error when no row exists**
   - Fixed: Changed to `.maybeSingle()` which returns `null` instead of throwing

2. **Subscription record doesn't exist yet**
   - The Stripe webhook may not have processed yet
   - Solution: User may need to wait a few seconds and refresh, or check webhook logs

3. **RLS Policy Issue**
   - The RLS policy might not be allowing users to read their own subscription
   - Verify the policy exists and is correct

## Fixes Applied

1. Changed `.single()` to `.maybeSingle()` in `subscriptions.ts`
2. Improved error handling for 406 errors
3. Better logging to diagnose the issue

## Verification Steps

### 1. Check if subscription record exists in Supabase

Run this query in Supabase SQL Editor:
```sql
SELECT * FROM subscriptions 
WHERE user_id = 'a20acfc-bea1-49d4-83ef-99a7220e14d0';
```

If no row exists, the webhook hasn't run yet or failed.

### 2. Verify RLS Policy

Run this in Supabase SQL Editor:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'subscriptions';

-- Check existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'subscriptions';
```

The policy should be:
```sql
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
```

### 3. Check Stripe Webhook Logs

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint
3. Check recent events for `checkout.session.completed`
4. Verify the webhook is calling your Cloudflare Pages function
5. Check Cloudflare Pages function logs for errors

### 4. Test the Query Directly

In Supabase SQL Editor, test if the user can read their subscription:
```sql
-- This simulates what the app does
SET request.jwt.claim.sub = 'a20acfc-bea1-49d4-83ef-99a7220e14d0';

SELECT plan, status, cancel_at_period_end, current_period_end
FROM subscriptions
WHERE user_id = 'a20acfc-bea1-49d4-83ef-99a7220e14d0';
```

## Temporary Workaround

If the subscription record exists but the query still fails:
1. The app will fall back to `localStorage` plan
2. User can manually set their plan in localStorage (dev only)
3. In production, wait for webhook to process and refresh

## Next Steps

1. Verify the subscription record exists in the database
2. Check Stripe webhook is configured correctly
3. Verify RLS policy allows users to read their own subscription
4. Check Cloudflare Pages function logs for webhook processing errors

