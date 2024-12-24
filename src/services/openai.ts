import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const truncatePrompt = (prompt: string): string => {
  // Keep prompt under 1000 characters for DALL-E
  return prompt.length > 950 
    ? prompt.substring(0, 947) + '...' 
    : prompt;
}

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const truncatedPrompt = truncatePrompt(prompt);
    console.log('Original prompt length:', prompt.length);
    console.log('Truncated prompt length:', truncatedPrompt.length);
    
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { prompt: truncatedPrompt }
    })

    if (error) {
      console.error('Image generation error:', error)
      throw new Error(error.message)
    }

    if (!data?.imageUrl) {
      console.error('Invalid response:', data)
      throw new Error('No image URL returned from the API')
    }

    // Log successful generation
    console.log('Successfully generated image for prompt:', truncatedPrompt)
    console.log('Image URL:', data.imageUrl)

    return data.imageUrl
  } catch (error) {
    console.error('Failed to generate image:', error)
    toast.error(`Failed to generate image: ${error.message}`)
    throw error
  }
}
