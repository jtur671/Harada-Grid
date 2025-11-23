/**
 * Cloudflare Pages Function for Pillar Refinement
 * 
 * Generates 5 alternative pillar suggestions based on the main goal and current pillar.
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: Your OpenAI API key (set in Cloudflare Secrets)
 * 
 * Request: POST /api/pillar-refine
 * Body: { goal: string, currentPillar: string }
 * 
 * Response: {
 *   suggestions: string[]  // 5 pillar suggestions
 * }
 */

interface PillarRefineRequest {
  goal: string;
  currentPillar: string;
}

interface PillarRefineResponse {
  suggestions: string[]; // 5 items
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
    const requestBody = (await context.request.json()) as PillarRefineRequest;
    const goal = requestBody.goal?.trim();
    const currentPillar = requestBody.currentPillar?.trim();

    if (!goal) {
      return new Response(
        JSON.stringify({ error: "Goal is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Call OpenAI to generate pillar suggestions
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert in the Harada Method, a goal-setting framework that breaks down a main goal into 8 pillars.

Your task is to generate 5 alternative pillar suggestions for a given main goal. Each pillar should be:
- A distinct, meaningful category that supports the main goal
- Concise (2-4 words typically)
- Actionable and specific
- Different from the current pillar (if provided)

Return ONLY valid JSON in this exact format:
{
  "suggestions": ["Pillar suggestion 1", "Pillar suggestion 2", "Pillar suggestion 3", "Pillar suggestion 4", "Pillar suggestion 5"]
}

Requirements:
- You must provide exactly 5 suggestions
- Each suggestion should be a concise pillar name (2-4 words)
- Suggestions should be diverse and cover different aspects of achieving the goal
- If a current pillar is provided, make sure the suggestions are different from it
- Return ONLY the JSON, no markdown, no code blocks, no explanation`,
          },
          {
            role: "user",
            content: `Main goal: ${goal}${currentPillar ? `\nCurrent pillar: ${currentPillar}` : ""}\n\nGenerate 5 alternative pillar suggestions for this goal.`,
          },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate pillar suggestions" }),
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
    let aiResult: PillarRefineResponse;
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
    if (!Array.isArray(aiResult.suggestions)) {
      return new Response(
        JSON.stringify({ error: "Invalid response structure from AI" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Ensure we have exactly 5 suggestions
    if (aiResult.suggestions.length !== 5) {
      return new Response(
        JSON.stringify({ error: "AI must return exactly 5 suggestions" }),
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Pillar refine error:", error);
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

