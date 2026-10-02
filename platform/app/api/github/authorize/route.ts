import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { githubConfigured } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  if (!githubConfigured()) {
    return NextResponse.json(
      {
        error:
          "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET aren't set. Create a free OAuth App at github.com/settings/developers — see the README.",
      },
      { status: 500 }
    );
  }

  const state = randomUUID();
  const redirectUri = new URL("/api/github/callback", req.url).toString();

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
