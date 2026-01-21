import { createClient } from '@supabase/supabase-js'

// Tenta pegar a variável real. Se não existir (no build), usa uma fictícia para não travar.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://url-nao-encontrada.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "chave-nao-encontrada"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)