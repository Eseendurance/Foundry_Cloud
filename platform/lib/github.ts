import { query } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const API_VERSION = "2022-11-28";

export function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
  };
}

async function gh(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers(token), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

// --- OAuth ---

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description || "GitHub didn't return an access token.");
  }
  return data;
}

export async function fetchGithubUser(token: string): Promise<{ login: string }> {
  return gh(token, "/user");
}

// --- Storage ---

export async function saveConnection(userId: string, login: string, accessToken: string) {
  await query(
    `INSERT INTO github_connections (user_id, github_login, access_token_enc)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET github_login = $2, access_token_enc = $3, connected_at = now()`,
    [userId, login, encryptSecret(accessToken)]
  );
}

export async function getConnection(
  userId: string
): Promise<{ login: string; token: string } | null> {
  const rows = await query<{ github_login: string; access_token_enc: string }>(
    "SELECT github_login, access_token_enc FROM github_connections WHERE user_id = $1",
    [userId]
  );
  if (rows.length === 0) return null;
  return { login: rows[0].github_login, token: decryptSecret(rows[0].access_token_enc) };
}

export async function removeConnection(userId: string) {
  await query("DELETE FROM github_connections WHERE user_id = $1", [userId]);
}

// --- Repos ---

export type RepoSummary = { full_name: string; private: boolean; default_branch: string };

export async function listRepos(token: string): Promise<RepoSummary[]> {
  const repos = await gh(token, "/user/repos?per_page=100&sort=updated");
  return (repos as RepoSummary[]).map((r) => ({
    full_name: r.full_name,
    private: r.private,
    default_branch: r.default_branch,
  }));
}

export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean
): Promise<RepoSummary> {
  const repo = await gh(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({ name, private: isPrivate, auto_init: true }),
  });
  return { full_name: repo.full_name, private: repo.private, default_branch: repo.default_branch };
}

// --- Real multi-file commit via the Git Data API ---

export async function pushFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: Record<string, string>,
  message: string
): Promise<{ commitUrl: string; repoUrl: string }> {
  const ref = await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`);
  const parentCommitSha = ref.object.sha;

  const parentCommit = await gh(token, `/repos/${owner}/${repo}/git/commits/${parentCommitSha}`);
  const baseTreeSha = parentCommit.tree.sha;

  const blobs = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const blob = await gh(token, `/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content, encoding: "utf-8" }),
      });
      return { path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
    })
  );

  const tree = await gh(token, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
  });

  const commit = await gh(token, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentCommitSha] }),
  });

  await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  return {
    commitUrl: `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
    repoUrl: `https://github.com/${owner}/${repo}`,
  };
}
