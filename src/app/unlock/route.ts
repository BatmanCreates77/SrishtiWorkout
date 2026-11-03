// The only page reachable without the site password: a plain HTML form (no app code, no JS).
// GET  /unlock          → form            GET /unlock?lock=1 → sign this device out
// POST /unlock          → check password, set the signed session cookie, redirect into the app
import { NextResponse } from "next/server";
import { GATE_COOKIE, gateConfigured, makeToken, passwordMatches, safeNext, SESSION_DAYS } from "@/lib/gate";

export const dynamic = "force-dynamic";

// Best-effort brute-force brake per server instance: slow every failure, lock an IP after repeated failures.
const fails = new Map<string, { n: number; until: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

function ipOf(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(opts: { next: string; error?: string; status?: number }) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>Srishti Workout · Locked</title>
<style>
:root{--bg:#faf7f4;--surface:#fff;--ink:#1d1a17;--muted:#6f665e;--line:#e7dfd7;--accent:#c8435a;--accent-ink:#fff;--warn:#b26a00;--warn-soft:#fdf0dc;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#14110f;--surface:#1d1916;--ink:#f2ece6;--muted:#a99d92;--line:#352e28;--accent:#ec6a80;--accent-ink:#1a0b0e;--warn:#f0b155;--warn-soft:#3a2b14;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px max(16px,env(safe-area-inset-left)) 24px max(16px,env(safe-area-inset-right))}
main{width:100%;max-width:360px}.logo{width:56px;height:56px;border-radius:16px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:900;font-size:24px;margin-bottom:16px}
h1{font-size:24px;margin:0 0 4px}p{margin:0 0 20px;color:var(--muted)}label{display:block;font-weight:600;font-size:14px;margin-bottom:6px}
input{width:100%;font-size:17px;padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:var(--surface);color:var(--ink);outline:none}input:focus{border-color:var(--accent)}
button{margin-top:14px;width:100%;min-height:52px;border:0;border-radius:14px;background:var(--accent);color:var(--accent-ink);font-size:16px;font-weight:700;cursor:pointer}
.err{background:var(--warn-soft);color:var(--warn);padding:10px 14px;border-radius:12px;font-size:14px;margin-bottom:16px}
</style></head><body><main>
<div class="logo">S</div><h1>Srishti Workout</h1><p>This app is private. Enter the password to continue.</p>
${opts.error ? `<div class="err" role="alert">${esc(opts.error)}</div>` : ""}
<form method="post" action="/unlock" autocomplete="on">
<input type="hidden" name="next" value="${esc(opts.next)}">
<input type="text" name="username" value="srishti-workout" autocomplete="username" hidden>
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Unlock</button>
</form></main></body></html>`;
  return new NextResponse(html, {
    status: opts.status ?? 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has("lock")) {
    const res = NextResponse.redirect(new URL("/unlock", req.url), 303);
    res.cookies.set(GATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  if (!gateConfigured()) return page({ next: "/home", error: "The site password hasn't been set up yet (SITE_PASSWORD in Vercel). The app stays locked until it is.", status: 503 });
  return page({ next: safeNext(url.searchParams.get("next")) });
}

export async function POST(req: Request) {
  // Same-origin form posts only.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return new NextResponse("Forbidden", { status: 403 });

  const form = await req.formData().catch(() => null);
  const next = safeNext(String(form?.get("next") ?? ""));
  if (!gateConfigured()) return page({ next, error: "The site password hasn't been set up yet.", status: 503 });

  const ip = ipOf(req);
  const now = Date.now();
  const rec = fails.get(ip);
  if (rec && rec.until > now) {
    return page({ next, error: `Too many attempts. Try again in ${Math.ceil((rec.until - now) / 60000)} minutes.`, status: 429 });
  }

  const password = String(form?.get("password") ?? "").slice(0, 200);
  if (password && (await passwordMatches(password))) {
    fails.delete(ip);
    const res = NextResponse.redirect(new URL(next, req.url), 303);
    res.cookies.set(GATE_COOKIE, await makeToken(now), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400,
    });
    return res;
  }

  // Failure: slow down, count, and lock this IP for 15 minutes after 5 failures.
  const r = rec && now - rec.first < WINDOW_MS ? rec : { n: 0, until: 0, first: now };
  r.n += 1;
  if (r.n >= MAX_FAILS) { r.until = now + WINDOW_MS; r.n = 0; r.first = now; }
  fails.set(ip, r);
  await new Promise((res) => setTimeout(res, 800 + Math.random() * 400));
  return page({ next, error: "That password isn't right.", status: 401 });
}
