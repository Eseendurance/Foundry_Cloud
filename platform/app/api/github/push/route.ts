import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConnection, createRepo, pushFiles } from "@/lib/github";
import { rateLimited, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (rateLimited(`github-push:${clientKey(req)}`, 10, 5 * 60_000)) {
    return NextResponse.json(
      { error: "Too many pushes in a short window. Wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const conn = await getConnection(session.userId);
  if (!conn) {
    return NextResponse.json({ error: "Connect your GitHub account first." }, { status: 400 });
  }

  let body: {
    files?: Record<string, string>;
    message?: string;
    existingRepo?: string; // "owner/name"
    branch?: string;
    newRepoName?: string;
    newRepoPrivate?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send this as JSON." }, { status: 400 });
  }

  const files = body.files || {};
  if (Object.keys(files).length === 0) {
    return NextResponse.json({ error: "No files to push." }, { status: 400 });
  }
  const message = (body.message || "Update from Groundwork").trim().slice(0, 200);

  try {
    let owner: string;
    let repo: string;
    let branch: string;

    if (body.existingRepo) {
      [owner, repo] = body.existingRepo.split("/");
      if (!owner || !repo) {
        return NextResponse.json({ error: "Invalid repo — expected owner/name." }, { status: 400 });
      }
      branch = body.branch || "main";
    } else if (body.newRepoName) {
      const name = body.newRepoName.trim().slice(0, 100);
      if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
        return NextResponse.json(
          { error: "Repo names can only contain letters, numbers, dots, dashes, underscores." },
          { status: 400 }
        );
      }
      const created = await createRepo(conn.token, name, Boolean(body.newRepoPrivate));
      [owner, repo] = created.full_name.split("/");
      branch = created.default_branch;
    } else {
      return NextResponse.json(
        { error: "Specify either existingRepo or newRepoName." },
        { status: 400 }
      );
    }

    const result = await pushFiles(conn.token, owner, repo, branch, files, message);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Push failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
