import { query, hasFuzzySearch } from "@/lib/db";

export type SearchHit = { id: string; name: string; created_at: string };

/**
 * Searches the user's own projects directly in Postgres — full-text
 * ranking always, typo-tolerant trigram matching when pg_trgm is
 * available (checked once per server instance). No separate search
 * index to keep in sync: this queries the live table, so results are
 * always current the moment a project is created or renamed.
 */
export async function searchProjects(
  userId: string,
  q: string
): Promise<SearchHit[]> {
  const trimmed = q.trim();

  if (!trimmed) {
    return query<SearchHit>(
      "SELECT id, name, created_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [userId]
    );
  }

  const fuzzy = await hasFuzzySearch();

  if (fuzzy) {
    return query<SearchHit>(
      `
      SELECT id, name, created_at
      FROM projects
      WHERE user_id = $1
        AND (
          word_similarity($2, name) > 0.3
          OR to_tsvector('english', name) @@ plainto_tsquery('english', $2)
          OR name ILIKE '%' || $2 || '%'
        )
      ORDER BY
        GREATEST(
          word_similarity($2, name),
          ts_rank(to_tsvector('english', name), plainto_tsquery('english', $2))
        ) DESC
      LIMIT 20
      `,
      [userId, trimmed]
    );
  }

  return query<SearchHit>(
    `
    SELECT id, name, created_at
    FROM projects
    WHERE user_id = $1
      AND (
        to_tsvector('english', name) @@ plainto_tsquery('english', $2)
        OR name ILIKE '%' || $2 || '%'
      )
    ORDER BY ts_rank(to_tsvector('english', name), plainto_tsquery('english', $2)) DESC
    LIMIT 20
    `,
    [userId, trimmed]
  );
}
