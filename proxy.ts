import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, generateNonce } from "./lib/security/csp";
import { getSupabaseConfig } from "./lib/supabase/config";
import { hardenCookieOptions } from "./lib/supabase/cookie-options";

// Everything not listed here requires a valid session (default deny).
const PUBLIC_PATHS = ["/login", "/registro"];
const PUBLIC_PREFIXES = ["/auth/"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Headers forwarded to the page render (Next.js reads the nonce from them).
  // Rebuilt each time so they include any cookie the session refresh just set.
  const forwardedHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return headers;
  };

  let response = NextResponse.next({
    request: { headers: forwardedHeaders() },
  });

  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({
          request: { headers: forwardedHeaders() },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, hardenCookieOptions(options)),
        );
        // Cache headers stop a CDN from caching a response that carries Set-Cookie.
        Object.entries(cacheHeaders).forEach(([header, value]) =>
          response.headers.set(header, value),
        );
      },
    },
  });

  // Verifies the token and refreshes the session if it is about to expire.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  let target: string | null = null;
  if (!isAuthenticated && !isPublic(pathname)) {
    target = "/login";
  } else if (
    isAuthenticated &&
    (pathname === "/login" || pathname === "/registro" || pathname === "/")
  ) {
    target = "/inicio";
  }

  if (target) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = target;
    redirectUrl.search = "";
    const redirect = NextResponse.redirect(redirectUrl, 303);

    // Carry over any refreshed session cookies and cache headers.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    response = redirect;
  }

  if (!response.headers.has("cache-control")) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Everything except Next.js static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
