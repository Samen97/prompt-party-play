import { supabase } from '@/integrations/supabase/client'

export const generateImage = async (prompt: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: { prompt }
  })

  if (error) {
    console.error('Image generation error:', error)
    throw new Error(error.message)
  }

  if (!data?.imageUrl) {
    throw new Error('No image URL returned from the API')
  }

  return data.imageUrl
}