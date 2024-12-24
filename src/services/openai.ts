import { supabase } from '@/integrations/supabase/client'

export const generateImage = async (prompt: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: { prompt }
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.imageUrl
}