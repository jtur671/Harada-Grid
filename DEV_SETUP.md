# Development Setup for AI Helper

To test the AI helper feature locally, you need to run **two servers**:

## Option 1: Two Terminal Windows (Recommended)

### Terminal 1: Vite Dev Server (Frontend)
```bash
npm run dev
```
This runs the React app on `http://localhost:5173`

### Terminal 2: Cloudflare Pages Dev Server (API Functions)
```bash
# First, build the frontend
npm run build

# Then run wrangler pages dev
wrangler pages dev dist --compatibility-date=2024-01-01
```
This runs the Pages Functions on `http://localhost:8788`

The Vite dev server is configured to proxy `/api/*` requests to `http://localhost:8788`, so when you use the AI helper in the app, it will automatically forward to the Pages Function.

## Option 2: Use Production API (Quick Test)

If you've already deployed to Cloudflare Pages and set the `OPENAI_API_KEY` secret, you can temporarily point to production:

1. Create a `.env.local` file:
```bash
VITE_AI_HELPER_URL=https://harada-grid.pages.dev/api/ai-helper
```

2. Restart your Vite dev server

## Environment Variables

### Local Development
Create a `.dev.vars` file in the project root:
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

This file is gitignored and used by `wrangler pages dev`.

### Production
Set `OPENAI_API_KEY` in Cloudflare Pages:
- Dashboard → Workers & Pages → harada-grid → Settings → Environment variables
- Or use CLI: `wrangler secret put OPENAI_API_KEY`

## Testing

1. Start both servers (Terminal 1 + Terminal 2)
2. Open `http://localhost:5173` in your browser
3. Navigate to the builder
4. Click "Generate with AI" in the AI Helper modal
5. Enter a goal and click "Generate"

The request will flow: Browser → Vite (port 5173) → Proxy → Wrangler (port 8788) → OpenAI → Response back

