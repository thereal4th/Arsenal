import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Next.js 16 renamed `middleware` to `proxy` and runs it on the Node.js runtime,
 * so the full Auth.js instance can be used here directly.
 */
export default auth((request) => {
  const { nextUrl } = request;
  const signedIn = Boolean(request.auth?.user);

  const isAuthPage =
    nextUrl.pathname === "/signin" || nextUrl.pathname === "/signup";

  if (isAuthPage && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!signedIn && !isAuthPage) {
    const url = new URL("/signin", nextUrl);
    url.searchParams.set("next", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/notes/:path*",
    "/systems/:path*",
    "/editor/:path*",
    "/settings/:path*",
    "/signin",
    "/signup",
  ],
};
