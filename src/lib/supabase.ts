import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabaseの環境変数が不足しています。.env.local に VITE_SUPABASE_URL と VITE_SUPABASE_PUBLISHABLE_KEY を設定してください。',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
