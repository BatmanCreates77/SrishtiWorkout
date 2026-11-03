"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabase() {
  client ??= createBrowserClient(
    SUPABASE_URL,
    SUPABASE_KEY,
  );
  return client;
}
