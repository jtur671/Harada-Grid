# Deploy Stripe Webhook Function

## Issue
The `stripe-webhook` function exists in your codebase but isn't showing up in Cloudflare Pages Functions routing.

## Solution

### 1. Verify the Function File Exists
The function should be at: `functions/api/stripe-webhook.ts`

### 2. Commit and Push Changes
Make sure all changes are committed and pushed:

```bash
git add functions/api/stripe-webhook.ts
git commit -m "Add Stripe webhook handler with async signature verification"
git push
```

### 3. Trigger a New Deployment
Cloudflare Pages should auto-deploy when you push, but you can also:

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **harada-grid**
2. Go to **Deployments** tab
3. Click **"Retry deployment"** on the latest deployment, or
4. Make a small change and push again to trigger a new deployment

### 4. Verify Function Appears
After deployment completes:

1. Go to **Functions** tab
2. Check **Routing configuration** section
3. You should see:
   ```json
   {
     "routePath": "/api/stripe-webhook",
     "mountPath": "/api",
     "method": "POST",
     "module": ["api/stripe-webhook.ts:onRequestPost"]
   }
   ```

### 5. Test the Function
Once it appears, test it:

```bash
curl -X POST https://harada-grid.pages.dev/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

Expected response: `Missing stripe-signature header` (confirms function is deployed)

## Why It Might Not Show Up

1. **Not committed/pushed** - Function file needs to be in git
2. **Deployment hasn't run** - Cloudflare needs to build and deploy
3. **Build failed** - Check deployment logs for errors
4. **Function format issue** - Make sure it exports `onRequestPost` correctly

## Current Status

✅ Function file exists at `functions/api/stripe-webhook.ts`
✅ Function exports `onRequestPost: PagesFunction<Env>`
✅ Function uses `constructEventAsync` (async version for Cloudflare)
✅ Function is committed to git

**Next step**: Make sure it's pushed and Cloudflare has deployed it.


