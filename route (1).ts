import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.ADMIN_SESSION_SECRET) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: "login" | "logout";
    email?: string;
    password?: string;
  };

  if (body.action === "logout") {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, body.email.trim().toLocaleLowerCase("pt-BR")))
    .limit(1);
  if (!user) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  const token = await createSessionToken({ id: user.id, email: user.email, name: user.name });
  await setSessionCookie(token);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
