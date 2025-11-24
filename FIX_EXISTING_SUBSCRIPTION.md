# Fix Existing Subscription Record

## Issue
Your subscription record in the database shows:
- `status: "trialing"` ✅ (correct)
- `plan: "free"` ❌ (should be "premium")

## Quick Fix

Run this SQL in Supabase SQL Editor to update existing records:

```sql
-- Update trialing subscriptions to premium
UPDATE subscriptions
SET plan = 'premium'
WHERE status = 'trialing' AND plan = 'free';

-- Also update active subscriptions to premium (if any are wrong)
UPDATE subscriptions
SET plan = 'premium'
WHERE status = 'active' AND plan = 'free';
```

## Why This Happened

The webhook was setting `plan: "free"` when `status: "trialing"`. I've fixed the webhook code to set `plan: "premium"` for both `"active"` and `"trialing"` statuses.

## After Running the SQL

1. Refresh your app
2. You should now see Pro status
3. Future webhook events will set the plan correctly

