import "server-only";
// After the site password is accepted, the server signs into the app's single private Supabase account
// (credentials only in env: APP_USER_EMAIL / APP_USER_PASSWORD) and hands the session to the browser as cookies.
import { createServerClient } from "@supabase/ssr";
import type { NextResponse } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/config";

export async function attachAppSession(req: Request, res: NextResponse): Promise<boolean> {
  const email = process.env.APP_USER_EMAIL, password = process.env.APP_USER_PASSWORD;
  if (!email || !password) return false;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const existing = cookieHeader.split(/;\s*/).filter(Boolean).map((c) => {
    const i = c.indexOf("=");
    return { name: c.slice(0, i), value: decodeURIComponent(c.slice(i + 1)) };
  });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => existing,
      setAll: (list) => { for (const { name, value, options } of list) res.cookies.set(name, value, options); },
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return !error;
}

/** Remove Supabase auth cookies (used when locking a device). */
export function clearAppSession(req: Request, res: NextResponse) {
  for (const c of (req.headers.get("cookie") ?? "").split(/;\s*/)) {
    const name = c.split("=")[0];
    if (name.startsWith("sb-")) res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}
