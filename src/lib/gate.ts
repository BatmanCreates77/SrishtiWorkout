// Site-wide password gate (shared by src/proxy.ts and /unlock).
// The password lives only in the SITE_PASSWORD env var. Sessions are signed with an HMAC key derived from it
// (plus optional SITE_SESSION_SECRET), so changing the password signs everyone out.
export const GATE_COOKIE = "sw_gate";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function gateConfigured() {
  return (process.env.SITE_PASSWORD ?? "").length >= 8;
}

async function key() {
  const material = await crypto.subtle.digest("SHA-256", enc.encode(`${process.env.SITE_PASSWORD ?? ""}|${process.env.SITE_SESSION_SECRET ?? ""}|srishti-gate-v1`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function makeToken(now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_DAYS * 86400;
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(`gate|${exp}`));
  return `${exp}.${b64url(sig)}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token || !gateConfigured()) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000 || !sig) return false;
  const expected = b64url(await crypto.subtle.sign("HMAC", await key(), enc.encode(`gate|${exp}`)));
  return timingSafeEqual(sig, expected);
}

/** Constant-time comparison of two strings via their SHA-256 digests. */
export async function passwordMatches(input: string): Promise<boolean> {
  if (!gateConfigured()) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input)),
    crypto.subtle.digest("SHA-256", enc.encode(process.env.SITE_PASSWORD!)),
  ]);
  return timingSafeEqual(b64url(a), b64url(b));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Only same-site relative paths are allowed as the post-unlock destination. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") && !next.startsWith("/unlock") ? next : "/home";
}
