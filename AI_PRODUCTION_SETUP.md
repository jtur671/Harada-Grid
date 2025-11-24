# AI Feature Production Setup

## ✅ Code Status
The AI helper code is now production-ready! The fix ensures it works in Cloudflare Workers by using `context.env` instead of `process.env`.

## 🚀 What You Need to Do for Production

### 1. Set OpenAI API Key as Cloudflare Secret

**Option A: Using Wrangler CLI (Recommended)**
```bash
cd harada-grid
wrangler secret put OPENAI_API_KEY
# When prompted, paste your OpenAI API key
```

**Option B: Using Cloudflare Dashboard**
1. Go to: https://dash.cloudflare.com
2. Navigate to: Workers & Pages → Your Project → Settings → Environment Variables
3. Add variable:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (starts with `sk-proj-...` or `sk-...`)
   - **Type:** Secret (encrypted)

### 2. Deploy to Production

After setting the secret, deploy your site:
```bash
npm run build
# Then deploy via your CI/CD or Cloudflare Dashboard
```

### 3. Verify It Works

1. Go to your production site: `https://harada-grid.pages.dev`
2. Log in and go to the Builder
3. Click "Templates (AI)"
4. Enter a goal and click "Generate"
5. Should work! 🎉

## 🔍 How It Works

- **Local Dev:** Uses `.dev.vars` file (via `--env-file .dev.vars` flag)
- **Production:** Uses Cloudflare Pages Secrets (set via `wrangler secret put` or Dashboard)

The function automatically reads from `context.env.OPENAI_API_KEY` in both environments.

## ⚠️ Important Notes

- The same API key you use in `.dev.vars` should be set as the Cloudflare secret
- Secrets are encrypted and never exposed in logs or code
- If the AI feature doesn't work in production, check:
  1. Is the secret set? (`wrangler secret list` to verify)
  2. Is the secret name exactly `OPENAI_API_KEY`? (case-sensitive)
  3. Check Cloudflare function logs for errors

## 📝 Also Needed for Full Production

If you haven't already, you'll also need these secrets for the Stripe webhook:
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

But the AI feature only needs `OPENAI_API_KEY` to work!

