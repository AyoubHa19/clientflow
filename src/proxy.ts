import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// A quick first check before a page renders: no session cookie means not
// signed in, so go to the sign-in page straight away (or, at "/", show the
// landing page). This only looks for
// the cookie; the real check (is the session valid?) happens on the server
// in requireUser(), for every page and action.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  // Visitors to the home page see the landing page (the address stays "/").
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/welcome", request.url));
  }

  const signIn = new URL("/sign-in", request.url);
  const { pathname, search } = request.nextUrl;
  signIn.searchParams.set("next", pathname + search);
  return NextResponse.redirect(signIn);
}

export const config = {
  // Everything except the public pages (sign-in, sign-up, the landing page,
  // clients' status pages), Better Auth's endpoints, Next's own files and
  // static files (anything with a dot, like icon.svg or the sky photos).
  matcher: ["/((?!sign-in|sign-up|welcome|status/|api/auth|_next/|.*\\..*).*)"],
};
