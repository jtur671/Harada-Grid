# Cloudflare Pages Functions

This directory contains Cloudflare Pages Functions for the Harada Grid application.

## AI Helper Function

The AI Helper function (`/api/ai-helper`) generates Harada Method action maps from user goals using OpenAI.

### Setup

1. **Set OpenAI API Key in Cloudflare:**
   - Go to your Cloudflare Pages project settings
   - Navigate to "Settings" → "Environment variables"
   - Add a new variable:
     - **Variable name:** `OPENAI_API_KEY`
     - **Value:** Your OpenAI API key
     - **Environment:** Production (and Preview if you want to test)

   Or use Cloudflare CLI:
   ```bash
   wrangler secret put OPENAI_API_KEY
   ```

2. **Local Development:**
   
   Install Wrangler CLI if you haven't:
   ```bash
   npm install -g wrangler
   ```
   
   Create a `.dev.vars` file in the project root (this file is gitignored):
   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   ```
   
   Run the local dev server:
   ```bash
   wrangler pages dev dist --compatibility-date=2024-01-01
   ```
   
   Or if you're using the Vite dev server, set the environment variable:
   ```bash
   export OPENAI_API_KEY=your-openai-api-key-here
   ```

3. **Testing:**
   
   The function will be available at:
   - Local: `http://localhost:8788/api/ai-helper`
   - Production: `https://harada-grid.pages.dev/api/ai-helper`

### API Contract

**Request:**
```json
POST /api/ai-helper
Content-Type: application/json

{
  "goal": "Run a full marathon by November"
}
```

**Response:**
```json
{
  "goal": "Run a full marathon by November, feeling strong and injury-free.",
  "pillars": [
    "Training Base",
    "Strength & Mobility",
    "Nutrition",
    "Recovery",
    "Race Strategy",
    "Mental Preparation",
    "Equipment & Gear",
    "Community & Support"
  ],
  "tasks": [
    ["Task 1", "Task 2", ...], // 8 tasks for pillar 1
    ["Task 1", "Task 2", ...], // 8 tasks for pillar 2
    // ... 6 more pillars
  ],
  "name": "AI-generated map",
  "description": "Generated automatically from your goal"
}
```

### Error Handling

The function returns appropriate HTTP status codes:
- `400`: Missing or invalid goal
- `500`: OpenAI API error, missing API key, or invalid response format

