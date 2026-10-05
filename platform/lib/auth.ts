import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { OrganizationRole } from "@/lib/organizations";
import { query } from "@/lib/db";

const SESSION_COOKIE = "gw_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function authConfigured(): boolean {
  return Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);
}

export async function hashPassword(password: string): Promise<string> {
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must be at most 72 UTF-8 bytes.");
  }
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (Buffer.byteLength(password, "utf8") > 72) return false;
  return bcrypt.compare(password, hash);
}

export async function createSession(
  userId: string,
  email: string,
  organizationId: string,
  role: OrganizationRole
): Promise<void> {
  const token = await new SignJWT({ email, organizationId, role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type Session = {
  userId: string;
  email: string;
  organizationId: string;
  role: OrganizationRole;
};

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let userId: string;
  let email: string;
  let organizationId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.organizationId !== "string"
    ) {
      return null;
    }
    userId = payload.sub;
    email = payload.email;
    organizationId = payload.organizationId;
  } catch {
    return null;
  }

  const memberships = await query<{ role: OrganizationRole }>(
    `SELECT role FROM organization_memberships
     WHERE organization_id = $1 AND user_id = $2`,
    [organizationId, userId]
  );
  const role = memberships[0]?.role;
  if (role !== "owner" && role !== "admin" && role !== "member") return null;
  return { userId, email, organizationId, role };
}
