# Google OAuth Setup for Supabase

## Problem
Google login might not be working because Google OAuth needs to be configured in both:
1. Supabase Dashboard
2. Google Cloud Console

## Step-by-Step Setup

### Step 1: Enable Google Provider in Supabase

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle it **ON**
6. You'll see fields for **Client ID** and **Client Secret** (we'll get these from Google)

### Step 2: Create Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in:
     - App name: "Harada Grid" (or your app name)
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue**
   - Add scopes: `email`, `profile`, `openid`
   - Click **Save and Continue**
   - Add test users (optional for development)
   - Click **Save and Continue**
   - Review and go back to dashboard

6. Back in **Credentials**, click **+ CREATE CREDENTIALS** → **OAuth client ID**
7. Choose **Web application**
8. Name it: "Harada Grid Web Client"
9. **Authorized JavaScript origins:**
   - Add: `https://harada-grid.pages.dev`
   - Add: `http://localhost:5173` (for local dev)
   - Add: `http://localhost:8788` (for local Pages dev)

10. **Authorized redirect URIs:**
    - Add: `https://dcjsqkgyzerobcujeipt.supabase.co/auth/v1/callback`
    - (This is your actual callback URL - copy it from the Supabase Google settings panel)
    - Make sure it's exactly `/auth/v1/callback` (not `/auth/v1/call`)

11. Click **Create**
12. Copy the **Client ID** and **Client Secret**

### Step 3: Add Credentials to Supabase

1. Back in Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste the **Client ID** from Google
3. Paste the **Client Secret** from Google
4. Click **Save**

### Step 4: Verify Redirect URLs in Supabase

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Make sure **Site URL** is: `https://harada-grid.pages.dev`
3. Make sure **Redirect URLs** includes: `https://harada-grid.pages.dev/**`

## Testing

1. Try clicking "Continue with Google" in your app
2. You should be redirected to Google's sign-in page
3. After signing in, you should be redirected back to your app
4. The user should be logged in automatically

## Troubleshooting

### "redirect_uri_mismatch" Error
- Make sure the redirect URI in Google Console exactly matches: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
- Check for typos, trailing slashes, or http vs https

### "Access blocked" Error
- Make sure your OAuth consent screen is published (for production)
- Or add the user as a test user (for development)

### Not Redirecting Back
- Check that the redirect URL is in Supabase's allowed list
- Make sure `window.location.origin` matches your production URL

## Code Changes

The code has been updated to:
- Use the full URL path for redirect: `${window.location.origin}${window.location.pathname}`
- Add query parameters for better OAuth flow
- Add better error handling

