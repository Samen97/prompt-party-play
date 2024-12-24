import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.28.0'

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

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    const prompt = `Given this image prompt: "${correctPrompt}", generate 3 alternative prompts 
that are similar but different in an interesting way. For example, if the prompt is "a cow in space", 
you might suggest "a zebra in a spacesuit", "an elephant floating through the cosmos", and "a giraffe on the moon". 
Make them creative and fun, but related to the original concept. Return only the array of 3 alternatives, nothing else.`

    const completion = await openai.chat.completions.create({
      // Keep your specialized model
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system",
          content: "You are a creative assistant that generates alternative prompts for an image generation game. Your responses should be just the array of 3 alternatives, no explanation or other text."
        },
        { "role": "user", "content": prompt }
      ],
    })

    // The text the model returns
    const textResponse = completion.choices[0]?.message?.content || ""
    // Attempt a simple line-split approach to parse out 3 lines
    const alternatives = textResponse
      .split('\n')
      .map(alt => alt.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)

    console.log('Generated alternatives:', alternatives)

    return new Response(
      JSON.stringify({ alternatives }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
