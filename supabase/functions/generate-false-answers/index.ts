import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { correctPrompt } = await req.json()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: "You are an AI that generates plausible but incorrect answers for an image guessing game. Each answer should be related to the correct answer in some way but clearly different. Return exactly 3 alternatives in a JSON array format."
          },
          {
            role: 'user',
            content: `Generate 3 plausible but incorrect alternatives for this image prompt: "${correctPrompt}". Each alternative should start with "A child's drawing of" and be related but different. Return only a JSON array of strings.`
          }
        ],
        response_format: { type: "json_object" }
      }),
    })

    const data = await response.json()
    const alternatives = JSON.parse(data.choices[0].message.content).alternatives

    return new Response(
      JSON.stringify({ alternatives }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating false answers:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})