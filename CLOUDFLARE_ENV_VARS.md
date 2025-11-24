# Cloudflare Pages Environment Variables Setup

## Issue
The webhook is failing with: `"Invalid URL: undefined/rest/v1/subscriptions..."`

This means `SUPABASE_URL` is not set in Cloudflare Pages environment variables.

## Required Environment Variables

You need to add these in **Cloudflare Dashboard** → **Workers & Pages** → **harada-grid** → **Settings** → **Variables and Secrets**:

### For Webhook Function (Server-side):
1. ✅ `STRIPE_SECRET_KEY` - Already set
2. ✅ `STRIPE_WEBHOOK_SECRET` - Already set  
3. ✅ `SUPABASE_SERVICE_ROLE_KEY` - Already set
4. ❌ **`SUPABASE_URL`** - **MISSING!** (This is the problem)

### For Client-side (Vite):
- `VITE_SUPABASE_URL` - Already set (for client-side code)
- `VITE_SUPABASE_ANON_KEY` - Already set (for client-side code)

## How to Add SUPABASE_URL

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **harada-grid**
2. Click **Settings** tab
3. Click **Variables and Secrets** (under Build)
4. Click **"+ Add"** button
5. Add:
   - **Type**: Plaintext
   - **Name**: `SUPABASE_URL`
   - **Value**: Your Supabase project URL (e.g., `https://dcjsqkgyzerobcujeipt.supabase.co`)
     - Get this from: Supabase Dashboard → Settings → API → Project URL
6. Click **Save**

## Important Notes

- **`SUPABASE_URL`** (without `VITE_` prefix) is for **server-side functions** (webhook)
- **`VITE_SUPABASE_URL`** (with `VITE_` prefix) is for **client-side code** (React app)
- They should have the **same value**, but need to be set separately
- The webhook function cannot access `VITE_*` variables - it needs `SUPABASE_URL`

## Verify Setup

After adding `SUPABASE_URL`:

1. **Redeploy** your site (or wait for auto-deploy)
2. **Replay the webhook** in Stripe:
   - Stripe Dashboard → Events → Find failed event → Click "Resend"
3. **Check Cloudflare logs**:
   - Functions → Real-time Logs
   - Should see `[upsertSubscription]` logs with the Supabase URL

## Current Status

✅ Variables that are set:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL` (client-side)
- `VITE_SUPABASE_ANON_KEY` (client-side)
- `OPENAI_API_KEY`

❌ Missing variable:
- `SUPABASE_URL` (server-side) ← **This is causing the error**


