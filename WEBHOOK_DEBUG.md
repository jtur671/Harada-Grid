# Debugging Webhook - No Subscription in Database

## Step 1: Check Cloudflare Function Logs

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **harada-grid**
2. Go to **Functions** tab
3. Click on **"Real-time Logs (Beta)"**
4. Click **"Begin log stream"**
5. Complete a test checkout or replay a webhook event
6. Look for logs starting with `[handleCheckoutCompleted]` and `[upsertSubscription]`

**What to look for:**
- `[handleCheckoutCompleted] Processing checkout session` - Webhook received
- `[handleCheckoutCompleted] Found user:` - User lookup succeeded
- `[upsertSubscription] Successfully upserted subscription` - Database write succeeded
- Any error messages

## Step 2: Check Stripe Webhook Events

1. Go to **Stripe Dashboard** → **Developers** → **Events**
2. Find the most recent `checkout.session.completed` event
3. Click on it
4. Check:
   - **Status**: Should be "Succeeded" (green)
   - **Response**: Should show `{"received": true}`
   - **Request**: Check the payload

If it shows "Failed", click on it to see the error.

## Step 3: Verify Email Match

The webhook finds users by email. Make sure:

1. **Stripe Customer Email** matches **Supabase Auth Email**
   - In Stripe: Go to Customers → Find your customer → Check email
   - In Supabase: Go to Authentication → Users → Check email
   - They must match exactly (case-sensitive)

2. **Test with your actual email:**
   - What email did you use in Stripe checkout?
   - What email is in your Supabase auth.users table?
   - Are they the same?

## Step 4: Check Database Permissions

The webhook uses `SUPABASE_SERVICE_ROLE_KEY` which should bypass RLS. Verify:

1. **Service Role Key is correct:**
   - In Cloudflare: Settings → Variables → `SUPABASE_SERVICE_ROLE_KEY`
   - In Supabase: Settings → API → Service Role Key (starts with `eyJ...`)
   - They must match

2. **Table exists:**
   - In Supabase: Table Editor → `subscriptions` table should exist
   - Check the columns match the migration

## Step 5: Test Manually

You can test the webhook manually from Stripe:

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click on your webhook
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check Cloudflare logs immediately

## Step 6: Common Issues

### Issue: "User not found for email"
**Cause**: Email in Stripe doesn't match email in Supabase
**Fix**: 
- Check both emails match exactly
- Make sure user exists in Supabase auth.users
- The email used in Stripe checkout must be the same as Supabase auth email

### Issue: "Failed to upsert subscription: 400"
**Cause**: Database constraint violation or missing column
**Fix**:
- Check if `user_id` already exists (should use upsert)
- Verify all columns exist in subscriptions table
- Check RLS policies aren't blocking service role

### Issue: "Failed to upsert subscription: 401/403"
**Cause**: Wrong service role key
**Fix**:
- Verify `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare matches Supabase
- Make sure it's the Service Role key, not the Anon key

### Issue: Webhook not being called
**Cause**: Function not deployed or webhook not configured
**Fix**:
- Check Functions tab shows `/api/stripe-webhook` in routing
- Verify webhook endpoint URL in Stripe matches your domain
- Make sure webhook is "Active" in Stripe

## Quick Test Query

Run this in Supabase SQL Editor to check if any subscriptions exist:

```sql
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10;
```

If empty, the webhook hasn't successfully created any records yet.

