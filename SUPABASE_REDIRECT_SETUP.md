# Supabase Email Redirect Configuration

## Problem
When users click the confirmation link in their email, it tries to redirect to `localhost` instead of your production URL `https://harada-grid.pages.dev/`.

## Solution

You need to configure the redirect URLs in your Supabase dashboard:

### Step 1: Go to Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**

### Step 2: Add Site URL

In the **Site URL** field, enter:
```
https://harada-grid.pages.dev
```

### Step 3: Add Redirect URLs

In the **Redirect URLs** section, click **Add URL** and add:

1. **Production URL:**
   ```
   https://harada-grid.pages.dev/**
   ```
   (The `**` wildcard allows any path on your domain)

2. **Optional - Preview/Staging URLs** (if you have them):
   ```
   https://*.pages.dev/**
   ```

### Step 4: Save

Click **Save** to apply the changes.

## What This Does

- **Site URL**: The default URL Supabase uses for redirects
- **Redirect URLs**: Whitelist of allowed redirect URLs for security

After configuring these, when users click the confirmation link in their email, Supabase will redirect them to `https://harada-grid.pages.dev/` instead of `localhost`.

## Code Changes

The code has been updated to pass `emailRedirectTo: window.location.origin` in the signup call, which will use the current domain (production or local) automatically.

## Testing

After making these changes:
1. Try signing up a new user
2. Check the confirmation email
3. Click the confirmation link
4. It should redirect to `https://harada-grid.pages.dev/` (not localhost)

