// Public Supabase settings. The publishable key is meant to be public (row-level security protects the data),
// so defaults live here and the app builds without Vercel env vars. Env vars still override them.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qszjcimvwkjjmdwyrcnp.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_MzEg4ZE63rHk9G-2av2tqg_5bHm3Uba";
