import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    console.log('Received prompt:', prompt);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // 1) First, enhance the prompt with GPT-4
    console.log('Enhancing prompt with GPT-4...');
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating prompts for generating children's drawings. 
                     Take the input and enhance it to create a more detailed prompt that will 
                     result in an image that looks like it was drawn by a 5-year-old child. 
                     Add details about using crayons, simple shapes, and bright colors.`
          },
          {
            role: 'user',
            content: `Create a child-like drawing prompt for: ${prompt}`
          }
        ],
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT API error response:', errorText);
      throw new Error(`GPT API error: ${gptResponse.status} ${gptResponse.statusText}`);
    }

    const gptData = await gptResponse.json();
    const enhancedPrompt = gptData.choices[0].message.content;
    console.log('Enhanced prompt:', enhancedPrompt);

    // 2) Generate the image with DALL-E
    console.log('Generating image with DALL-E...');
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `${enhancedPrompt}. Make it look exactly like a child's crayon drawing, with simple shapes and bright colors.`,
        n: 1,
        size: "1024x1024",
        style: "natural"
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('DALL-E API error response:', errorText);
      throw new Error(`DALL-E API error: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageData = await imageResponse.json();
    console.log('Image generation successful');

    if (!imageData.data?.[0]?.url) {
      throw new Error('No image URL returned from the API');
    }

    return new Response(
      JSON.stringify({ imageUrl: imageData.data[0].url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate image',
        details: error.message,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});