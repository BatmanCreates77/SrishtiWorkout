// Public Supabase settings. The publishable key is meant to be public (row-level security protects the data),
// so defaults live here and the app builds without Vercel env vars. Env vars still override them.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xqtvxyydsoogqwhfikfb.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_li5KyZT1M4D_TiTJVFE_Ng_Pq_44pGm";
