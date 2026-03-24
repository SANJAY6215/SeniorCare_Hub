/// <reference path="./../deno_types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-1.5-flash"; // Fast and capable for vision tasks

serve(async (req: Request) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    const { image, healthProfile } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "Missing image data" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Prepare prompt based on user health profile
    const prompt = `
      Analyze this food image for a senior user with the following health profile:
      ${JSON.stringify(healthProfile || {})}

      Identify the food, estimate the portion size and total calories.
      Determine if it is safe for the user to eat, specifically checking for high sodium, sugar, or unhealthy fats.
      If the user has high blood pressure, be strict about sodium.

      Return ONLY a JSON object with this structure:
      {
        "foodName": "string",
        "calories": number,
        "nutrients": { "sodium": "string", "sugar": "string", "fats": "string" },
        "safetyStatus": "safe" | "caution" | "unsafe",
        "healthAdvice": "string (concise reasoning)",
        "concludingStatement": "Short sentence summarizing the result"
      }
    `;

    // API Request to Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: image.split(',')[1] || image // Handle base64 with or without prefix
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    console.log("Gemini Response:", JSON.stringify(data, null, 2));

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error("Empty response from AI model");
    }

    // Clean JSON if needed (Gemini sometimes adds markdown blocks)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const resultJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(resultText);

    return new Response(JSON.stringify(resultJson), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
