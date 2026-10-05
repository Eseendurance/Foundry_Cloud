import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db";

export type OrganizationRole = "owner" | "admin" | "member";

export type OrganizationMembership = {
  id: string;
  name: string;
  role: OrganizationRole;
};

export async function ensureUserOrganization(
  userId: string,
  email: string
): Promise<OrganizationMembership> {
  const existing = await query<{
    id: string;
    name: string;
    role: OrganizationRole;
  }>(
    `SELECT o.id, o.name, m.role
     FROM organizations o
     JOIN organization_memberships m ON m.organization_id = o.id
     WHERE m.user_id = $1
     ORDER BY m.created_at ASC
     LIMIT 1`,
    [userId]
  );
  if (existing[0]) return existing[0];

  return withTransaction(async (client) => {
    const deterministicId = createHash("md5")
      .update(`foundry-workspace:${userId}`)
      .digest("hex");
    const orgId = `${deterministicId.slice(0, 8)}-${deterministicId.slice(8, 12)}-${deterministicId.slice(12, 16)}-${deterministicId.slice(16, 20)}-${deterministicId.slice(20)}`;
    const name = `${email.split("@")[0] || "Personal"}'s workspace`;
    await client.query(
      `INSERT INTO organizations (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [orgId, name]
    );
    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role)
       VALUES ($1, $2, 'owner') ON CONFLICT (organization_id, user_id) DO NOTHING`,
      [orgId, userId]
    );
    const rows = await client.query<{
      id: string;
      name: string;
      role: OrganizationRole;
    }>(
      `SELECT o.id, o.name, m.role
       FROM organizations o
       JOIN organization_memberships m ON m.organization_id = o.id
       WHERE m.user_id = $1 AND o.id = $2`,
      [userId, orgId]
    );
    if (!rows.rows[0]) throw new Error("Could not create the user's workspace.");
    return rows.rows[0];
  });
}

export async function listUserOrganizations(
  userId: string
): Promise<OrganizationMembership[]> {
  return query<OrganizationMembership>(
    `SELECT o.id, o.name, m.role
     FROM organizations o
     JOIN organization_memberships m ON m.organization_id = o.id
     WHERE m.user_id = $1
     ORDER BY m.created_at ASC`,
    [userId]
  );
}

export async function createOrganizationInvitation(options: {
  organizationId: string;
  userId: string;
  email: string;
  role: "admin" | "member";
}): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO organization_invitations
       (id, organization_id, email, role, token_hash, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      randomUUID(),
      options.organizationId,
      options.email,
      options.role,
      tokenHash,
      expiresAt,
      options.userId,
    ]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function acceptOrganizationInvitation(
  token: string,
  userId: string,
  email: string
): Promise<OrganizationMembership | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return withTransaction(async (client) => {
    const invitation = await client.query<{
      id: string;
      organization_id: string;
      organization_name: string;
      role: OrganizationRole;
      email: string;
      expires_at: Date;
      accepted_at: Date | null;
    }>(
      `SELECT i.id, i.organization_id, o.name AS organization_name, i.role,
              i.email, i.expires_at, i.accepted_at
       FROM organization_invitations i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.token_hash = $1
       FOR UPDATE OF i`,
      [tokenHash]
    );
    const row = invitation.rows[0];
    if (
      !row ||
      row.accepted_at ||
      row.expires_at.getTime() <= Date.now() ||
      row.email.toLowerCase() !== email.toLowerCase()
    ) {
      return null;
    }
    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, user_id) DO UPDATE
       SET role = CASE
         WHEN organization_memberships.role IN ('owner', 'admin')
           THEN organization_memberships.role
         ELSE EXCLUDED.role
       END`,
      [row.organization_id, userId, row.role]
    );
    const membership = await client.query<{ role: OrganizationRole }>(
      `SELECT role FROM organization_memberships
       WHERE organization_id = $1 AND user_id = $2`,
      [row.organization_id, userId]
    );
    const accepted = await client.query(
      `UPDATE organization_invitations SET accepted_at = now()
       WHERE id = $1 AND accepted_at IS NULL`,
      [row.id]
    );
    if (accepted.rowCount !== 1) return null;
    return {
      id: row.organization_id,
      name: row.organization_name,
      role: membership.rows[0].role,
    };
  });
}

export async function getOrganizationMembers(organizationId: string) {
  return query<{ email: string; role: OrganizationRole; joinedAt: string }>(
    `SELECT u.email, m.role, m.created_at AS "joinedAt"
     FROM organization_memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.organization_id = $1
     ORDER BY m.created_at ASC`,
    [organizationId]
  );
}
