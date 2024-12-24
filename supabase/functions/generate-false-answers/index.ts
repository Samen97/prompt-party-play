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

    const basePrompt = correctPrompt.replace("A child's drawing of ", "");
    const prompt = `Given this prompt for an image: "${basePrompt}", generate 3 alternative prompts that are very similar but slightly different. 
    Keep the same theme and style, just change small details. For example, if the prompt is "a happy cat in a garden", 
    you might suggest "a cheerful cat playing with flowers", "a smiling cat among garden plants", and "a joyful cat in a flower bed". 
    Make them creative but closely related to the original concept. Return ONLY an array of 3 alternatives, no explanation or other text.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system",
          content: "You are a creative assistant that generates very similar alternative prompts. Your responses should be just the array of 3 alternatives, no explanation or other text."
        },
        { "role": "user", "content": prompt }
      ],
    })

    const textResponse = completion.choices[0]?.message?.content || ""
    const alternatives = textResponse
      .split('\n')
      .map(alt => alt.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .map(alt => `A child's drawing of ${alt}`)

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