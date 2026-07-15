import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_LOGIN_PATH,
  ADMIN_PROTECTED_PREFIX,
} from "@/lib/admin/constants";
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_PATHS,
  PROTECTED_PATHS,
} from "@/lib/auth/constants";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const adminToken = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  const isAdminRoute =
    pathname === ADMIN_PROTECTED_PREFIX || pathname.startsWith(`${ADMIN_PROTECTED_PREFIX}/`);
  const isAdminLogin = pathname === ADMIN_LOGIN_PATH;
  const isAdminProtected = isAdminRoute && !isAdminLogin;

  if (isAdminProtected && !adminToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN_PATH;
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminLogin && adminToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuthPage = AUTH_PATHS.includes(pathname);

  if (isProtected && !token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/login",
    "/register",
    "/register/:path*",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/admin/:path*",
  ],
};
