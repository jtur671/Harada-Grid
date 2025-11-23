/**
 * Cloudflare Pages Function for AI Helper
 * 
 * Generates a Harada Method action map from a user's goal using OpenAI.
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: Your OpenAI API key (set in Cloudflare Secrets)
 * 
 * Request: POST /api/ai-helper
 * Body: { goal: string }
 * 
 * Response: {
 *   goal: string,
 *   pillars: string[],      // 8 items
 *   tasks: string[][],     // 8 x 8 array
 *   name?: string,
 *   description?: string
 * }
 */

interface AiHelperRequest {
  goal: string;
}

interface AiHelperResponse {
  goal: string;
  pillars: string[]; // 8 items
  tasks: string[][]; // 8 x 8
  name?: string;
  description?: string;
}

interface Env {
  OPENAI_API_KEY: string;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  env: Env;
  params: Record<P, string>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Data;
}

export const onRequestPost = async (context: EventContext<Env, any, any>) => {
  try {
    // Get OpenAI API key from environment
    const apiKey = context.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const requestBody = (await context.request.json()) as AiHelperRequest;
    const goal = requestBody.goal?.trim();

    if (!goal) {
      return new Response(
        JSON.stringify({ error: "Goal is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Call OpenAI to generate the plan
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4o if needed
        messages: [
          {
            role: "system",
            content: `You are an expert in the Harada Method, a goal-setting framework that breaks down a main goal into 8 pillars, each with 8 tasks.

Your task is to generate a complete Harada Method action map from a user's goal.

IMPORTANT: Keep the goal simple and concise. Use the user's exact words when possible, or make minimal refinements for clarity. Do NOT expand the goal with additional details, requirements, or explanations. The goal should be 1 sentence maximum.

Return ONLY valid JSON in this exact format:
{
  "goal": "The main goal (keep it simple, 1 sentence, use user's words when possible)",
  "pillars": ["Pillar 1", "Pillar 2", "Pillar 3", "Pillar 4", "Pillar 5", "Pillar 6", "Pillar 7", "Pillar 8"],
  "tasks": [
    ["Task 1 for Pillar 1", "Task 2 for Pillar 1", "Task 3 for Pillar 1", "Task 4 for Pillar 1", "Task 5 for Pillar 1", "Task 6 for Pillar 1", "Task 7 for Pillar 1", "Task 8 for Pillar 1"],
    ["Task 1 for Pillar 2", "Task 2 for Pillar 2", "Task 3 for Pillar 2", "Task 4 for Pillar 2", "Task 5 for Pillar 2", "Task 6 for Pillar 2", "Task 7 for Pillar 2", "Task 8 for Pillar 2"],
    ["Task 1 for Pillar 3", "Task 2 for Pillar 3", "Task 3 for Pillar 3", "Task 4 for Pillar 3", "Task 5 for Pillar 3", "Task 6 for Pillar 3", "Task 7 for Pillar 3", "Task 8 for Pillar 3"],
    ["Task 1 for Pillar 4", "Task 2 for Pillar 4", "Task 3 for Pillar 4", "Task 4 for Pillar 4", "Task 5 for Pillar 4", "Task 6 for Pillar 4", "Task 7 for Pillar 4", "Task 8 for Pillar 4"],
    ["Task 1 for Pillar 5", "Task 2 for Pillar 5", "Task 3 for Pillar 5", "Task 4 for Pillar 5", "Task 5 for Pillar 5", "Task 6 for Pillar 5", "Task 7 for Pillar 5", "Task 8 for Pillar 5"],
    ["Task 1 for Pillar 6", "Task 2 for Pillar 6", "Task 3 for Pillar 6", "Task 4 for Pillar 6", "Task 5 for Pillar 6", "Task 6 for Pillar 6", "Task 7 for Pillar 6", "Task 8 for Pillar 6"],
    ["Task 1 for Pillar 7", "Task 2 for Pillar 7", "Task 3 for Pillar 7", "Task 4 for Pillar 7", "Task 5 for Pillar 7", "Task 6 for Pillar 7", "Task 7 for Pillar 7", "Task 8 for Pillar 7"],
    ["Task 1 for Pillar 8", "Task 2 for Pillar 8", "Task 3 for Pillar 8", "Task 4 for Pillar 8", "Task 5 for Pillar 8", "Task 6 for Pillar 8", "Task 7 for Pillar 8", "Task 8 for Pillar 8"]
  ],
  "name": "AI-generated map",
  "description": "Generated automatically from your goal"
}

Requirements:
- The goal must be SIMPLE and CONCISE (1 sentence maximum). Use the user's exact words when possible. Do NOT add extra details, requirements, or explanations. If the user says "write a movie script", return "Write a movie script" or "Write a movie script by [timeframe]" - NOT "Write a movie script with compelling characters and clear structure."
- You must provide exactly 8 pillars
- Each pillar must have exactly 8 tasks
- Pillars should be distinct, meaningful categories that support the main goal
- Tasks should be specific, actionable steps
- Return ONLY the JSON, no markdown, no code blocks, no explanation`,
          },
          {
            role: "user",
            content: `Generate a Harada Method action map for this goal: ${goal}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate plan from AI" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content received from AI" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the JSON response from OpenAI
    let aiResult: AiHelperResponse;
    try {
      aiResult = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid response format from AI" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate the response structure
    if (!aiResult.goal || !Array.isArray(aiResult.pillars) || !Array.isArray(aiResult.tasks)) {
      return new Response(
        JSON.stringify({ error: "Invalid response structure from AI" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Ensure we have exactly 8 pillars
    if (aiResult.pillars.length !== 8) {
      return new Response(
        JSON.stringify({ error: "AI must return exactly 8 pillars" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Ensure each pillar has exactly 8 tasks
    if (aiResult.tasks.length !== 8 || aiResult.tasks.some((tasks) => tasks.length !== 8)) {
      return new Response(
        JSON.stringify({ error: "Each pillar must have exactly 8 tasks" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return the validated response
    return new Response(JSON.stringify(aiResult), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow CORS for frontend
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("AI helper error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Handle CORS preflight requests
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

