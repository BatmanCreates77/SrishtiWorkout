// Runs before EVERY request (pages, API routes, JS chunks, data files, photos).
// Nothing of the app is served until the visitor has unlocked the site with the shared password.
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, verifyToken } from "@/lib/gate";

const PUBLIC = new Set(["/unlock", "/robots.txt", "/icon.svg"]);

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();
  if (await verifyToken(req.cookies.get(GATE_COOKIE)?.value)) return NextResponse.next();

  // Locked: pages go to the unlock screen, everything else is refused.
  const wantsPage = req.method === "GET" && (req.headers.get("accept") ?? "").includes("text/html");
  if (wantsPage) {
    const url = new URL("/unlock", req.url);
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return new NextResponse(pathname.startsWith("/api/") ? JSON.stringify({ error: "Locked" }) : "Locked", {
    status: 401,
    headers: { "Content-Type": pathname.startsWith("/api/") ? "application/json" : "text/plain", "Cache-Control": "no-store" },
  });
}
