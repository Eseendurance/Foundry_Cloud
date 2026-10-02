import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exchangeCodeForToken, fetchGithubUser, saveConnection } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("gh_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/ide?github=state_mismatch", req.url));
  }

  try {
    const { access_token } = await exchangeCodeForToken(code);
    const user = await fetchGithubUser(access_token);
    await saveConnection(session.userId, user.login, access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.redirect(
      new URL(`/ide?github=error&detail=${encodeURIComponent(msg)}`, req.url)
    );
  }

  const res = NextResponse.redirect(new URL("/ide?github=connected", req.url));
  res.cookies.delete("gh_oauth_state");
  return res;
}
