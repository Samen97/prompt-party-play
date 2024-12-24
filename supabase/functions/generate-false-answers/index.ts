import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const prompt = `Generate 3 alternative prompts that are extremely similar to this one: "${basePrompt}". 
    Keep the exact same theme and only change tiny details. For example, if the prompt is "a happy cat in a garden", 
    you might suggest "a joyful cat in a garden", "a happy cat among garden flowers", "a cheerful cat in the garden". 
    The alternatives should be almost identical, just with slight variations.
    Return ONLY an array of 3 strings, no explanation or other text.`

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
      .map(alt => alt.replace(/^\d+\.\s*|["'\[\]]/, '').trim())
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