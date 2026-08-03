import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

const PUBLIC_API = ["/api/auth/login", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("udyking_session")?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sales/:path*",
    "/inventory/:path*",
    "/reports/:path*",
    "/pumps/:path*",
    "/users/:path*",
    "/api/:path*",
  ],
};
