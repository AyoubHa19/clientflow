import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// A quick first check before a page renders: no session cookie means not
// signed in, so go to the sign-in page straight away. This only looks for
// the cookie; the real check (is the session valid?) happens on the server
// in requireUser(), for every page and action.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") signIn.searchParams.set("next", pathname + search);
  return NextResponse.redirect(signIn);
}

export const config = {
  // Everything except the public pages, Better Auth's endpoints, Next's own
  // files and static files (anything with a dot, like icon.svg).
  matcher: ["/((?!sign-in|sign-up|api/auth|_next/|.*\\..*).*)"],
};
