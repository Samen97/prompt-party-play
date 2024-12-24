import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const generateImage = async (prompt: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: { prompt }
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.imageUrl
}