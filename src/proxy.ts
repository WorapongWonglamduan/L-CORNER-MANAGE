import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { routing } from "../i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const locale = pathname.split("/")[1] || "th";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const isLoginPage = pathWithoutLocale.includes("/login");
  const isApiRoute = pathname.includes("/api");

  if (isApiRoute) {
    return intlMiddleware(request);
  }

  // Without secureCookie, getToken() defaults to looking for the unprefixed
  // cookie name (authjs.session-token) — but src/auth.ts's useSecureCookies
  // (also NODE_ENV-based) makes the actual cookie __Secure-authjs.session-
  // token in production, so this always missed it and redirected to login
  // regardless of whether the user was actually signed in.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const isLoggedIn = !!token;

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
