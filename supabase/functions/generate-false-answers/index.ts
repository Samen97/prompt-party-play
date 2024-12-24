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
    console.log('Received correct prompt:', correctPrompt)

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    const basePrompt = correctPrompt.replace("A child's drawing of ", "")
    const prompt = `Generate 3 alternative prompts that are extremely similar to this one: "${basePrompt}". 
    Keep the exact same theme and only change tiny details. For example, if the prompt is "a happy cat in a garden", 
    you might suggest "a joyful cat in a garden", "a happy cat among garden flowers", "a cheerful cat in the garden". 
    The alternatives should be almost identical, just with slight variations.
    Return ONLY an array of 3 strings, no explanation or other text.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a creative assistant that generates very similar alternative prompts. Your responses should be just the array of 3 alternatives, no explanation or other text."
        },
        { role: "user", content: prompt }
      ],
    })

    const textResponse = completion.choices[0]?.message?.content || ""
    console.log('Raw GPT response:', textResponse)

    // Clean up the response to ensure we get a proper array
    let alternatives: string[] = []
    try {
      // First try to parse it as JSON if it's already in array format
      alternatives = JSON.parse(textResponse)
    } catch {
      // If that fails, clean up the text and split it
      alternatives = textResponse
        .replace(/[\[\]'"`]/g, '') // Remove brackets and quotes
        .split(',')
        .map(alt => alt.trim())
        .filter(alt => alt.length > 0)
        .map(alt => `A child's drawing of ${alt}`)
    }

    console.log('Processed alternatives:', alternatives)

    // Ensure we have exactly 3 alternatives
    if (alternatives.length !== 3) {
      throw new Error('Failed to generate exactly 3 alternatives')
    }

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