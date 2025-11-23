# Production Environment Variables Setup

## Required Environment Variables for Cloudflare Pages

You need to set these in Cloudflare Pages for production to work:

### 1. Supabase Configuration

**Via Cloudflare Dashboard:**
1. Go to https://dash.cloudflare.com
2. Workers & Pages → harada-grid
3. Settings → Environment variables
4. Add these variables:

   **Variable 1:**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Environment:** Production (and Preview if you want to test)

   **Variable 2:**
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon/public key
   - **Environment:** Production (and Preview if you want to test)

**Via CLI:**
```bash
# Set Supabase URL
npx wrangler pages secret put VITE_SUPABASE_URL --project-name=harada-grid

# Set Supabase Anon Key
npx wrangler pages secret put VITE_SUPABASE_ANON_KEY --project-name=harada-grid
```

### 2. OpenAI API Key (for AI Helper)

**Variable:**
- **Name:** `OPENAI_API_KEY`
- **Value:** Your OpenAI API key
- **Environment:** Production

**Via CLI:**
```bash
npx wrangler secret put OPENAI_API_KEY --project-name=harada-grid
```

## How to Find Your Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. You'll see:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **anon public** key → This is your `VITE_SUPABASE_ANON_KEY`

## Important Notes

- **VITE_ prefix:** These variables need the `VITE_` prefix because Vite only exposes environment variables that start with `VITE_` to the client-side code.
- **After setting variables:** You may need to trigger a new deployment for the changes to take effect. You can do this by:
  - Making a small change and pushing to your main branch, OR
  - Going to Cloudflare Dashboard → Deployments → Retry deployment

## Verification

After setting the variables and redeploying, check the browser console. You should see:
- No more "placeholder.supabase.co" errors
- Successful authentication requests
- Your actual Supabase URL in network requests

