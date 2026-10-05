import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "lagoshoje_admin_session";
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

function getSecretKey(): Uint8Array {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) {
    throw new Error("ADMIN_SESSION_SECRET deve estar configurada para acesso administrativo.");
  }
  return new TextEncoder().encode(value);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export type AdminSession = {
  id: string;
  email: string;
  name: string;
};

export async function createSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_IN_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, getSecretKey(), { maxTokenAge: "7d" });
    const payload = verified.payload;
    if (!payload?.id || !payload.email || !payload.name) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}
