import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { prompt }
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
    console.log('Successfully generated image for prompt:', prompt)
    console.log('Image URL:', data.imageUrl)

    return data.imageUrl
  } catch (error) {
    console.error('Failed to generate image:', error)
    toast.error(`Failed to generate image: ${error.message}`)
    throw error
  }
}